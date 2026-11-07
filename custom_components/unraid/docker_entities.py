"""Discover Docker entities and track their absence across fresh observations."""

from __future__ import annotations

import logging
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Callable

    from homeassistant.helpers.entity import Entity
    from unraid_api.models import DockerContainer

    from .coordinator import UnraidSystemCoordinator

_LOGGER = logging.getLogger(__name__)

type DockerRegistryKey = tuple[str, str]


def container_name(name: str) -> str:
    """Return the stable Docker entity key."""
    return name.lstrip("/")


class DockerEntityKind(Enum):
    """Stable prefixes and suffixes used by Docker factories and cleanup."""

    SWITCH = ("switch", "container_switch_", "")
    AUTOSTART = ("switch", "container_autostart_", "")
    RESTART = ("button", "container_restart_", "")
    PAUSE = ("button", "container_pause_", "")
    UNPAUSE = ("button", "container_unpause_", "")
    UPDATE = ("update", "container_update_", "")
    CPU = ("sensor", "container_", "_cpu")
    MEMORY = ("sensor", "container_", "_memory")
    MEMORY_PCT = ("sensor", "container_", "_memory_pct")
    MEMORY_USED = ("sensor", "container_", "_memory_used")
    MEMORY_LIMIT = ("sensor", "container_", "_memory_limit")
    LEGACY_UPDATE = ("binary_sensor", "container_", "_update")

    def resource_id(self, name: str) -> str:
        """Build the resource ID for a container."""
        _, prefix, suffix = self.value
        return f"{prefix}{container_name(name)}{suffix}"

    def registry_key(self, server_prefix: str, name: str) -> DockerRegistryKey:
        """Build the platform-scoped registry identity."""
        platform, _, _ = self.value
        return platform, f"{server_prefix}{self.resource_id(name)}"

    def matches(self, resource_id: str, platform: str | None) -> bool:
        """Identify registry entries for this kind, including old entries."""
        domain, prefix, suffix = self.value
        return (
            (platform is None or platform == domain)
            and len(resource_id) > len(prefix) + len(suffix)
            and resource_id.startswith(prefix)
            and resource_id.endswith(suffix)
        )


def is_docker_resource_id(resource_id: str, platform: str | None = None) -> bool:
    """Recognize Docker resource IDs without matching aggregate entities."""
    return any(kind.matches(resource_id, platform) for kind in DockerEntityKind)


class DockerEntityLifecycle:
    """Own discovery and absence state for one config entry."""

    def __init__(self) -> None:
        """Initialize discovery and absence tracking."""
        self._platforms: dict[object, dict[str, frozenset[DockerRegistryKey]]] = {}
        self._observation = 0
        self._missing: dict[DockerRegistryKey, int] = {}

    def async_register_platform(
        self,
        coordinator: UnraidSystemCoordinator,
        async_add_entities: Callable[[list[Entity]], None],
        create_entities: Callable[[DockerContainer], list[Entity]],
        *,
        platform: str,
    ) -> Callable[[], None]:
        """Create entities on discovery and return the listener unsubscriber."""
        known: dict[str, frozenset[DockerRegistryKey]] = {}
        registration = object()
        self._platforms[registration] = known

        def sync() -> None:
            data = coordinator.data
            if data is None:
                return
            pending: list[Entity] = []
            discovered: dict[str, frozenset[DockerRegistryKey]] = {}
            for container in data.containers:
                key = container_name(container.name)
                if key in known or key in discovered:
                    continue
                try:
                    entities = create_entities(container)
                except Exception:
                    _LOGGER.exception("Failed to create Docker entities for %s", key)
                    continue
                pending.extend(entities)
                discovered[key] = frozenset(
                    (platform, uid)
                    for entity in entities
                    if (uid := entity.unique_id) is not None
                )
            if pending:
                async_add_entities(pending)
                known.update(discovered)

        sync()
        unsubscribe = coordinator.async_add_listener(sync)

        def remove_listener() -> None:
            unsubscribe()
            self._platforms.pop(registration, None)

        return remove_listener

    def begin_observation(self, generation: int, *, successful: bool) -> bool:
        """Accept a successful inventory generation once for cleanup."""
        if not successful or generation <= self._observation:
            return False
        self._observation = generation
        return True

    def entity_seen(self, key: DockerRegistryKey) -> None:
        """Reset absence evidence when the resource reappears."""
        self._missing.pop(key, None)

    def is_stale(self, key: DockerRegistryKey, threshold: int) -> bool:
        """Count one fresh absence of a registered entity."""
        streak = self._missing.get(key, 0) + 1
        self._missing[key] = streak
        return streak >= threshold

    def retain_streaks(self, registered: set[DockerRegistryKey]) -> None:
        """Drop absence counters for entities no longer registered."""
        for uid in self._missing.keys() - registered:
            self._missing.pop(uid)

    def entity_removed(self, key: DockerRegistryKey) -> None:
        """Allow platforms to rediscover an entity after registry pruning."""
        self._missing.pop(key, None)
        for known in self._platforms.values():
            for name, ids in list(known.items()):
                if key in ids:
                    del known[name]
