"""Check Unraid array operation classification and progress."""

from __future__ import annotations

import pytest
from unraid_api.models import ParityCheck, Vars

from custom_components.unraid.array_operation import ArrayOperation


@pytest.mark.parametrize(
    ("action", "position", "kind"),
    [
        ("recon D8", "1", "data_rebuild"),
        ("recon P Q", "2", "parity_sync"),
        ("check P Q", "2", "parity_check"),
        ("check", "2", "read_check"),
        ("clear D2", "2", "disk_clear"),
        ("unrecognized", "2", "other"),
        (None, "2", "other"),
        ("check P", "0", "idle"),
        ("check P", "-2", "idle"),
        ("check P", "invalid", None),
        ("check P", None, None),
    ],
)
def test_classify_array_operation(
    action: str | None, position: str | None, kind: str | None
) -> None:
    """Classify the WebGUI tokens only when the resync position is positive."""
    snapshot = ArrayOperation.from_snapshot(
        Vars(mdResyncAction=action, mdResyncPos=position),
        ParityCheck(status="pAuSeD", progress=0),
    )
    assert snapshot.kind == kind
    assert snapshot.action == action
    if kind == "idle":
        assert snapshot.progress is None
        assert snapshot.paused is False
    elif kind is None:
        assert snapshot.progress is None
        assert snapshot.paused is None
    else:
        assert snapshot.progress == 0
        assert snapshot.paused is True


def test_operation_is_known_with_missing_parity_status() -> None:
    """Keep the operation kind when the array has no progress or pause state."""
    variables = Vars(mdResyncAction="clear", mdResyncPos="1")
    for parity in (None, ParityCheck(progress=100)):
        snapshot = ArrayOperation.from_snapshot(variables, parity)
        assert snapshot.kind == "disk_clear"
        assert snapshot.progress is None
        assert snapshot.paused is None


def test_operation_is_unknown_without_vars() -> None:
    """Omit a finished or active percentage when the action cannot be classified."""
    assert (
        ArrayOperation.from_snapshot(None, ParityCheck(status="RUNNING", progress=35))
        == ArrayOperation()
    )
