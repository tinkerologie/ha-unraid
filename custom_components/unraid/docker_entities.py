"""Stable Docker entity identities and inventory selection."""

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

from unraid_api.models import DockerContainer

from .entity_lifecycle import EntityLifecycle

if TYPE_CHECKING:
    from .entity_lifecycle import RegistryKey


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

    def registry_key(self, server_prefix: str, name: str) -> RegistryKey:
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


class DockerEntityLifecycle(EntityLifecycle[DockerContainer]):
    """Select inventory and name keys for Docker resources."""

    def __init__(self) -> None:
        """Track Docker names without their leading slash."""
        super().__init__(
            "Docker",
            lambda data: data.containers,
            lambda container: container_name(container.name),
        )
