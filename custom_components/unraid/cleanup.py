"""
Stale entity and device cleanup for the Unraid integration.

After every successful coordinator refresh, this module diffs the entity
registry against the current set of live resources and removes any entities
whose backing resource no longer exists on the Unraid server.

Design principles
-----------------
* **Safe-only pruning** — only entities whose ``unique_id`` matches a known
  dynamic resource pattern are ever removed.  Static entities (e.g.
  ``cpu_usage``, ``array_state``) are never touched.
* **Transient-failure guard** — cleanup is skipped when a coordinator's last
  update failed, preventing entity loss due to a momentary API or network
  error.
* **Empty-category guard** — an empty resource list caused by a failed
  optional query or initial startup window must not trigger a whole-category
  prune when registered entities exist.
* **Telemetry retention** — missing hardware temperature samples do not prove
  removal of a hardware sensor; its entity is retained through these gaps.
* **Device cleanup** — after entity removal, any HA device that has lost all
  its entities is also removed from the device registry.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .coordinator import UnraidStorageData, UnraidSystemData
from .docker_entities import DockerEntityKind, is_docker_resource_id
from .vm_entities import VmEntityKind, is_vm_resource_id

if TYPE_CHECKING:
    from collections.abc import Callable

    from homeassistant.core import HomeAssistant

    from .coordinator import (
        UnraidStorageCoordinator,
        UnraidSystemCoordinator,
    )
    from .docker_entities import DockerEntityLifecycle
    from .entity_lifecycle import RegistryKey
    from .vm_entities import VmEntityLifecycle

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class _InventoryObservation:
    """Registry identities from one successful resource inventory."""

    lifecycle: DockerEntityLifecycle | VmEntityLifecycle
    present: set[RegistryKey]
    matches: Callable[[str, str], bool]


# ---------------------------------------------------------------------------
# Transient-absence grace period
# ---------------------------------------------------------------------------

# Number of consecutive successful refreshes a dynamic resource may be absent
# from the coordinator data before its entities are removed. The Unraid API
# can transiently omit resources (UPS data in particular) from an otherwise
# successful response; removing entities on the first gap deletes healthy
# entities and breaks dashboards and automations until the integration is
# reloaded (#293).
_MISSING_STREAK_THRESHOLD: Final = 3

# Consecutive-missing counters, keyed by unique_id. Bounded by the number of
# dynamic entities across configured servers: entries are dropped when the
# resource reappears, when the entity is removed, or when it is no longer
# registered.
_missing_streaks: dict[str, int] = {}

# ---------------------------------------------------------------------------
# Dynamic-resource prefix detection
# ---------------------------------------------------------------------------

# Resource-id prefixes that are EXCLUSIVELY used for dynamic (per-resource)
# entities — i.e. every entity with one of these prefixes is bound to a live
# resource that may be removed.
#
# "disk_" covers all disk entities (disk_id_temp, disk_health_id, disk_spin_id).
# "share_" covers all share usage sensors.
# "ups_" covers all UPS sensor/binary_sensor entities.
# Hardware temperature entities are retained: telemetry is not hardware inventory.
_DYNAMIC_RESOURCE_ID_PREFIXES: Final[tuple[str, ...]] = (
    "disk_",  # all disk entities (all disk types and metrics)
    "share_",  # per-share usage sensor
    "ups_",  # all UPS sensor / binary_sensor entities
)

# Static resource ids that start with "network_" (and must not be cleaned up)
_STATIC_NETWORK_RESOURCE_IDS: Final[frozenset[str]] = frozenset({"network_access"})

# Network-metrics throughput sensors use resource_id = "network_{name}_{rx|tx}".
_NETWORK_METRICS_RESOURCE_ID_RE: Final = re.compile(
    r"^network_(?P<name>.+?)_(?:rx|tx)$"
)

# Network-interface state/speed/ip entities use "network_{name}_{link|speed|ip}".
# This pattern distinguishes them from the static "network_access" sensor.
_NETWORK_INTERFACE_RESOURCE_ID_RE: Final = re.compile(
    r"^network_(?P<name>.+?)_(?:link|speed|ip)$"
)


def _is_dynamic_resource_id(resource_id: str) -> bool:
    """
    Return True if *resource_id* belongs to a dynamic (per-resource) entity.

    The check is intentionally conservative: only patterns whose prefixes
    are exclusively used for dynamic resources are matched, so no static
    entity can ever be accidentally pruned.
    """
    # Standard dynamic prefixes (single startswith check via tuple)
    if resource_id.startswith(_DYNAMIC_RESOURCE_ID_PREFIXES):
        return True

    # Per-container stats/update sensors: container_{name}_{cpu|memory|...}
    # Only those NOT in the static allow-list count as dynamic.
    if is_docker_resource_id(resource_id) or is_vm_resource_id(resource_id):
        return True

    # Network-interface throughput and state sensors
    # Only those NOT in the static allow-list count as dynamic.
    return (
        resource_id.startswith("network_")
        and resource_id not in _STATIC_NETWORK_RESOURCE_IDS
        and bool(
            _NETWORK_METRICS_RESOURCE_ID_RE.match(resource_id)
            or _NETWORK_INTERFACE_RESOURCE_ID_RE.match(resource_id)
        )
    )


def _get_dynamic_resource_category(resource_id: str) -> str | None:
    """Return the resource category for dynamic entities, or None."""
    if is_docker_resource_id(resource_id):
        return "containers"
    if is_vm_resource_id(resource_id):
        return "vms"
    if resource_id.startswith(("ups_", "share_")):
        return "ups_devices" if resource_id.startswith("ups_") else "shares"
    if (
        resource_id.startswith("network_")
        and resource_id not in _STATIC_NETWORK_RESOURCE_IDS
    ):
        if bool(_NETWORK_METRICS_RESOURCE_ID_RE.match(resource_id)):
            return "network_metrics"
        if bool(_NETWORK_INTERFACE_RESOURCE_ID_RE.match(resource_id)):
            return "network_interfaces"
    return None


def _build_system_dynamic_unique_ids(
    pfx: str,
    sys_data: UnraidSystemData,
    *,
    include_inventories: bool,
) -> set[str]:
    """Return dynamic unique_ids from system coordinator data."""
    expected: set[str] = set()

    if include_inventories:
        for container in sys_data.containers or []:
            expected.update(
                f"{pfx}{kind.resource_id(container.name)}" for kind in DockerEntityKind
            )

        for vm in sys_data.vms or []:
            expected.update(
                f"{pfx}{kind.resource_id(vm.name)}" for kind in VmEntityKind
            )

    for ups in sys_data.ups_devices or []:
        for suffix in (
            "battery",
            "load",
            "runtime",
            "power",
            "energy",
            "input_voltage",
            "output_voltage",
            "battery_health",
            "status",
            "connected",
        ):
            expected.add(f"{pfx}ups_{ups.id}_{suffix}")

    for iface in sys_data.network_metrics or []:
        if iface.name is not None:
            expected.update(
                {
                    f"{pfx}network_{iface.name}_rx",
                    f"{pfx}network_{iface.name}_tx",
                }
            )

    for iface in sys_data.network_interfaces or []:
        if iface.name is not None:
            expected.update(
                {
                    f"{pfx}network_{iface.name}_link",
                    f"{pfx}network_{iface.name}_speed",
                    f"{pfx}network_{iface.name}_ip",
                }
            )

    return expected


def _build_storage_dynamic_unique_ids(
    pfx: str,
    stor_data: UnraidStorageData,
) -> set[str]:
    """Return dynamic unique_ids from storage coordinator data."""
    expected: set[str] = set()
    all_disks = list(stor_data.disks or [])
    all_disks.extend(stor_data.parities or [])
    all_disks.extend(stor_data.caches or [])
    if stor_data.boot is not None:
        all_disks.append(stor_data.boot)

    for disk in all_disks:
        if disk.id is None:
            continue
        expected.update(
            {
                f"{pfx}disk_{disk.id}_temp",
                f"{pfx}disk_{disk.id}_errors",
                f"{pfx}disk_{disk.id}_usage",
                f"{pfx}disk_health_{disk.id}",
                f"{pfx}disk_spin_{disk.id}",
                f"{pfx}disk_{disk.id}_clear_statistics",
            }
        )

    for share in stor_data.shares or []:
        if share.id is not None:
            expected.add(f"{pfx}share_{share.id}_usage")

    return expected


# ---------------------------------------------------------------------------
# Expected unique-id computation
# ---------------------------------------------------------------------------


def build_expected_dynamic_unique_ids(
    server_uuid: str,
    sys_data: UnraidSystemData,
    stor_data: UnraidStorageData,
    *,
    include_inventories: bool = True,
) -> frozenset[str]:
    """
    Return every unique_id that *should* exist for dynamic resources.

    Args:
        server_uuid: The Unraid server UUID used as the unique_id prefix.
        sys_data:    Latest snapshot from the system coordinator.
        stor_data:   Latest snapshot from the storage coordinator.
        include_inventories: Include containers and VMs.

    Returns:
        Frozenset of ``"{server_uuid}_{resource_id}"`` strings for all dynamic
        resources that are currently alive.

    """
    pfx = f"{server_uuid}_"
    expected = _build_system_dynamic_unique_ids(
        pfx, sys_data, include_inventories=include_inventories
    )
    expected.update(_build_storage_dynamic_unique_ids(pfx, stor_data))
    return frozenset(expected)


# ---------------------------------------------------------------------------
# Entity inspection & candidate collection
# ---------------------------------------------------------------------------


def _collect_stale_dynamic_entities(
    entry_id: str,
    server_uuid_prefix: str,
    registered: list[er.RegistryEntry],
    expected: frozenset[str],
    failed_categories: set[str],
    observations: dict[str, _InventoryObservation],
    storage_ready: bool,
) -> tuple[list[er.RegistryEntry], set[str]]:
    """Inspect registered entities and collect candidates for removal."""
    orphans: list[er.RegistryEntry] = []
    present_uids: set[str] = set()
    skipped_categories: set[str] = set()

    for entity_entry in registered:
        uid = entity_entry.unique_id
        if not uid.startswith(server_uuid_prefix):
            # Entity belongs to a different server (multi-instance setups).
            continue

        resource_id = uid[len(server_uuid_prefix) :]

        if not _is_dynamic_resource_id(resource_id):
            # Static entity — never prune.
            continue

        category = _get_dynamic_resource_category(resource_id)
        if category in ("containers", "vms"):
            observation = observations.get(category)
            platform = entity_entry.entity_id.partition(".")[0]
            if observation is None or not observation.matches(resource_id, platform):
                continue
            lifecycle = observation.lifecycle
            key = (platform, uid)
            if key in observation.present:
                lifecycle.entity_seen(key)
            elif storage_ready and lifecycle.is_stale(key, _MISSING_STREAK_THRESHOLD):
                orphans.append(entity_entry)
            continue
        if not storage_ready:
            continue

        if category and category in failed_categories:
            if category not in skipped_categories:
                _LOGGER.info(
                    "Skipping %s entity cleanup for entry %s: query for %s failed",
                    category,
                    entry_id,
                    category,
                )
                skipped_categories.add(category)
            present_uids.add(uid)
            continue

        if uid in expected:
            present_uids.add(uid)
            continue

        # Dynamic entity whose resource is absent from this refresh. Only
        # remove it after it has been missing for several consecutive
        # successful refreshes, so a transient API gap does not delete it.
        streak = _missing_streaks.get(uid, 0) + 1
        _missing_streaks[uid] = streak
        if streak < _MISSING_STREAK_THRESHOLD:
            _LOGGER.debug(
                "Entity %s (unique_id=%s) missing for %d consecutive refresh(es) "
                "for entry %s; deferring removal until %d",
                entity_entry.entity_id,
                uid,
                streak,
                entry_id,
                _MISSING_STREAK_THRESHOLD,
            )
            continue
        orphans.append(entity_entry)

    return orphans, present_uids


def _collect_inventory_observations(
    system_coordinator: UnraidSystemCoordinator,
    sys_data: UnraidSystemData,
    server_prefix: str,
    failed_categories: set[str],
) -> dict[str, _InventoryObservation]:
    """Prepare registry keys only when a fresh, successful inventory arrives."""
    observations: dict[str, _InventoryObservation] = {}
    for category, lifecycle, generation, resources, kinds, matches in (
        (
            "containers",
            system_coordinator.docker_entities,
            sys_data.docker_inventory_generation,
            sys_data.containers,
            DockerEntityKind,
            is_docker_resource_id,
        ),
        (
            "vms",
            system_coordinator.vm_entities,
            sys_data.vm_inventory_generation,
            sys_data.vms,
            VmEntityKind,
            is_vm_resource_id,
        ),
    ):
        if lifecycle.begin_observation(
            generation, successful=category not in failed_categories
        ):
            observations[category] = _InventoryObservation(
                lifecycle,
                {
                    kind.registry_key(server_prefix, resource.name)
                    for resource in resources
                    for kind in kinds
                },
                matches,
            )
    return observations


def _retain_streaks(
    registered: list[er.RegistryEntry],
    present_uids: set[str],
    observations: dict[str, _InventoryObservation],
    *,
    storage_ready: bool,
) -> None:
    """Drop counters for resources that returned or no longer have entries."""
    if storage_ready:
        registered_uids = {entry.unique_id for entry in registered}
        for removed in _missing_streaks.keys() - (registered_uids - present_uids):
            _missing_streaks.pop(removed)

    if observations:
        registered_keys = {
            (entity.entity_id.partition(".")[0], entity.unique_id)
            for entity in registered
        }
        for observation in observations.values():
            observation.lifecycle.retain_streaks(registered_keys)


def async_cleanup_stale_entities(
    hass: HomeAssistant,
    entry_id: str,
    server_uuid: str,
    system_coordinator: UnraidSystemCoordinator,
    storage_coordinator: UnraidStorageCoordinator,
) -> None:
    """
    Remove orphaned entities and empty devices for a config entry.

    Should be called after every successful coordinator refresh. The function
    is synchronous (``async_`` prefix follows HA convention for callbacks that
    run inside the event loop but do not need to be awaited).

    Args:
        hass:                 Home Assistant instance.
        entry_id:             Config entry ID to inspect.
        server_uuid:          Unraid server UUID (unique_id prefix).
        system_coordinator:   System data coordinator.
        storage_coordinator:  Storage data coordinator.

    """
    # A failed system update cannot supply a new inventory observation.
    if not system_coordinator.last_update_success:
        _LOGGER.debug(
            "Cleanup skipped for entry %s: system coordinator last update failed",
            entry_id,
        )
        return
    sys_data = system_coordinator.data
    stor_data = storage_coordinator.data

    if not isinstance(sys_data, UnraidSystemData):
        _LOGGER.debug(
            "Cleanup skipped for entry %s: system coordinator data not ready",
            entry_id,
        )
        return
    storage_ready = storage_coordinator.last_update_success and isinstance(
        stor_data, UnraidStorageData
    )
    # Docker and VM inventories still record presence during a storage outage.
    # All deletion requires healthy data from both coordinators.
    expected = (
        build_expected_dynamic_unique_ids(
            server_uuid, sys_data, stor_data, include_inventories=False
        )
        if storage_ready and isinstance(stor_data, UnraidStorageData)
        else frozenset()
    )

    failed_categories: set[str] = set()
    for coordinator in (system_coordinator, storage_coordinator):
        statuses = getattr(coordinator, "optional_query_status", {})
        if isinstance(statuses, dict):
            failed_categories.update(
                cat for cat, success in statuses.items() if not success
            )

    server_prefix = f"{server_uuid}_"
    observations = _collect_inventory_observations(
        system_coordinator, sys_data, server_prefix, failed_categories
    )
    if not storage_ready and not observations:
        return

    # Collect registered entities for this config entry.
    ent_reg = er.async_get(hass)
    registered = er.async_entries_for_config_entry(ent_reg, entry_id)

    orphans, present_uids = _collect_stale_dynamic_entities(
        entry_id=entry_id,
        server_uuid_prefix=server_prefix,
        registered=registered,
        expected=expected,
        failed_categories=failed_categories,
        observations=observations,
        storage_ready=storage_ready,
    )

    _retain_streaks(registered, present_uids, observations, storage_ready=storage_ready)

    if not orphans:
        return

    _LOGGER.info(
        "Removing %d stale %s for entry %s",
        len(orphans),
        "entity" if len(orphans) == 1 else "entities",
        entry_id,
    )
    for entity_entry in orphans:
        _LOGGER.debug(
            "Removing stale entity %s (unique_id=%s)",
            entity_entry.entity_id,
            entity_entry.unique_id,
        )
        _missing_streaks.pop(entity_entry.unique_id, None)
        ent_reg.async_remove(entity_entry.entity_id)
        category = _get_dynamic_resource_category(
            entity_entry.unique_id[len(server_prefix) :]
        )
        if category is not None and (observation := observations.get(category)):
            observation.lifecycle.entity_removed(
                (entity_entry.entity_id.partition(".")[0], entity_entry.unique_id)
            )

    # Remove any devices that are now empty after entity removal.
    _async_remove_orphaned_devices(hass, entry_id)


def _async_remove_orphaned_devices(hass: HomeAssistant, entry_id: str) -> None:
    """Remove devices that have no entities remaining for *entry_id*."""
    dev_reg = dr.async_get(hass)
    ent_reg = er.async_get(hass)

    devices_for_entry = dr.async_entries_for_config_entry(dev_reg, entry_id)
    for device_entry in devices_for_entry:
        remaining = er.async_entries_for_device(
            ent_reg, device_entry.id, include_disabled_entities=True
        )
        if not remaining:
            _LOGGER.debug(
                "Removing empty device %s (%s)",
                device_entry.name,
                device_entry.id,
            )
            dev_reg.async_remove_device(device_entry.id)
