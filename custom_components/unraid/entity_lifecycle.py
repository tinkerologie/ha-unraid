"""Discover entities and count absences across successful inventories."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable

    from homeassistant.helpers.entity import Entity

    from .coordinator import UnraidSystemCoordinator, UnraidSystemData

_LOGGER = logging.getLogger(__name__)

type RegistryKey = tuple[str, str]


class EntityLifecycle[ResourceT]:
    """Own discovery and absence state for one config entry."""

    def __init__(
        self,
        resource_type: str,
        get_resources: Callable[[UnraidSystemData], Iterable[ResourceT]],
        get_name: Callable[[ResourceT], str],
    ) -> None:
        """Initialize discovery and absence tracking."""
        self._resource_type = resource_type
        self._get_resources = get_resources
        self._get_name = get_name
        self._platforms: dict[
            object, tuple[dict[str, frozenset[RegistryKey]], set[str]]
        ] = {}
        self._observation = 0
        self._missing: dict[RegistryKey, int] = {}

    def async_register_platform(
        self,
        coordinator: UnraidSystemCoordinator,
        async_add_entities: Callable[[list[Entity]], None],
        create_entities: Callable[[ResourceT], list[Entity]],
        *,
        platform: str,
    ) -> Callable[[], None]:
        """Create entities on discovery and return the listener unsubscriber."""
        known: dict[str, frozenset[RegistryKey]] = {}
        rediscover: set[str] = set()
        registration = object()
        self._platforms[registration] = (known, rediscover)

        def sync() -> None:
            data = coordinator.data
            if data is None:
                return
            pending: list[Entity] = []
            discovered: dict[str, frozenset[RegistryKey]] = {}
            for resource in self._get_resources(data):
                key = self._get_name(resource)
                if (key in known and key not in rediscover) or key in discovered:
                    continue
                try:
                    entities = create_entities(resource)
                except Exception:
                    _LOGGER.exception(
                        "Failed to create %s entities for %s", self._resource_type, key
                    )
                    continue
                existing = known.get(key, frozenset())
                pending.extend(
                    entity
                    for entity in entities
                    if (platform, entity.unique_id) not in existing
                )
                discovered[key] = existing.union(
                    (platform, uid)
                    for entity in entities
                    if (uid := entity.unique_id) is not None
                )
            if pending:
                async_add_entities(pending)
            known.update(discovered)
            rediscover.difference_update(discovered)

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

    def entity_seen(self, key: RegistryKey) -> None:
        """Reset absence evidence when the resource reappears."""
        self._missing.pop(key, None)

    def is_stale(self, key: RegistryKey, threshold: int) -> bool:
        """Count one fresh absence of a registered entity."""
        streak = self._missing.get(key, 0) + 1
        self._missing[key] = streak
        return streak >= threshold

    def retain_streaks(self, registered: set[RegistryKey]) -> None:
        """Drop absence counters for entities no longer registered."""
        for uid in self._missing.keys() - registered:
            self._missing.pop(uid)

    def entity_removed(self, key: RegistryKey) -> None:
        """Allow platforms to rediscover an entity after registry pruning."""
        self._missing.pop(key, None)
        for known, rediscover in self._platforms.values():
            for name, ids in tuple(known.items()):
                if key not in ids:
                    continue
                if remaining := ids.difference((key,)):
                    known[name] = remaining
                    rediscover.add(name)
                else:
                    del known[name]
                    rediscover.discard(name)
