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


def container_name(name: str) -> str:
    """Return the stable Docker entity key."""
    return name.lstrip("/")


class DockerEntityKind(Enum):
    """Stable prefixes and suffixes used by Docker factories and cleanup."""

    SWITCH = ("container_switch_", "")
    AUTOSTART = ("container_autostart_", "")
    RESTART = ("container_restart_", "")
    PAUSE = ("container_pause_", "")
    UNPAUSE = ("container_unpause_", "")
    UPDATE = ("container_update_", "")
    CPU = ("container_", "_cpu")
    MEMORY = ("container_", "_memory")
    MEMORY_PCT = ("container_", "_memory_pct")
    MEMORY_USED = ("container_", "_memory_used")
    MEMORY_LIMIT = ("container_", "_memory_limit")
    LEGACY_UPDATE = ("container_", "_update")

    def resource_id(self, name: str) -> str:
        """Build the resource ID for a container."""
        prefix, suffix = self.value
        return f"{prefix}{container_name(name)}{suffix}"

    def matches(self, resource_id: str) -> bool:
        """Identify registry entries for this kind, including old entries."""
        prefix, suffix = self.value
        return (
            len(resource_id) > len(prefix) + len(suffix)
            and resource_id.startswith(prefix)
            and resource_id.endswith(suffix)
        )


def is_docker_resource_id(resource_id: str) -> bool:
    """Recognize Docker resource IDs without matching aggregate entities."""
    return any(kind.matches(resource_id) for kind in DockerEntityKind)


class DockerEntityLifecycle:
    """Own discovery and absence state for one config entry."""

    def __init__(self) -> None:
        """Initialize discovery and absence tracking."""
        self._platforms: dict[object, dict[str, frozenset[str]]] = {}
        self._observation = 0
        self._missing: dict[str, int] = {}

    def async_register_platform(
        self,
        coordinator: UnraidSystemCoordinator,
        async_add_entities: Callable[[list[Entity]], None],
        create_entities: Callable[[DockerContainer], list[Entity]],
    ) -> Callable[[], None]:
        """Create entities on discovery and return the listener unsubscriber."""
        known: dict[str, frozenset[str]] = {}
        registration = object()
        self._platforms[registration] = known

        def sync() -> None:
            data = coordinator.data
            if data is None:
                return
            pending: list[Entity] = []
            discovered: dict[str, frozenset[str]] = {}
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
                    uid for entity in entities if (uid := entity.unique_id) is not None
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

    def is_stale(self, unique_id: str, threshold: int) -> bool:
        """Count one fresh absence of a registered entity."""
        streak = self._missing.get(unique_id, 0) + 1
        self._missing[unique_id] = streak
        return streak >= threshold

    def retain_streaks(self, registered: set[str], present: set[str]) -> None:
        """Drop absence counters for resources seen again or removed."""
        for uid in self._missing.keys() - (registered - present):
            self._missing.pop(uid)

    def entity_removed(self, unique_id: str) -> None:
        """Allow platforms to rediscover an entity after registry pruning."""
        self._missing.pop(unique_id, None)
        for known in self._platforms.values():
            for name, ids in list(known.items()):
                if unique_id in ids:
                    del known[name]
