"""Verify VM discovery and array operations through Home Assistant state."""

from __future__ import annotations

from contextlib import contextmanager
from typing import TYPE_CHECKING
from unittest.mock import patch

from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant.common import MockConfigEntry
from unraid_api.exceptions import UnraidConnectionError, UnraidTimeoutError
from unraid_api.models import ParityCheck, Vars, VmDomain

from custom_components.unraid.const import DOMAIN
from tests.conftest import create_mock_unraid_client, make_server_info

if TYPE_CHECKING:
    from collections.abc import Iterator
    from unittest.mock import MagicMock

    import pytest
    from homeassistant.core import HomeAssistant


def _entry(hass: HomeAssistant, uuid: str, host: str) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title=host,
        unique_id=uuid,
        data={
            CONF_HOST: host,
            CONF_API_KEY: "test-key",
            CONF_PORT: 443,
            CONF_SSL: True,
        },
    )
    entry.add_to_hass(hass)
    return entry


@contextmanager
def _patch_optional_startup() -> Iterator[None]:
    with (
        patch("custom_components.unraid.async_register_frontend"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_start"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_stop"),
    ):
        yield


def _vm_ids(registry: er.EntityRegistry, entry: MockConfigEntry) -> dict[str, str]:
    uuid = entry.runtime_data.server_info["uuid"]
    return {
        row.unique_id.removeprefix(f"{uuid}_"): row.entity_id
        for row in er.async_entries_for_config_entry(registry, entry.entry_id)
        if row.unique_id.startswith(f"{uuid}_vm_")
    }


async def test_vm_observation_and_same_name_recovery(
    hass: HomeAssistant, mock_unraid_client: MagicMock
) -> None:
    """Count successful inventories and restore customised IDs without reload."""
    vm = VmDomain(id="vm:1", name="/example", state="RUNNING")
    fetch = mock_unraid_client.typed_get_vms
    fetch.return_value = [vm]
    entry = _entry(hass, "test-uuid-123", "tower")
    registry = er.async_get(hass)

    with _patch_optional_startup():
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        runtime = entry.runtime_data
        system, storage = runtime.system_coordinator, runtime.storage_coordinator
        original = _vm_ids(registry, entry)
        assert len(original) == 7
        registry.async_update_entity(
            original["vm_switch_/example"], new_entity_id="switch.custom_vm"
        )
        registry.async_update_entity(
            original["vm_reboot_/example"], disabled_by=er.RegistryEntryDisabler.USER
        )
        await hass.async_block_till_done()
        original = _vm_ids(registry, entry)

        fetch.return_value = []
        await system.async_refresh()
        for _ in range(3):
            await storage.async_refresh()
        assert _vm_ids(registry, entry) == original

        fetch.side_effect = UnraidConnectionError("VM query failed")
        await system.async_refresh()
        assert _vm_ids(registry, entry) == original
        fetch.side_effect = None
        await system.async_refresh()
        assert _vm_ids(registry, entry) == original
        await system.async_refresh()
        await hass.async_block_till_done()
        assert _vm_ids(registry, entry) == {}
        assert hass.states.get("switch.custom_vm") is None

        fetch.return_value = [VmDomain(id="vm:2", name="/example", state="RUNNING")]
        await system.async_refresh()
        await hass.async_block_till_done()
        assert _vm_ids(registry, entry) == original
        switch = hass.states.get("switch.custom_vm")
        assert switch is not None
        assert switch.state == "on"
        button = registry.async_get(original["vm_reboot_/example"])
        assert button is not None
        assert button.disabled_by is er.RegistryEntryDisabler.USER
        assert entry.state is ConfigEntryState.LOADED
        assert await hass.config_entries.async_unload(entry.entry_id)


async def test_array_operation_transitions(
    hass: HomeAssistant, mock_unraid_client: MagicMock
) -> None:
    """Publish idle, rebuild, paused rebuild and idle with stable entity IDs."""
    variables = mock_unraid_client.typed_get_vars
    variables.return_value = Vars(mdResyncPos="0")
    array_query = mock_unraid_client.typed_get_array
    array = array_query.return_value
    entry = _entry(hass, "test-uuid-123", "tower")
    registry = er.async_get(hass)

    with _patch_optional_startup():
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        runtime = entry.runtime_data
        storage = runtime.storage_coordinator
        uuid = runtime.server_info["uuid"]
        kind_id = registry.async_get_entity_id(
            "sensor", DOMAIN, f"{uuid}_array_operation"
        )
        progress_id = registry.async_get_entity_id(
            "sensor", DOMAIN, f"{uuid}_array_operation_progress"
        )
        parity_id = registry.async_get_entity_id(
            "sensor", DOMAIN, f"{uuid}_parity_progress"
        )
        assert kind_id is not None
        assert progress_id is not None
        assert parity_id is not None

        for position, status, percent, expected, progress, paused in (
            ("0", "COMPLETED", 100, "idle", "unknown", False),
            ("1", "RUNNING", 0, "data_rebuild", "0", False),
            ("500", "paused", 40, "data_rebuild", "40", True),
            ("0", "COMPLETED", 100, "idle", "unknown", False),
        ):
            variables.return_value = Vars(
                mdResyncAction="recon D8", mdResyncPos=position
            )
            array_query.return_value = array.model_copy(
                update={
                    "parityCheckStatus": ParityCheck(status=status, progress=percent)
                }
            )
            await storage.async_refresh()
            kind_state, progress_state = (
                hass.states.get(kind_id),
                hass.states.get(progress_id),
            )
            assert kind_state is not None
            assert progress_state is not None
            assert kind_state.state == expected
            assert kind_state.attributes["action"] == "recon D8"
            assert kind_state.attributes["paused"] is paused
            assert progress_state.state == progress
            parity_state = hass.states.get(parity_id)
            assert parity_state is not None
            assert parity_state.state == str(percent)

        variables.side_effect = UnraidTimeoutError("Vars timed out")
        await storage.async_refresh()
        assert storage.last_update_success
        kind_state = hass.states.get(kind_id)
        assert kind_state is not None
        assert kind_state.state == "unknown"
        storage.async_set_updated_data(None)
        kind_state = hass.states.get(kind_id)
        assert kind_state is not None
        assert "action" not in kind_state.attributes
        assert await hass.config_entries.async_unload(entry.entry_id)


async def test_vm_observations_are_isolated_during_storage_outage(
    hass: HomeAssistant, mock_unraid_client_factory: MagicMock
) -> None:
    """Reset a VM's own streak during an outage without affecting another entry."""
    vm = VmDomain(id="vm:1", name="example", state="RUNNING")
    first_api = create_mock_unraid_client(server_info=make_server_info(uuid="first"))
    second_api = create_mock_unraid_client(server_info=make_server_info(uuid="second"))
    first_api.typed_get_vms.return_value = [vm]
    second_api.typed_get_vms.return_value = [vm]
    mock_unraid_client_factory.side_effect = [first_api, second_api]
    registry = er.async_get(hass)
    first = _entry(hass, "first", "first.example")

    with _patch_optional_startup():
        assert await hass.config_entries.async_setup(first.entry_id)
        second = _entry(hass, "second", "second.example")
        assert await hass.config_entries.async_setup(second.entry_id)
        await hass.async_block_till_done()
        first_system = first.runtime_data.system_coordinator
        first_storage = first.runtime_data.storage_coordinator
        second_system = second.runtime_data.system_coordinator
        first_ids = _vm_ids(registry, first)
        second_ids = _vm_ids(registry, second)
        assert len(first_ids) == 7
        assert len(second_ids) == 7

        first_api.typed_get_vms.return_value = []
        second_api.typed_get_vms.return_value = []
        for _ in range(2):
            await first_system.async_refresh()
            await second_system.async_refresh()

        first_api.typed_get_array.side_effect = UnraidConnectionError("Storage offline")
        await first_storage.async_refresh()
        assert not first_storage.last_update_success
        first_api.typed_get_vms.return_value = [vm]
        await first_system.async_refresh()
        first_api.typed_get_vms.return_value = []
        for _ in range(3):
            await first_system.async_refresh()
        assert _vm_ids(registry, first) == first_ids
        assert _vm_ids(registry, second) == second_ids

        await second_system.async_refresh()
        assert _vm_ids(registry, second) == {}
        assert _vm_ids(registry, first) == first_ids

        first_api.typed_get_array.side_effect = None
        await first_storage.async_refresh()
        await first_system.async_refresh()
        await first_system.async_refresh()
        assert _vm_ids(registry, first) == first_ids
        await first_system.async_refresh()
        assert _vm_ids(registry, first) == {}
        for entry in (first, second):
            assert await hass.config_entries.async_unload(entry.entry_id)


async def test_vm_recovers_only_pruned_entities(
    hass: HomeAssistant,
    mock_unraid_client: MagicMock,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Recover a VM when one button remains registered through partial pruning."""
    vm = VmDomain(id="vm:1", name="example", state="RUNNING")
    fetch = mock_unraid_client.typed_get_vms
    fetch.return_value = [vm]
    entry = _entry(hass, "test-uuid-123", "tower")
    registry = er.async_get(hass)

    with _patch_optional_startup():
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        system = entry.runtime_data.system_coordinator
        initial = _vm_ids(registry, entry)
        resource = "vm_reboot_example"
        reboot = registry.async_get(initial[resource])
        assert reboot is not None
        fetch.return_value = []
        await system.async_refresh()
        registry.async_remove(reboot.entity_id)
        await system.async_refresh()
        # Give this button its own absence streak by restoring it after two misses.
        survivor = registry.async_get_or_create(
            "button", DOMAIN, reboot.unique_id, config_entry=entry
        )
        await system.async_refresh()
        await hass.async_block_till_done()
        assert _vm_ids(registry, entry) == {resource: survivor.entity_id}

        fetch.return_value = [vm]
        await system.async_refresh()
        await hass.async_block_till_done()
        assert _vm_ids(registry, entry) == initial
        assert registry.async_get(survivor.entity_id) is survivor
        assert "already exists" not in caplog.text
        assert await hass.config_entries.async_unload(entry.entry_id)
