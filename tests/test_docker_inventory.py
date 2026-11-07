"""Test Docker inventory reconciliation against Home Assistant's entity registry."""

from unittest.mock import patch

from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant.common import MockConfigEntry
from unraid_api import UnraidConnectionError
from unraid_api.models import DockerContainer

from custom_components.unraid.const import DOMAIN


async def test_docker_entities_use_fresh_observations_and_reappear(
    hass, mock_unraid_client
):
    """Cached refreshes cannot delete entities, and recreation needs no reload."""
    container = DockerContainer(id="ct:1", name="/web", state="RUNNING")
    mock_unraid_client.typed_get_containers_safe.return_value = [container]
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
        patch("custom_components.unraid.coordinator.DOCKER_POLL_INTERVAL", 0),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_start"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_stop"),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        runtime = entry.runtime_data
        registry = er.async_get(hass)
        unique_id = f"{runtime.server_info['uuid']}_container_switch_web"

        def update_sensor_id() -> str | None:
            return registry.async_get_entity_id(
                "binary_sensor",
                DOMAIN,
                f"{runtime.server_info['uuid']}_container_web_update",
            )

        def switch_id() -> str | None:
            return registry.async_get_entity_id("switch", DOMAIN, unique_id)

        assert switch_id() is not None
        assert update_sensor_id() is not None
        mock_unraid_client.typed_get_containers_safe.return_value = []
        await runtime.system_coordinator.async_refresh()
        await hass.async_block_till_done()
        for _ in range(4):
            await runtime.storage_coordinator.async_refresh()
        await hass.async_block_till_done()
        assert switch_id() is not None
        assert update_sensor_id() is not None

        mock_unraid_client.typed_get_containers_safe.side_effect = (
            UnraidConnectionError("Docker inventory unavailable")
        )
        await runtime.system_coordinator.async_refresh()
        mock_unraid_client.typed_get_containers_safe.side_effect = None
        await runtime.system_coordinator.async_refresh()
        await hass.async_block_till_done()
        assert switch_id() is not None
        await runtime.system_coordinator.async_refresh()
        await hass.async_block_till_done()
        assert switch_id() is None
        assert update_sensor_id() is None

        mock_unraid_client.typed_get_containers_safe.return_value = [
            container.model_copy(update={"id": "ct:2"})
        ]
        await runtime.system_coordinator.async_refresh()
        await hass.async_block_till_done()
        assert switch_id() is not None
        assert update_sensor_id() is not None
        assert await hass.config_entries.async_unload(entry.entry_id)


async def test_interleaved_entries_track_missing_docker_entities_independently(hass):
    """A different entry's cleanup cannot reset another entry's grace period."""
    from unittest.mock import MagicMock

    from custom_components.unraid.cleanup import async_cleanup_stale_entities
    from custom_components.unraid.docker_entities import DockerEntityLifecycle
    from tests.conftest import make_storage_data, make_system_data

    registry = er.async_get(hass)
    storage = MagicMock(data=make_storage_data(), last_update_success=True)

    def setup_entry(uuid: str) -> tuple[MockConfigEntry, er.RegistryEntry, MagicMock]:
        entry = MockConfigEntry(domain=DOMAIN, unique_id=uuid)
        entry.add_to_hass(hass)
        entity = registry.async_get_or_create(
            "switch", DOMAIN, f"{uuid}_container_switch_web", config_entry=entry
        )
        coordinator = MagicMock(
            data=make_system_data(containers=[]),
            last_update_success=True,
            optional_query_status={"containers": True},
            docker_entities=DockerEntityLifecycle(),
        )
        return entry, entity, coordinator

    first, first_entity, first_system = setup_entry("first")
    second, second_entity, second_system = setup_entry("second")
    for generation in range(1, 4):
        first_system.data.docker_inventory_generation = generation
        async_cleanup_stale_entities(
            hass, first.entry_id, "first", first_system, storage
        )
        second_system.data.docker_inventory_generation = generation
        second_system.optional_query_status = {"containers": generation == 1}
        async_cleanup_stale_entities(
            hass, second.entry_id, "second", second_system, storage
        )

    assert registry.async_get(first_entity.entity_id) is None
    assert registry.async_get(second_entity.entity_id) is not None


async def test_docker_absence_is_scoped_to_the_registry_platform(hass):
    """Different platforms can have the same unique ID for different containers."""
    from unittest.mock import MagicMock

    from custom_components.unraid.cleanup import async_cleanup_stale_entities
    from custom_components.unraid.docker_entities import DockerEntityLifecycle
    from tests.conftest import make_storage_data, make_system_data

    entry = MockConfigEntry(domain=DOMAIN, unique_id="tower")
    entry.add_to_hass(hass)
    registry = er.async_get(hass)
    uid = "tower_container_switch_foo_cpu"
    switch = registry.async_get_or_create("switch", DOMAIN, uid, config_entry=entry)
    sensor = registry.async_get_or_create("sensor", DOMAIN, uid, config_entry=entry)
    container = DockerContainer(id="ct:2", name="/switch_foo", state="RUNNING")
    system = MagicMock(
        last_update_success=True,
        optional_query_status={"containers": True},
        docker_entities=DockerEntityLifecycle(),
    )
    storage = MagicMock(data=make_storage_data(), last_update_success=True)
    for generation in range(1, 4):
        system.data = make_system_data(containers=[container])
        system.data.docker_inventory_generation = generation
        async_cleanup_stale_entities(hass, entry.entry_id, "tower", system, storage)

    assert registry.async_get(switch.entity_id) is None
    assert registry.async_get(sensor.entity_id) is not None

    # A positive inventory observation clears prior absence even during a
    # storage outage, while pruning still waits for storage to recover.
    for generation in (4, 5, 6, 7):
        storage.last_update_success = generation != 6
        system.data = make_system_data(
            containers=[container] if generation == 6 else []
        )
        system.data.docker_inventory_generation = generation
        async_cleanup_stale_entities(hass, entry.entry_id, "tower", system, storage)
    assert registry.async_get(sensor.entity_id) is not None
