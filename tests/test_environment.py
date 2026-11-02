"""Protect newer development instances from the pinned test baseline."""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from importlib.metadata import PackageNotFoundError
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "check_test_baseline", ROOT / "script/check_test_baseline.py"
)
assert SPEC is not None
assert SPEC.loader is not None
baseline = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(baseline)


def _project(tmp_path: Path, pins: list[str]) -> Path:
    project = tmp_path / "pyproject.toml"
    project.write_text(f"[project.optional-dependencies]\ntest = {pins!r}\n")
    return project


@pytest.mark.parametrize("installed", ["2026.10.4", "2026.11.0b1"])
def test_allows_older_or_matching_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, installed: str
) -> None:
    monkeypatch.setattr(
        baseline, "PROJECT", _project(tmp_path, ["homeassistant==2026.11.0b1"])
    )
    monkeypatch.setattr(baseline, "version", lambda _: installed)
    assert baseline.main() == 0


@pytest.mark.parametrize("installed", ["2026.11.0b2", "2026.11.0", "2026.12.0.dev0"])
def test_refuses_newer_environment(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    installed: str,
) -> None:
    monkeypatch.setattr(
        baseline, "PROJECT", _project(tmp_path, ["homeassistant==2026.11.0b1"])
    )
    monkeypatch.setattr(baseline, "version", lambda _: installed)
    assert baseline.main() == 1
    message = capsys.readouterr().err
    assert installed in message
    assert "Refusing an automatic downgrade" in message


def test_allows_new_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        baseline, "PROJECT", _project(tmp_path, ["homeassistant==2026.11.0b1"])
    )

    def missing(_: str) -> str:
        raise PackageNotFoundError("homeassistant")

    monkeypatch.setattr(baseline, "version", missing)
    assert baseline.main() == 0


@pytest.mark.parametrize(
    "pins",
    [
        [],
        ["homeassistant>=2026.9.0"],
        ["homeassistant==invalid"],
        ["homeassistant==2026.11.0b1", "homeassistant==2026.12.0"],
    ],
)
def test_invalid_baseline_fails_closed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, pins: list[str]
) -> None:
    monkeypatch.setattr(baseline, "PROJECT", _project(tmp_path, pins))
    assert baseline.main() == 1


def test_missing_project_fails_closed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(baseline, "PROJECT", tmp_path / "missing.toml")
    assert baseline.main() == 1


def test_invalid_installed_version_fails_closed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        baseline, "PROJECT", _project(tmp_path, ["homeassistant==2026.11.0b1"])
    )
    monkeypatch.setattr(baseline, "version", lambda _: "invalid")
    assert baseline.main() == 1


def test_guard_works_before_bootstrap_dependencies_exist() -> None:
    """A fresh environment can run the guard without packaging installed."""
    result = subprocess.run(  # noqa: S603 - fixed local script, no site packages
        [sys.executable, "-S", str(ROOT / "script/check_test_baseline.py")],
        capture_output=True,
        text=True,
        check=False,
        timeout=10,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("script_name", ["upgrade", "test"])
def test_setup_stops_before_package_changes(tmp_path: Path, script_name: str) -> None:
    """A failed preflight must stop before even querying/uninstalling packages."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    python = bin_dir / "python"
    python.write_text("#!/bin/sh\nexit 1\n")
    python.chmod(0o755)
    calls = tmp_path / "uv-called"
    uv = bin_dir / "uv"
    uv.write_text('#!/bin/sh\n: > "$UPGRADE_CALL_LOG"\nexit 86\n')
    uv.chmod(0o755)
    env = os.environ | {
        "VIRTUAL_ENV": str(tmp_path),
        "PATH": f"{bin_dir}{os.pathsep}{os.defpath}",
        "UPGRADE_CALL_LOG": str(calls),
    }
    result = subprocess.run(  # noqa: S603 - fixed script and controlled test environment
        ["bash", str(ROOT / "script" / script_name)],  # noqa: S607
        env=env,
        capture_output=True,
        text=True,
        check=False,
        timeout=10,
    )
    assert result.returncode == 1
    assert not calls.exists()
