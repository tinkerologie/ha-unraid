"""Test adaptive temperature polling through real Home Assistant entity setup."""

from unittest.mock import patch

import pytest
from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.unraid.const import DOMAIN
from tests.conftest import make_server_info


@pytest.mark.parametrize("api_version", ["4.37.6", "4.31.1"])
async def test_temperature_entities_from_adaptive_polling(
    hass, mock_unraid_client, api_version
):
    """Publish supported hardware temperatures while older APIs omit them entirely."""
    mock_unraid_client.get_server_info.return_value = make_server_info(
        api_version=api_version
    )
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
        registry = er.async_get(hass)
        uuid = entry.runtime_data.server_info["uuid"]
        for resource, expected in [
            ("temp_board", "35.0"),
            ("temp_chipset", "45.0"),
            ("temperature_average", "40.0"),
        ]:
            entity_id = registry.async_get_entity_id(
                "sensor", DOMAIN, f"{uuid}_{resource}"
            )
            if api_version == "4.37.6":
                assert entity_id is not None
                state = hass.states.get(entity_id)
                assert state is not None
                assert state.state == expected
                assert state.attributes["unit_of_measurement"] == "°C"
            else:
                assert entity_id is None
        full = mock_unraid_client.get_system_metrics
        safe = mock_unraid_client.get_system_metrics_safe
        if api_version == "4.37.6":
            full.assert_awaited_once_with()
            safe.assert_not_awaited()
        else:
            safe.assert_awaited_once_with()
            full.assert_not_awaited()
        assert await hass.config_entries.async_unload(entry.entry_id)
