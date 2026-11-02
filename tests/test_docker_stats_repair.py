"""A repair issue reports stopped Docker statistics."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant.common import MockConfigEntry

from custom_components.unraid import _async_update_docker_stats_issue
from custom_components.unraid.const import (
    DOMAIN,
    REPAIR_DOCKER_STATS_STALLED,
    WS_STATS_STALL_SECONDS,
    docker_stats_stalled_issue_id,
)
from custom_components.unraid.websocket import UnraidWebSocketManager

_MONOTONIC = "custom_components.unraid.websocket.time.monotonic"


def _manager(
    states: tuple[bool, ...], *, last_update_success: bool = True
) -> UnraidWebSocketManager:
    """Create a running manager whose containers have these running states."""
    coordinator = MagicMock()
    coordinator.last_update_success = last_update_success
    coordinator.optional_query_status = {"containers": True}
    coordinator.data.containers = [MagicMock(is_running=s) for s in states]
    manager = UnraidWebSocketManager(
        api_client=MagicMock(),
        system_coordinator=coordinator,
        server_name="tower",
    )
    manager._running = True
    return manager


def _stalled_after(manager: UnraidWebSocketManager, seconds: float) -> bool:
    with patch(_MONOTONIC, return_value=manager._stats_quiet_since + seconds):
        return manager.docker_stats_stalled()


def test_stalled_only_after_the_full_quiet_period() -> None:
    """Running containers with a silent stream stall at the threshold."""
    manager = _manager((True,))
    assert _stalled_after(manager, WS_STATS_STALL_SECONDS - 1) is False
    assert _stalled_after(manager, WS_STATS_STALL_SECONDS) is True


@pytest.mark.parametrize("states", [(False,), ()])
def test_not_stalled_with_nothing_running(states: tuple[bool, ...]) -> None:
    """A server with no running containers has no statistics to send."""
    assert _stalled_after(_manager(states), WS_STATS_STALL_SECONDS * 2) is False


@pytest.mark.parametrize("cause", ["outage", "inventory", "stopped"])
def test_no_evidence_is_neither_stalled_nor_healthy(cause: str) -> None:
    """An outage, a failed inventory or a stopped manager prove nothing."""
    manager = _manager((True,), last_update_success=cause != "outage")
    manager._system_coordinator.optional_query_status = {
        "containers": cause != "inventory"
    }
    manager._running = cause != "stopped"
    assert _stalled_after(manager, WS_STATS_STALL_SECONDS * 2) is None


def test_quiet_period_restarts_when_stats_become_expected() -> None:
    """Time spent with nothing running does not count towards a stall."""
    manager = _manager((False,))
    start = manager._stats_quiet_since
    with patch(_MONOTONIC, return_value=start + WS_STATS_STALL_SECONDS):
        assert manager.docker_stats_stalled() is False
    manager._system_coordinator.data.containers[0].is_running = True
    with patch(_MONOTONIC, return_value=start + WS_STATS_STALL_SECONDS + 1):
        assert manager.docker_stats_stalled() is False


def test_confirmed_stall_survives_an_outage() -> None:
    """An outage does not clear a stall, but statistics or idle containers do."""
    manager = _manager((True,))
    start = manager._stats_quiet_since
    with patch(_MONOTONIC, return_value=start + WS_STATS_STALL_SECONDS):
        assert manager.docker_stats_stalled() is True
    coordinator = manager._system_coordinator
    coordinator.last_update_success = False
    with patch(_MONOTONIC, return_value=start + WS_STATS_STALL_SECONDS + 60):
        assert manager.docker_stats_stalled() is None
    coordinator.last_update_success = True
    with patch(_MONOTONIC, return_value=start + WS_STATS_STALL_SECONDS + 120):
        assert manager.docker_stats_stalled() is True
    coordinator.data.containers[0].is_running = False
    with patch(_MONOTONIC, return_value=start + WS_STATS_STALL_SECONDS + 180):
        assert manager.docker_stats_stalled() is False


async def test_event_clears_a_confirmed_stall() -> None:
    """A statistics event ends a confirmed stall."""

    async def events() -> AsyncGenerator[MagicMock]:
        yield MagicMock(id=None)

    manager = _manager((True,))
    manager._api_client.subscribe_container_stats = events
    assert _stalled_after(manager, WS_STATS_STALL_SECONDS) is True
    await manager._handle_container_stats()
    assert manager.docker_stats_stalled() is False


def test_no_data_gives_no_evidence() -> None:
    """A coordinator without data cannot report a stall."""
    manager = _manager((True,))
    manager._system_coordinator.data = None
    assert _stalled_after(manager, WS_STATS_STALL_SECONDS * 2) is None


async def test_event_resets_the_quiet_period() -> None:
    """A statistics event restarts the quiet period, even without an ID."""

    async def events() -> AsyncGenerator[MagicMock]:
        yield MagicMock(id=None)

    manager = _manager((True,))
    manager._api_client.subscribe_container_stats = events
    with patch(_MONOTONIC, return_value=manager._stats_quiet_since + 1000):
        await manager._handle_container_stats()
        assert manager.docker_stats_stalled() is False


def _entry(hass: HomeAssistant, name: str, *, stalled: bool) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title=name)
    entry.add_to_hass(hass)
    entry.runtime_data = MagicMock()
    entry.runtime_data.websocket_manager.docker_stats_stalled.return_value = stalled
    return entry


async def test_issue_follows_the_stream_per_entry(
    hass: HomeAssistant, issue_registry: ir.IssueRegistry
) -> None:
    """Each server raises and clears its own warning."""
    tower = _entry(hass, "tower", stalled=True)
    other = _entry(hass, "other", stalled=True)
    tower_id = docker_stats_stalled_issue_id(tower.entry_id)
    other_id = docker_stats_stalled_issue_id(other.entry_id)

    _async_update_docker_stats_issue(hass, tower)
    _async_update_docker_stats_issue(hass, other)

    issue = issue_registry.async_get_issue(DOMAIN, tower_id)
    assert issue is not None
    assert issue.is_fixable is False
    assert issue.severity is ir.IssueSeverity.WARNING
    assert issue.translation_key == REPAIR_DOCKER_STATS_STALLED
    assert issue.translation_placeholders == {"server": "tower"}
    assert issue.data == {"entry_id": tower.entry_id}

    tower.runtime_data.websocket_manager.docker_stats_stalled.return_value = False
    _async_update_docker_stats_issue(hass, tower)

    assert issue_registry.async_get_issue(DOMAIN, tower_id) is None
    assert issue_registry.async_get_issue(DOMAIN, other_id) is not None

    other.runtime_data.websocket_manager.docker_stats_stalled.return_value = None
    _async_update_docker_stats_issue(hass, other)

    assert issue_registry.async_get_issue(DOMAIN, other_id) is not None
