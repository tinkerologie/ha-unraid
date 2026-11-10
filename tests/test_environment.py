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


@pytest.mark.parametrize("script_name", ["test", "upgrade", "setup/bootstrap"])
@pytest.mark.parametrize(
    "scenario",
    ["mixed", "legacy", "interrupted", "missing", "healthy", "newer", "mixed-newer"],
)
def test_plugin_migration(tmp_path: Path, script_name: str, scenario: str) -> None:
    """Restore the shared module and refuse changes to a newer environment."""
    script_dir = tmp_path / "script"
    lib_dir = script_dir / ".lib"
    lib_dir.mkdir(parents=True)
    (lib_dir / "output.sh").write_text((ROOT / "script/.lib/output.sh").read_text())
    script = script_dir / script_name
    script.parent.mkdir(exist_ok=True)
    script.write_text((ROOT / "script" / script_name).read_text())
    venv_dir = tmp_path / ".local/ha-venv"
    bin_dir = venv_dir / "bin"
    bin_dir.mkdir(parents=True)
    (bin_dir / "activate").write_text(":\n")
    module = tmp_path / "plugin-module"
    calls = tmp_path / "uv-called"
    retired = ""
    if scenario in {"mixed", "mixed-newer"}:
        retired = "pytest-home-assistant"
    elif scenario == "legacy":
        retired = "pytest-homeassistant-custom-component"
    newer = scenario in {"newer", "mixed-newer"}
    if retired or scenario == "healthy":
        module.touch()
    commands = {
        bin_dir / "python": """case "$*" in
*pytest-homeassistant-custom-component|*pytest-home-assistant)
    test "$3" = "$PLUGIN_RETIRED" ;;
*pytest-homeassistant) test "$PLUGIN_SCENARIO" != missing ;;
*check_test_baseline.py) test "$PLUGIN_BASELINE_OK" = yes ;;
*"import pytest_homeassistant") test -f "$PLUGIN_MODULE" ;;
*"version('homeassistant')"*) echo 2026.11.0 ;;
*) exit 1 ;;
esac
""",
        bin_dir / "uv": """printf '%s\\n' "$*" >> "$UV_CALL_LOG"
case "$*" in
"pip show "*) test "$3" = "$PLUGIN_RETIRED" ;;
"pip uninstall "*) test "$3" = "$PLUGIN_RETIRED" && rm -f "$PLUGIN_MODULE" ;;
"pip install "*"--reinstall-package pytest-homeassistant"*) touch "$PLUGIN_MODULE" ;;
"pip install "*) exit 0 ;;
*) exit 1 ;;
esac
""",
        bin_dir / "pytest": 'test -f "$PLUGIN_MODULE"\n',
        script_dir / "clean": "exit 0\n",
    }
    for path, command in commands.items():
        path.write_text(f"#!/bin/sh\n{command}")
        path.chmod(0o755)
    (bin_dir / "python3").symlink_to("python")
    env = os.environ | {
        "VIRTUAL_ENV": str(venv_dir),
        "PATH": f"{bin_dir}{os.pathsep}{os.defpath}",
        "GITHUB_ACTIONS": "true",
        "GITHUB_WORKSPACE": str(tmp_path),
        "CODESPACES": "",
        "REMOTE_CONTAINERS": "",
        "PLUGIN_MODULE": str(module),
        "PLUGIN_SCENARIO": scenario,
        "PLUGIN_RETIRED": retired,
        "PLUGIN_BASELINE_OK": "no" if newer else "yes",
        "UV_CALL_LOG": str(calls),
    }
    result = subprocess.run(  # noqa: S603 - fixed script and controlled test environment
        ["bash", str(script)],  # noqa: S607
        env=env,
        capture_output=True,
        text=True,
        check=False,
        timeout=10,
    )
    if newer:
        assert result.returncode == 1
        assert not calls.exists()
    else:
        assert result.returncode == 0, result.stdout + result.stderr
        assert module.exists()
        if retired:
            assert f"pip uninstall {retired}" in calls.read_text().splitlines()
        if scenario == "healthy" and script_name == "test":
            assert not calls.exists()
