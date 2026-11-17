"""Stable VM entity identities and inventory selection."""

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

from unraid_api.models import VmDomain

from .entity_lifecycle import EntityLifecycle

if TYPE_CHECKING:
    from .entity_lifecycle import RegistryKey


class VmEntityKind(Enum):
    """Stable prefixes for entities associated with a VM."""

    SWITCH = ("switch", "vm_switch_")
    STATUS = ("sensor", "vm_status_")
    FORCE_STOP = ("button", "vm_force_stop_")
    REBOOT = ("button", "vm_reboot_")
    PAUSE = ("button", "vm_pause_")
    RESUME = ("button", "vm_resume_")
    RESET = ("button", "vm_reset_")

    def resource_id(self, name: str) -> str:
        """Build a resource ID from the exact VM name."""
        _, prefix = self.value
        return f"{prefix}{name}"

    def registry_key(self, server_prefix: str, name: str) -> RegistryKey:
        """Build the platform-scoped registry identity."""
        platform, _ = self.value
        return platform, f"{server_prefix}{self.resource_id(name)}"

    def matches(self, resource_id: str, platform: str | None) -> bool:
        """Identify registry entries for the VM entity kind."""
        domain, prefix = self.value
        return (
            (platform is None or platform == domain)
            and len(resource_id) > len(prefix)
            and resource_id.startswith(prefix)
        )


def is_vm_resource_id(resource_id: str, platform: str | None = None) -> bool:
    """Recognize only resource IDs used by per-VM entities."""
    return any(kind.matches(resource_id, platform) for kind in VmEntityKind)


class VmEntityLifecycle(EntityLifecycle[VmDomain]):
    """Select inventory and name keys for VM resources."""

    def __init__(self) -> None:
        """Track exact VM names."""
        super().__init__("VM", lambda data: data.vms, lambda vm: vm.name)
