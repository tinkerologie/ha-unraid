"""Deliver newly observed unread notifications for one Unraid config entry."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable
    from datetime import datetime

    from homeassistant.helpers.storage import Store
    from unraid_api import Notification

_LOGGER = logging.getLogger(__name__)
MAX_SEEN_NOTIFICATION_IDS = 1000
NOTIFICATION_EVENT_TYPE_CREATED = "notification_created"


@dataclass(frozen=True)
class UnraidNotificationEventData:
    """Payload emitted for a newly observed unread notification."""

    event_type: str
    notification_id: str
    title: str
    subject: str
    description: str
    timestamp: str
    formatted_timestamp: str
    importance: str
    link: str
    notification_type: str


class NotificationEventDelivery:
    """Baseline, order, and deduplicate notification events for one entry."""

    def __init__(
        self,
        read_unread: Callable[[], Awaitable[list[Notification]]],
        store: Store[dict[str, list[str]]],
        server_name: str,
    ) -> None:
        """Use the entry's typed notification reader and seen-ID store."""
        self._read_unread = read_unread
        self._store = store
        self._server_name = server_name
        self._listeners: dict[
            object, Callable[[UnraidNotificationEventData], None]
        ] = {}
        self._seen: set[str] = set()
        self._loaded = False
        self._baselined = False

    def async_subscribe(
        self, callback: Callable[[UnraidNotificationEventData], None]
    ) -> Callable[[], None]:
        """Subscribe to new notification events and return an unsubscriber."""
        registration = object()
        self._listeners[registration] = callback

        def unsubscribe() -> None:
            self._listeners.pop(registration, None)

        return unsubscribe

    async def async_reconcile(self) -> None:
        """Fetch unread notifications and emit those observed after baselining."""
        if not self._loaded:
            await self._async_load()
        unread: dict[str, tuple[datetime, UnraidNotificationEventData]] = {}
        for notification in await self._read_unread():
            notification_type = notification.type or ""
            if notification_type.upper() != "UNREAD":
                continue
            stamp = notification.timestamp
            if not notification.id or stamp is None:
                _LOGGER.warning(
                    "Skipping incomplete unread notification on %s", self._server_name
                )
                continue
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=UTC)
            # Unraid timestamps use ISO 8601, with milliseconds and a UTC Z.
            # Preserve that automation-facing format after model conversion.
            precision = "microseconds" if stamp.microsecond % 1000 else "milliseconds"
            unread[notification.id] = (
                stamp,
                UnraidNotificationEventData(
                    event_type=NOTIFICATION_EVENT_TYPE_CREATED,
                    notification_id=notification.id,
                    title=notification.title or "",
                    subject=notification.subject or "",
                    description=notification.description or "",
                    timestamp=stamp.isoformat(timespec=precision).replace(
                        "+00:00", "Z"
                    ),
                    formatted_timestamp=notification.formattedTimestamp or "",
                    importance=notification.importance or "",
                    link=notification.link or "",
                    notification_type=notification_type,
                ),
            )

        if not self._baselined:
            self._seen = set(unread)
            self._baselined = True
            await self._async_save()
            return

        unseen = [item for uid, item in unread.items() if uid not in self._seen]
        if not unseen:
            return
        for _, event in sorted(unseen, key=lambda item: item[0]):
            for listener in tuple(self._listeners.values()):
                try:
                    listener(event)
                except Exception:
                    _LOGGER.exception(
                        "Error calling notification event listener for %s on %s",
                        event.notification_id,
                        self._server_name,
                    )
            self._seen.add(event.notification_id)
        await self._async_save()

    async def _async_load(self) -> None:
        """Read the persisted seen-ID list once."""
        try:
            data = await self._store.async_load()
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning(
                "Failed to load seen notification IDs for %s: %s",
                self._server_name,
                err,
            )
        else:
            self._seen = (
                set(data["seen_ids"][:MAX_SEEN_NOTIFICATION_IDS])
                if (data and "seen_ids" in data)
                else set()
            )
        self._loaded = True

    async def _async_save(self) -> None:
        """Keep the existing bounded seen-ID storage format."""
        retained = sorted(self._seen)[-MAX_SEEN_NOTIFICATION_IDS:]
        self._seen = set(retained)
        try:
            await self._store.async_save({"seen_ids": retained})
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning(
                "Failed to save seen notification IDs for %s: %s",
                self._server_name,
                err,
            )
