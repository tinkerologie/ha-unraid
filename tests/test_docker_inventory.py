"""Test Docker inventory reconciliation against Home Assistant's entity registry."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.update_coordinator import REQUEST_REFRESH_DEFAULT_COOLDOWN
from homeassistant.util import dt as dt_util
from pytest_homeassistant.common import MockConfigEntry, async_fire_time_changed
from unraid_api import UnraidConnectionError
from unraid_api.models import (
    ArrayDisk,
    DockerContainer,
    UnraidArray,
    UPSDevice,
    VmDomain,
)

from custom_components.unraid.const import (
    CONF_ENABLE_CONTAINER_UPDATES,
    CONF_ENABLE_DOCKER_MONITORING,
    DOMAIN,
)
from custom_components.unraid.docker_entities import (
    DockerEntityKind,
    DockerEntityLifecycle,
    is_docker_resource_id,
)


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


async def test_disabled_docker_lifecycle_skips_registration_while_vm_discovers(
    hass,
) -> None:
    """Disabled Docker lifecycle skips registration while VMs still discover."""
    from custom_components.unraid.vm_entities import VmEntityLifecycle
    from tests.conftest import make_system_data

    listeners: list = []
    coordinator = MagicMock()
    coordinator.data = make_system_data(
        containers=[DockerContainer(id="ct:1", name="/web", state="RUNNING")],
        vms=[VmDomain(id="vm:1", name="ubuntu", state="RUNNING")],
    )
    coordinator.async_add_listener.side_effect = lambda cb: (
        listeners.append(cb) or (lambda: listeners.remove(cb))
    )

    docker_lifecycle = DockerEntityLifecycle(enabled=False)
    docker_add = MagicMock()
    docker_factory = MagicMock()
    unsub_docker = docker_lifecycle.async_register_platform(
        coordinator=coordinator,
        async_add_entities=docker_add,
        create_entities=docker_factory,
        platform="switch",
    )

    docker_factory.assert_not_called()
    docker_add.assert_not_called()
    assert listeners == []
    unsub_docker()

    vm_lifecycle = VmEntityLifecycle()
    vm_entity = MagicMock(unique_id="tower_vm_switch_ubuntu")
    vm_add = MagicMock()
    vm_factory = MagicMock(return_value=[vm_entity])
    unsub_vm = vm_lifecycle.async_register_platform(
        coordinator=coordinator,
        async_add_entities=vm_add,
        create_entities=vm_factory,
        platform="switch",
    )

    vm_factory.assert_called_once()
    vm_add.assert_called_once_with([vm_entity])
    assert len(listeners) == 1

    # Later container discovery triggers no Docker factory calls.
    coordinator.data = make_system_data(
        containers=[
            DockerContainer(id="ct:1", name="/web", state="RUNNING"),
            DockerContainer(id="ct:2", name="/db", state="RUNNING"),
        ],
        vms=[VmDomain(id="vm:1", name="ubuntu", state="RUNNING")],
    )
    for listener in listeners:
        listener()
    docker_factory.assert_not_called()
    docker_add.assert_not_called()
    unsub_vm()


def _assert_entities_active(
    hass, registry: er.EntityRegistry, entity_ids: tuple[str | None, ...]
) -> None:
    """Assert each entity ID exists in the registry and has a live state."""
    for eid in entity_ids:
        assert eid is not None
        assert registry.async_get(eid) is not None
        assert hass.states.get(eid) is not None


async def _trigger_docker_refresh(hass, entry: MockConfigEntry, offset: int) -> None:
    """Trigger a Docker refresh past coordinator cooldown."""
    await entry.runtime_data.system_coordinator.async_request_docker_refresh()
    async_fire_time_changed(
        hass,
        dt_util.utcnow() + timedelta(seconds=REQUEST_REFRESH_DEFAULT_COOLDOWN + offset),
    )
    await hass.async_block_till_done()


async def _save_options(hass, entry_id: str, options: dict[str, bool]) -> None:
    """Save options through the options flow and wait for reload."""
    opt_init = await hass.config_entries.options.async_init(entry_id)
    opt_done = await hass.config_entries.options.async_configure(
        opt_init["flow_id"], options
    )
    assert opt_done["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()


async def test_docker_monitoring_option_full_transition(
    hass, mock_unraid_client
) -> None:
    """Test disabling and re-enabling Docker monitoring across all platforms."""
    web = DockerContainer(
        id="ct:1",
        name="/web",
        state="RUNNING",
        image="nginx:1.25",
        isUpdateAvailable=True,
    )
    db = DockerContainer(id="ct:2", name="/db", state="RUNNING", image="postgres:17")
    cache = DockerContainer(id="ct:3", name="/cache", state="RUNNING", image="redis:7")
    mock_unraid_client.typed_get_containers_safe.return_value = [web]
    mock_unraid_client.typed_get_vms.return_value = [
        VmDomain(id="vm:1", name="ubuntu", state="RUNNING")
    ]
    mock_unraid_client.typed_get_ups_devices.return_value = [
        UPSDevice(id="ups:1", name="APC")
    ]
    mock_unraid_client.typed_get_array.return_value = UnraidArray(
        state="STARTED",
        disks=[ArrayDisk(id="disk:1", name="disk1", device="sda", size=1000)],
    )

    # Missing option key defaults to enabled.
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
        options={},
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

        registry = er.async_get(hass)
        prefix = f"{entry.runtime_data.server_info['uuid']}_"

        def container_entries() -> list[er.RegistryEntry]:
            return [
                item
                for item in er.async_entries_for_config_entry(registry, entry.entry_id)
                if item.unique_id.startswith(prefix)
                and is_docker_resource_id(item.unique_id[len(prefix) :], item.domain)
            ]

        assert len(container_entries()) > 0
        assert (
            registry.async_get_entity_id(
                "switch",
                DOMAIN,
                f"{prefix}{DockerEntityKind.SWITCH.resource_id('web')}",
            )
            is not None
        )
        assert (
            registry.async_get_entity_id(
                "update",
                DOMAIN,
                f"{prefix}{DockerEntityKind.UPDATE.resource_id('web')}",
            )
            is not None
        )
        retained_ids = (
            registry.async_get_entity_id("sensor", DOMAIN, f"{prefix}cpu_usage"),
            registry.async_get_entity_id("sensor", DOMAIN, f"{prefix}array_state"),
            registry.async_get_entity_id("switch", DOMAIN, f"{prefix}vm_switch_ubuntu"),
            registry.async_get_entity_id(
                "sensor", DOMAIN, f"{prefix}ups_ups:1_battery"
            ),
            registry.async_get_entity_id(
                "sensor", DOMAIN, f"{prefix}container_updates_count"
            ),
            registry.async_get_entity_id("sensor", DOMAIN, f"{prefix}docker_total_cpu"),
            registry.async_get_entity_id(
                "button", DOMAIN, f"{prefix}check_container_updates"
            ),
        )
        update_all_id = registry.async_get_entity_id(
            "button", DOMAIN, f"{prefix}update_all_containers"
        )
        assert update_all_id is not None
        _assert_entities_active(hass, registry, retained_ids)

        # Save False via options flow -> reload removes per-container entities
        await _save_options(
            hass, entry.entry_id, {CONF_ENABLE_DOCKER_MONITORING: False}
        )

        assert container_entries() == []
        assert registry.async_get(update_all_id) is not None
        _assert_entities_active(hass, registry, retained_ids)

        # Adding a container while disabled creates no new entities
        mock_unraid_client.typed_get_containers_safe.return_value = [web, db]
        await _trigger_docker_refresh(hass, entry, 1)
        assert container_entries() == []

        # Save True via options flow -> reload restores current inventory
        await _save_options(hass, entry.entry_id, {CONF_ENABLE_DOCKER_MONITORING: True})

        for cname in ("web", "db"):
            assert (
                registry.async_get_entity_id(
                    "switch",
                    DOMAIN,
                    f"{prefix}{DockerEntityKind.SWITCH.resource_id(cname)}",
                )
                is not None
            )

        # Later discovery works without another reload
        mock_unraid_client.typed_get_containers_safe.return_value = [web, db, cache]
        await _trigger_docker_refresh(hass, entry, 2)
        assert (
            registry.async_get_entity_id(
                "switch",
                DOMAIN,
                f"{prefix}{DockerEntityKind.SWITCH.resource_id('cache')}",
            )
            is not None
        )

        # Disabling only container updates omits update entities for new containers
        await _save_options(
            hass,
            entry.entry_id,
            {
                CONF_ENABLE_DOCKER_MONITORING: True,
                CONF_ENABLE_CONTAINER_UPDATES: False,
            },
        )

        worker = DockerContainer(
            id="ct:4", name="/worker", state="RUNNING", image="python:3.14"
        )
        mock_unraid_client.typed_get_containers_safe.return_value = [
            web,
            db,
            cache,
            worker,
        ]
        await _trigger_docker_refresh(hass, entry, 3)
        assert (
            registry.async_get_entity_id(
                "switch",
                DOMAIN,
                f"{prefix}{DockerEntityKind.SWITCH.resource_id('worker')}",
            )
            is not None
        )
        assert (
            registry.async_get_entity_id(
                "update",
                DOMAIN,
                f"{prefix}{DockerEntityKind.UPDATE.resource_id('worker')}",
            )
            is None
        )

        assert await hass.config_entries.async_unload(entry.entry_id)


async def test_docker_monitoring_enabled_with_container_updates_disabled(
    hass, mock_unraid_client
) -> None:
    """With Docker monitoring on and updates off, only update entities are skipped."""
    mock_unraid_client.typed_get_containers_safe.return_value = [
        DockerContainer(
            id="ct:1",
            name="/web",
            state="RUNNING",
            image="nginx:1.25",
            isUpdateAvailable=True,
        )
    ]
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
        options={
            CONF_ENABLE_DOCKER_MONITORING: True,
            CONF_ENABLE_CONTAINER_UPDATES: False,
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
        prefix = f"{entry.runtime_data.server_info['uuid']}_"

        assert (
            registry.async_get_entity_id(
                "switch",
                DOMAIN,
                f"{prefix}{DockerEntityKind.SWITCH.resource_id('web')}",
            )
            is not None
        )
        assert (
            registry.async_get_entity_id(
                "sensor", DOMAIN, f"{prefix}{DockerEntityKind.CPU.resource_id('web')}"
            )
            is not None
        )
        assert (
            registry.async_get_entity_id(
                "binary_sensor",
                DOMAIN,
                f"{prefix}{DockerEntityKind.LEGACY_UPDATE.resource_id('web')}",
            )
            is not None
        )
        assert (
            registry.async_get_entity_id(
                "button",
                DOMAIN,
                f"{prefix}{DockerEntityKind.RESTART.resource_id('web')}",
            )
            is not None
        )
        assert (
            registry.async_get_entity_id(
                "update",
                DOMAIN,
                f"{prefix}{DockerEntityKind.UPDATE.resource_id('web')}",
            )
            is None
        )
        assert await hass.config_entries.async_unload(entry.entry_id)
