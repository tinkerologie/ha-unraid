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
        for resource in (
            "docker_total_cpu",
            "ram_used",
            "ram_usage",
            "docker_total_memory_bytes",
            "docker_total_memory_pct",
        ):
            entity_id = registry.async_get_entity_id(
                "sensor", DOMAIN, f"{uuid}_{resource}"
            )
            assert entity_id is not None
            assert registry.async_get(entity_id).disabled_by is None
        full = mock_unraid_client.get_system_metrics
        safe = mock_unraid_client.get_system_metrics_safe
        if api_version == "4.37.6":
            full.assert_awaited_once_with()
            safe.assert_not_awaited()
        else:
            safe.assert_awaited_once_with()
            full.assert_not_awaited()
        assert await hass.config_entries.async_unload(entry.entry_id)


@pytest.mark.parametrize("gap_kind", ["all", "one"])
async def test_temperature_discovery_after_setup_and_recovery(
    hass, mock_unraid_client, caplog, gap_kind
):
    """Discover late readings once and keep identities across missing/restored data."""
    mock_unraid_client.get_server_info.return_value = make_server_info(
        api_version="4.37.6"
    )
    full = mock_unraid_client.get_system_metrics.return_value
    absent = full.model_copy(update={"temperature": None})
    mock_unraid_client.get_system_metrics.return_value = absent
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
        coordinator = entry.runtime_data.system_coordinator
        resources = ("temp_board", "temp_chipset", "temperature_average")
        assert all(
            registry.async_get_entity_id("sensor", DOMAIN, f"{uuid}_{r}") is None
            for r in resources
        )
        # Both discovery listeners tolerate a refresh with no coordinator data.
        coordinator.async_set_updated_data(None)
        await hass.async_block_till_done()
        assert all(
            registry.async_get_entity_id("sensor", DOMAIN, f"{uuid}_{r}") is None
            for r in resources
        )
        mock_unraid_client.get_system_metrics.return_value = full
        await coordinator.async_refresh()
        await hass.async_block_till_done()
        entity_ids = [
            registry.async_get_entity_id("sensor", DOMAIN, f"{uuid}_{r}")
            for r in resources
        ]
        assert all(entity_ids)
        gap = absent
        gap_states = ["unknown"] * 3
        if gap_kind == "one":
            gap = full.model_copy(
                update={
                    "temperature": full.temperature.model_copy(
                        update={
                            "sensors": [
                                sensor
                                for sensor in full.temperature.sensors
                                if sensor.id == "chipset"
                            ]
                        }
                    )
                }
            )
            gap_states = ["unknown", "45.0", "45.0"]
        # Exceed cleanup's three-pass grace period before restoring readings.
        for metrics, values in [
            (full, ["35.0", "45.0", "40.0"]),
            *[(gap, gap_states)] * 4,
            (full, ["35.0", "45.0", "40.0"]),
        ]:
            mock_unraid_client.get_system_metrics.return_value = metrics
            await coordinator.async_refresh()
            await hass.async_block_till_done()
            assert [
                registry.async_get_entity_id("sensor", DOMAIN, f"{uuid}_{r}")
                for r in resources
            ] == entity_ids
            assert [
                hass.states.get(entity_id).state for entity_id in entity_ids
            ] == values
        registered = er.async_entries_for_config_entry(registry, entry.entry_id)
        assert (
            sum(e.unique_id == f"{uuid}_temperature_average" for e in registered) == 1
        )
        assert "already exists" not in caplog.text
        assert "Failed to sync dynamically discovered entities" not in caplog.text
        assert await hass.config_entries.async_unload(entry.entry_id)
