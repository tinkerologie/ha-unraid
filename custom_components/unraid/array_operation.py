"""Classify the array operation from one storage refresh."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from unraid_api.models import ParityCheck, Vars


class ArrayOperationKind(StrEnum):
    """Kinds of array work shown by the Unraid WebGUI."""

    IDLE = "idle"
    PARITY_CHECK = "parity_check"
    READ_CHECK = "read_check"
    PARITY_SYNC = "parity_sync"
    DATA_REBUILD = "data_rebuild"
    DISK_CLEAR = "disk_clear"
    OTHER = "other"


def _classify(position: str | None, action: str | None) -> ArrayOperationKind | None:
    """Use the position to distinguish active work from a stale action."""
    if position is None:
        return None
    try:
        active = int(position) > 0
    except ValueError:
        return None
    if not active:
        return ArrayOperationKind.IDLE

    # Match the WebGUI action tokens. The first parity target distinguishes sync.
    tokens = (action or "").split()
    match tokens:
        case ["recon", "P", *_]:
            kind = ArrayOperationKind.PARITY_SYNC
        case ["recon", *_]:
            kind = ArrayOperationKind.DATA_REBUILD
        case ["check"]:
            kind = ArrayOperationKind.READ_CHECK
        case ["check", _, *_]:
            kind = ArrayOperationKind.PARITY_CHECK
        case ["clear", *_]:
            kind = ArrayOperationKind.DISK_CLEAR
        case _:
            kind = ArrayOperationKind.OTHER
    return kind


@dataclass(frozen=True, slots=True)
class ArrayOperation:
    """Operation classification and allowlisted data for diagnostics."""

    kind: ArrayOperationKind | None = None
    action: str | None = None
    paused: bool | None = None
    progress: int | None = None
    md_resync_pos: str | None = None
    md_resync: int | None = None
    md_state: str | None = None

    @classmethod
    def from_snapshot(
        cls, variables: Vars | None, parity: ParityCheck | None
    ) -> ArrayOperation:
        """Classify typed Vars and take progress from the same storage refresh."""
        if variables is None:
            return cls()

        kind = _classify(variables.md_resync_pos, variables.md_resync_action)
        paused = None
        progress = None
        if kind is ArrayOperationKind.IDLE:
            paused = False
        elif kind is not None and parity and parity.is_running:
            # The array read can still describe a finished job when Vars sees a new one.
            paused = (parity.status or "").casefold() == "paused"
            progress = parity.progress
        return cls(
            kind=kind,
            action=variables.md_resync_action,
            paused=paused,
            progress=progress,
            md_resync_pos=variables.md_resync_pos,
            md_resync=variables.md_resync,
            md_state=variables.md_state,
        )
