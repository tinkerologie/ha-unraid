"""Test event delivery through its typed reader and storage seams."""

from unittest.mock import AsyncMock

import pytest
from unraid_api import Notification, UnraidConnectionError

from custom_components.unraid.notification_events import NotificationEventDelivery


def unread(uid: str, timestamp: str = "2026-11-07T01:00:00Z") -> Notification:
    """Return a notification model normalized by the library."""
    return Notification.model_validate(
        {"id": uid, "type": "UNREAD", "timestamp": timestamp}
    )


async def test_delivery_filters_orders_deduplicates_and_unsubscribes() -> None:
    """Publish only new unread notifications in timestamp order."""
    storage = AsyncMock()
    storage.async_load.return_value = None
    read = AsyncMock(return_value=[unread("baseline")])
    delivery = NotificationEventDelivery(read, storage, "tower")
    received = []
    unsubscribe = delivery.async_subscribe(received.append)

    await delivery.async_reconcile()
    assert received == []
    storage.async_save.assert_awaited_once_with({"seen_ids": ["baseline"]})
    read.return_value = [
        unread("late", "2026-11-07T03:00:00Z"),
        unread("early", "2026-11-07T12:00:00+10:00"),
        unread("early", "2026-11-07T12:00:00+10:00"),
        unread("baseline"),
        Notification(id="incomplete", type="UNREAD"),
        Notification(id="no-type", timestamp=unread("baseline").timestamp),
        unread("archived").model_copy(update={"type": "ARCHIVE"}),
    ]
    await delivery.async_reconcile()
    await delivery.async_reconcile()
    assert [event.notification_id for event in received] == ["early", "late"]

    unsubscribe()
    unsubscribe()
    read.return_value = [unread("after-unsubscribe")]
    await delivery.async_reconcile()
    assert [event.notification_id for event in received] == ["early", "late"]
    storage.async_load.assert_awaited_once()


async def test_failed_reads_do_not_baseline_and_storage_failures_keep_delivery() -> (
    None
):
    """The first successful snapshot baselines despite previous errors."""
    store = AsyncMock()
    store.async_load.side_effect = OSError("cannot read storage")
    store.async_save.side_effect = OSError("cannot write storage")
    read = AsyncMock(side_effect=UnraidConnectionError("disconnected"))
    delivery = NotificationEventDelivery(read, store, "tower")
    delivered = []

    def broken_listener(_event) -> None:
        raise RuntimeError("listener failed")

    delivery.async_subscribe(broken_listener)
    delivery.async_subscribe(delivered.append)
    with pytest.raises(UnraidConnectionError, match="disconnected"):
        await delivery.async_reconcile()

    read.side_effect = None
    read.return_value = [unread("initial")]
    await delivery.async_reconcile()
    assert delivered == []
    read.return_value.append(unread("new"))
    await delivery.async_reconcile()
    await delivery.async_reconcile()
    assert [event.notification_id for event in delivered] == ["new"]


async def test_seen_id_storage_is_bounded_and_scoped_to_the_entry() -> None:
    """Each entry baselines and persists its own bounded list."""
    store_a, store_b = AsyncMock(), AsyncMock()
    store_a.async_load.return_value = {"seen_ids": ["previous"]}
    store_b.async_load.return_value = None
    read_a = AsyncMock(return_value=[unread(f"n{index:04}") for index in range(1001)])
    read_b = AsyncMock(return_value=[unread("b")])
    entry_a = NotificationEventDelivery(read_a, store_a, "a")
    entry_b = NotificationEventDelivery(read_b, store_b, "b")
    await entry_a.async_reconcile()
    await entry_b.async_reconcile()

    store_a.async_save.assert_awaited_once_with(
        {"seen_ids": [f"n{index:04}" for index in range(1, 1001)]}
    )
    store_b.async_save.assert_awaited_once_with({"seen_ids": ["b"]})
