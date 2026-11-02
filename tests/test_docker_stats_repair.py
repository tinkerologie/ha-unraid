"""A repair issue reports stopped Docker statistics."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant.common import MockConfigEntry

from custom_components.unraid import (
    _async_update_docker_stats_issue,
    _docker_stats_consumers_enabled,
)
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
    entry.runtime_data.server_info = {"uuid": f"{name}-uuid"}
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


async def test_no_statistics_consumers_suppresses_repair(
    hass: HomeAssistant, issue_registry: ir.IssueRegistry
) -> None:
    """A silent stream is irrelevant when no statistics sensors are enabled."""
    entry = _entry(hass, "tower", stalled=False)
    manager = _manager((True,))
    entry.runtime_data.websocket_manager = manager
    entry.runtime_data.server_info = {"uuid": "tower-uuid"}

    with patch(_MONOTONIC, return_value=manager._stats_quiet_since + 600):
        _async_update_docker_stats_issue(hass, entry)

    assert (
        issue_registry.async_get_issue(
            DOMAIN, docker_stats_stalled_issue_id(entry.entry_id)
        )
        is None
    )


@pytest.mark.parametrize(
    "resource",
    [
        "docker_total_cpu",
        "docker_total_memory_pct",
        "docker_total_memory_bytes",
        "container_plex_cpu",
        "container_plex_memory",
        "container_plex_memory_pct",
        "container_plex_memory_used",
        "container_plex_memory_limit",
        "container_my_media_server_cpu",
        "container_cpu_memory_pct_memory_used",
    ],
)
async def test_enabled_statistics_sensor_is_a_consumer(
    hass: HomeAssistant, resource: str
) -> None:
    """Match all stats sensors, including names and identities with underscores."""
    entry = _entry(hass, "tower", stalled=False)
    entry.runtime_data.server_info["uuid"] = "placeholder_uuid_tower_name"
    registry = er.async_get(hass)
    sensor = registry.async_get_or_create(
        "sensor",
        DOMAIN,
        f"placeholder_uuid_tower_name_{resource}",
        config_entry=entry,
    )
    # A user's entity ID has no bearing on statistics consumption.
    registry.async_update_entity(sensor.entity_id, new_entity_id="sensor.renamed")
    assert _docker_stats_consumers_enabled(hass, entry) is True


@pytest.mark.parametrize(
    "disabled_by", [er.RegistryEntryDisabler.USER, er.RegistryEntryDisabler.INTEGRATION]
)
async def test_disabled_statistics_sensors_are_not_consumers(
    hass: HomeAssistant, disabled_by: er.RegistryEntryDisabler
) -> None:
    """Any disabler excludes otherwise matching aggregate and container sensors."""
    entry = _entry(hass, "tower", stalled=False)
    registry = er.async_get(hass)
    for resource in ("docker_total_cpu", "container_plex_memory"):
        sensor = registry.async_get_or_create(
            "sensor", DOMAIN, f"tower-uuid_{resource}", config_entry=entry
        )
        registry.async_update_entity(sensor.entity_id, disabled_by=disabled_by)
    assert _docker_stats_consumers_enabled(hass, entry) is False


@pytest.mark.parametrize(
    ("domain", "platform", "unique_id"),
    [
        ("switch", DOMAIN, "tower-uuid_container_switch_plex"),
        ("switch", DOMAIN, "tower-uuid_container_autostart_plex"),
        ("update", DOMAIN, "tower-uuid_container_plex"),
        ("binary_sensor", DOMAIN, "tower-uuid_container_plex_update"),
        ("sensor", DOMAIN, "tower-uuid_container_updates_count"),
        ("sensor", DOMAIN, "tower-uuid_containers_running"),
        ("sensor", DOMAIN, "tower-uuid_cpu_usage"),
        ("sensor", DOMAIN, "tower-uuid_vm_plex_cpu"),
        ("sensor", DOMAIN, "tower-uuid_docker_total_cpu_extra"),
        ("sensor", DOMAIN, "tower-uuid_container__cpu"),
        ("sensor", DOMAIN, "tower-uuid_container__memory_pct"),
        ("sensor", DOMAIN, "tower-uuid_container_plex_cpu_extra"),
        ("sensor", DOMAIN, "other-uuid_docker_total_cpu"),
        ("sensor", "other", "tower-uuid_docker_total_cpu"),
        ("switch", DOMAIN, "tower-uuid_container_plex_cpu"),
    ],
)
async def test_unrelated_entities_are_not_statistics_consumers(
    hass: HomeAssistant, domain: str, platform: str, unique_id: str
) -> None:
    """Only exact statistics identities in this integration's sensors qualify."""
    entry = _entry(hass, "tower", stalled=False)
    er.async_get(hass).async_get_or_create(
        domain, platform, unique_id, config_entry=entry
    )
    assert _docker_stats_consumers_enabled(hass, entry) is False


async def test_statistics_consumers_are_scoped_to_config_entry(
    hass: HomeAssistant,
) -> None:
    """Another config entry's consumer cannot make this entry eligible."""
    tower = _entry(hass, "tower", stalled=False)
    other = _entry(hass, "other", stalled=False)
    # Even a matching UUID cannot cross the config-entry ownership boundary.
    other.runtime_data.server_info = tower.runtime_data.server_info
    er.async_get(hass).async_get_or_create(
        "sensor", DOMAIN, "tower-uuid_docker_total_cpu", config_entry=other
    )
    assert _docker_stats_consumers_enabled(hass, tower) is False
    assert _docker_stats_consumers_enabled(hass, other) is True


def _monitored_entry(
    hass: HomeAssistant, name: str
) -> tuple[MockConfigEntry, er.RegistryEntry, UnraidWebSocketManager]:
    """Use real registries and a real detector with silent, running inventory."""
    entry = _entry(hass, name, stalled=False)
    manager = _manager((True,))
    entry.runtime_data.websocket_manager = manager
    sensor = er.async_get(hass).async_get_or_create(
        "sensor", DOMAIN, f"{name}-uuid_docker_total_cpu", config_entry=entry
    )
    return entry, sensor, manager


async def test_disabling_last_consumer_clears_repair_and_reenable_restarts_timer(
    hass: HomeAssistant, issue_registry: ir.IssueRegistry
) -> None:
    """Disabling clears the latch; re-enabling needs a full new quiet window."""
    entry, sensor, manager = _monitored_entry(hass, "tower")
    registry = er.async_get(hass)
    issue_id = docker_stats_stalled_issue_id(entry.entry_id)
    start = manager._stats_quiet_since

    with patch(_MONOTONIC, return_value=start + 299):
        _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is None
    with patch(_MONOTONIC, return_value=start + 300):
        _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is not None

    registry.async_update_entity(
        sensor.entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )
    with patch(_MONOTONIC, return_value=start + 360):
        _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is None
    assert manager._stats_stalled is False

    registry.async_update_entity(sensor.entity_id, disabled_by=None)
    for seconds in (420, 719):
        with patch(_MONOTONIC, return_value=start + seconds):
            _async_update_docker_stats_issue(hass, entry)
        assert issue_registry.async_get_issue(DOMAIN, issue_id) is None
    with patch(_MONOTONIC, return_value=start + 720):
        _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is not None


@pytest.mark.parametrize("cause", ["outage", "inventory", "stopped", "no_data"])
async def test_disabling_consumers_clears_repair_without_inventory_evidence(
    hass: HomeAssistant, issue_registry: ir.IssueRegistry, cause: str
) -> None:
    """No consumers clears a proven stall even while evidence is unavailable."""
    entry, sensor, manager = _monitored_entry(hass, "tower")
    issue_id = docker_stats_stalled_issue_id(entry.entry_id)
    with patch(_MONOTONIC, return_value=manager._stats_quiet_since + 300):
        _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is not None

    coordinator = manager._system_coordinator
    coordinator.last_update_success = cause != "outage"
    coordinator.optional_query_status["containers"] = cause != "inventory"
    manager._running = cause != "stopped"
    if cause == "no_data":
        coordinator.data = None
    # Missing evidence alone must preserve the repair for enabled consumers.
    _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is not None

    er.async_get(hass).async_update_entity(
        sensor.entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )
    _async_update_docker_stats_issue(hass, entry)
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is None
    assert manager._stats_stalled is False


async def test_real_consumer_states_give_independent_repairs(
    hass: HomeAssistant, issue_registry: ir.IssueRegistry
) -> None:
    """A disabled server stays quiet while an enabled server reports its stall."""
    tower, sensor, manager = _monitored_entry(hass, "tower")
    other, _, other_manager = _monitored_entry(hass, "other")
    er.async_get(hass).async_update_entity(
        sensor.entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )
    with patch(
        _MONOTONIC,
        return_value=max(manager._stats_quiet_since, other_manager._stats_quiet_since)
        + 300,
    ):
        _async_update_docker_stats_issue(hass, tower)
        _async_update_docker_stats_issue(hass, other)
    assert (
        issue_registry.async_get_issue(
            DOMAIN, docker_stats_stalled_issue_id(tower.entry_id)
        )
        is None
    )
    assert (
        issue_registry.async_get_issue(
            DOMAIN, docker_stats_stalled_issue_id(other.entry_id)
        )
        is not None
    )
