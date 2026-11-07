"""Exercise notification events through Home Assistant's integration setup."""

from unittest.mock import patch

from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant.common import MockConfigEntry
from unraid_api import Notification

from custom_components.unraid.const import DOMAIN


async def test_notification_event_baselines_and_delivers_typed_payload(
    hass, mock_unraid_client
):
    """Existing notifications stay quiet and new unread notifications arrive once."""
    initial = Notification.model_validate(
        {"id": "old", "type": "UNREAD", "timestamp": "2026-11-07T01:00:00.000Z"}
    )
    added = Notification.model_validate(
        {
            "id": "new",
            "type": "UNREAD",
            "title": "Array check",
            "timestamp": "2026-11-07T02:00:00.000Z",
            "formattedTimestamp": "07 Nov 12:00",
        }
    )
    reader = mock_unraid_client.typed_get_notifications
    reader.return_value = [initial]
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="tower",
        unique_id="test-uuid-123",
        data={
            CONF_HOST: "192.168.1.100",
            CONF_API_KEY: "test-api-key",
            CONF_PORT: 443,
            CONF_SSL: True,
        },
    )
    entry.add_to_hass(hass)
    with (
        patch("custom_components.unraid.async_register_frontend"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_start"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_stop"),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        runtime = entry.runtime_data
        entity_id = er.async_get(hass).async_get_entity_id(
            "event", DOMAIN, f"{runtime.server_info['uuid']}_notifications"
        )
        assert entity_id is not None
        state = hass.states.get(entity_id)
        assert state is not None
        assert "notification_id" not in state.attributes

        reader.return_value = [initial, added]
        await runtime.system_coordinator.async_refresh()
        await hass.async_block_till_done()
        event = hass.states.get(entity_id)
        assert event is not None
        assert event.attributes["event_type"] == "notification_created"
        assert event.attributes["notification_id"] == "new"
        assert event.attributes["title"] == "Array check"
        assert event.attributes["timestamp"] == "2026-11-07T02:00:00.000Z"
        assert event.attributes["formatted_timestamp"] == "07 Nov 12:00"
        reader.assert_awaited_with(notification_type="UNREAD", limit=200, offset=0)

        await runtime.system_coordinator.async_refresh()
        await hass.async_block_till_done()
        latest = hass.states.get(entity_id)
        assert latest is not None
        assert latest.state == event.state
        assert await hass.config_entries.async_unload(entry.entry_id)
