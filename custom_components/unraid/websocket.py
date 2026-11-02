"""WebSocket subscription manager for real-time Unraid data updates."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from unraid_api.exceptions import (
    UnraidAPIError,
    UnraidAuthenticationError,
    UnraidConnectionError,
    UnraidTimeoutError,
)
from unraid_api.models import DockerContainerStats

from .const import (
    WS_INITIAL_RETRY_DELAY,
    WS_MAX_RETRY_DELAY,
    WS_REFRESH_DEBOUNCE_SECONDS,
    WS_RETRY_BACKOFF_FACTOR,
    WS_STATS_STALL_SECONDS,
)

if TYPE_CHECKING:
    from unraid_api import UnraidClient

    from .coordinator import UnraidStorageCoordinator, UnraidSystemCoordinator

_LOGGER = logging.getLogger(__name__)

# The container stats subscription streams raw `docker stats` terminal output;
# the first row of each sample cycle carries ANSI control sequences (clear
# screen + cursor home) glued onto the container ID, so that container's stats
# would otherwise be stored under a corrupted key and never match coordinator
# data (always the same container, since the output order is stable).
_ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


@dataclass
class ContainerStatsSnapshot:
    """Snapshot of real-time container stats from WebSocket subscription."""

    stats: dict[str, DockerContainerStats] = field(default_factory=dict)


class UnraidWebSocketManager:
    """
    Manage WebSocket subscriptions for real-time data updates.

    Runs background tasks for each subscription type, pushing updates
    to the relevant coordinators. Automatically reconnects with
    exponential backoff on disconnects.
    """

    def __init__(
        self,
        api_client: UnraidClient,
        system_coordinator: UnraidSystemCoordinator,
        server_name: str,
        storage_coordinator: UnraidStorageCoordinator | None = None,
    ) -> None:
        """Initialize the WebSocket manager."""
        self._api_client = api_client
        self._system_coordinator = system_coordinator
        self._storage_coordinator = storage_coordinator
        self._server_name = server_name
        self._tasks: list[asyncio.Task[None]] = []
        self._running = False
        self.container_stats: ContainerStatsSnapshot = ContainerStatsSnapshot()
        # Debounce timestamps for WebSocket-triggered coordinator refreshes
        # (leading-edge: first event refreshes immediately, subsequent events
        # within the cooldown window are suppressed)
        self._last_ups_refresh: float = 0.0
        self._last_notification_refresh: float = 0.0
        # Last array state seen via the array_updates subscription. Used to
        # refresh storage data only on actual state transitions (see
        # _handle_array_updates for why this matters for spun-down disks).
        self._last_array_state: str | None = None
        # When the statistics stream was last known to be fine, or not expected
        self._stats_quiet_since: float = time.monotonic()
        # A confirmed stall lasts until statistics return or nothing is running
        self._stats_stalled = False
        self._stats_consumers_enabled = True

    async def async_start(self) -> None:
        """Start all WebSocket subscriptions as background tasks."""
        if self._running:
            return
        self._running = True
        self._stats_quiet_since = time.monotonic()
        self._stats_stalled = False
        self._stats_consumers_enabled = True
        _LOGGER.info("Starting WebSocket subscriptions for %s", self._server_name)

        self._tasks = [
            asyncio.create_task(
                self._run_subscription("container_stats", self._handle_container_stats),
                name=f"unraid_ws_container_stats_{self._server_name}",
            ),
            asyncio.create_task(
                self._run_subscription("ups_updates", self._handle_ups_updates),
                name=f"unraid_ws_ups_updates_{self._server_name}",
            ),
            asyncio.create_task(
                self._run_subscription(
                    "notification_added",
                    self._handle_notification_added,
                ),
                name=f"unraid_ws_notification_added_{self._server_name}",
            ),
            asyncio.create_task(
                self._run_subscription("array_updates", self._handle_array_updates),
                name=f"unraid_ws_array_updates_{self._server_name}",
            ),
        ]

    async def async_stop(self) -> None:
        """Stop all WebSocket subscriptions and cancel background tasks."""
        if not self._running:
            return
        self._running = False
        _LOGGER.info("Stopping WebSocket subscriptions for %s", self._server_name)

        for task in self._tasks:
            task.cancel()

        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        self.container_stats = ContainerStatsSnapshot()

    async def _run_subscription(
        self,
        name: str,
        handler: Any,
    ) -> None:
        """Run a subscription with automatic reconnection and backoff."""
        retry_delay = WS_INITIAL_RETRY_DELAY

        while self._running:
            try:
                _LOGGER.debug(
                    "Connecting %s WebSocket subscription for %s",
                    name,
                    self._server_name,
                )
                await handler()
                # If handler returns normally (generator exhausted), reconnect
                retry_delay = WS_INITIAL_RETRY_DELAY

            except UnraidAuthenticationError:
                _LOGGER.error(
                    "WebSocket auth failed for %s (%s)",
                    name,
                    self._server_name,
                )
                return

            except (UnraidConnectionError, UnraidTimeoutError, UnraidAPIError) as err:
                if not self._running:
                    return
                _LOGGER.debug(
                    "WebSocket %s disconnected for %s: %s — retrying in %ss",
                    name,
                    self._server_name,
                    err,
                    retry_delay,
                )

            except asyncio.CancelledError:
                return

            except Exception:
                if not self._running:
                    return
                _LOGGER.exception(
                    "Unexpected error in %s WebSocket for %s",
                    name,
                    self._server_name,
                )

            if not self._running:
                return

            # Wait before reconnecting (with backoff)
            try:
                await asyncio.sleep(retry_delay)
            except asyncio.CancelledError:
                return
            retry_delay = min(retry_delay * WS_RETRY_BACKOFF_FACTOR, WS_MAX_RETRY_DELAY)

    def docker_stats_stalled(self, *, consumers_enabled: bool = True) -> bool | None:
        """
        Return whether running containers have sent no statistics for too long.

        Returns None when the server gives no evidence either way: it is
        unreachable, or its Docker inventory failed to refresh. The quiet period
        only counts while the stream should be publishing, so neither those
        times nor a server with nothing running can report a stall.

        With no enabled statistics consumers, clear any stall and reset the
        baseline. The first enabled evaluation starts a fresh observation
        period, so time spent disabled never counts towards a new stall.
        """
        now = time.monotonic()
        if not consumers_enabled:
            self._stats_consumers_enabled = False
            self._stats_quiet_since = now
            self._stats_stalled = False
            return False
        if not self._stats_consumers_enabled:
            self._stats_quiet_since = now
            self._stats_consumers_enabled = True
        coordinator = self._system_coordinator
        data = coordinator.data
        if (
            not self._running
            or not coordinator.last_update_success
            or data is None
            or not coordinator.optional_query_status["containers"]
        ):
            self._stats_quiet_since = now
            return None
        if not any(container.is_running for container in data.containers):
            self._stats_quiet_since = now
            self._stats_stalled = False
            return False
        if now - self._stats_quiet_since >= WS_STATS_STALL_SECONDS:
            self._stats_stalled = True
        return self._stats_stalled

    def _should_trigger_refresh(self, last_refresh_time: float) -> bool:
        """Return True if enough time has elapsed since the last refresh."""
        return time.monotonic() - last_refresh_time >= WS_REFRESH_DEBOUNCE_SECONDS

    async def _handle_container_stats(self) -> None:
        """Process container stats subscription and update coordinator."""
        async for stats in self._api_client.subscribe_container_stats():
            if not self._running:
                break
            self._stats_quiet_since = time.monotonic()
            self._stats_stalled = False
            if stats.id is None:
                continue
            container_id = _ANSI_ESCAPE_RE.sub("", stats.id)
            self.container_stats.stats[container_id] = stats

    async def _handle_ups_updates(self) -> None:
        """Process UPS state subscription and trigger system refresh."""
        async for update in self._api_client.subscribe_ups_updates():
            if not self._running:
                break
            _LOGGER.debug(
                "UPS update received for %s: %s",
                self._server_name,
                update,
            )
            if self._should_trigger_refresh(self._last_ups_refresh):
                self._last_ups_refresh = time.monotonic()
                await self._system_coordinator.async_request_refresh()
            else:
                _LOGGER.debug(
                    "UPS update for %s suppressed (debounce cooldown active)",
                    self._server_name,
                )

    async def _handle_notification_added(self) -> None:
        """Process notification subscription and trigger system refresh."""
        async for notification in self._api_client.subscribe_notification_added():
            if not self._running:
                break
            _LOGGER.debug(
                "Notification received for %s: %s — %s",
                self._server_name,
                notification.importance,
                notification.title,
            )
            if self._should_trigger_refresh(self._last_notification_refresh):
                self._last_notification_refresh = time.monotonic()
                await self._system_coordinator.async_request_refresh()
            else:
                _LOGGER.debug(
                    "Notification refresh for %s suppressed (debounce cooldown active)",
                    self._server_name,
                )

    async def _handle_array_updates(self) -> None:
        """
        Process array state subscription and trigger storage refresh.

        This subscription was removed in v2026.4.1 because it triggered
        storage refreshes every ~30 seconds, waking spun-down disks and
        loading the CPU (#211, #206). It is re-introduced for #247 with
        stricter guards:

        - The server emits periodic heartbeat events with ``state=None``
          (observed every ~30 s on API v4.35 with a stable array). These
          carry no state change and are ignored entirely.
        - A refresh is requested only when the reported state differs from
          the previously seen state (an actual array start/stop), so a
          stable array never causes WebSocket-driven storage polling. At
          that moment disks are active anyway, so no unexpected wake-ups.
        - Rapid transitions (e.g. stopping → stopped) are coalesced by the
          storage coordinator's built-in request_refresh debouncer, which
          never drops the trailing event — the final state always lands.
        """
        async for update in self._api_client.subscribe_array_updates():
            if not self._running:
                break
            if self._storage_coordinator is None:
                continue
            # Heartbeat event — no state change, refreshing would spin up disks.
            if update.state is None:
                continue
            if update.state == self._last_array_state:
                continue
            previous_state = self._last_array_state
            self._last_array_state = update.state
            _LOGGER.debug(
                "Array state changed for %s: %s -> %s — refreshing storage data",
                self._server_name,
                previous_state,
                update.state,
            )
            await self._storage_coordinator.async_request_refresh()
