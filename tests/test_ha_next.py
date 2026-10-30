"""Tests for script/ha_next.py: the HA Next resolver and import check."""

from __future__ import annotations

import importlib
import importlib.util
import logging
import subprocess
import sys
import warnings
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "script" / "ha_next.py"


def _load_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("ha_next", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


ha_next = _load_script()


def _file(requires_python: str | None = ">=3.14.2", yanked: bool = False) -> dict:
    return {"requires_python": requires_python, "yanked": yanked}


HA_RELEASES = {
    "2026.10.4": [_file()],
    "2026.11.0b1": [_file()],
    "2026.11.0b0": [_file()],
    "2026.12.0b0": [_file(">=3.15")],  # newer, but not for Python 3.14
    "2026.12.0b1": [_file(yanked=True)],  # only a yanked file
    "2026.13.0": [],  # no files at all
    "not-a-version": [_file()],
}


def _harness_index(pins: dict[str, str | None]) -> dict[str, Any]:
    pages: dict[str, Any] = {
        ha_next.PYPI_JSON.format(project=ha_next.HARNESS_PROJECT): {
            "releases": {version: [_file()] for version in [*pins, "bogus", "0.13.300"]}
            | {"0.13.300": [_file(yanked=True)]}
        }
    }
    for version, pin in pins.items():
        requires = ["pytest>=9"] + ([pin] if pin else [])
        pages[
            ha_next.PYPI_RELEASE_JSON.format(
                project=ha_next.HARNESS_PROJECT, version=version
            )
        ] = {"info": {"requires_dist": requires}}
    return pages


@pytest.fixture
def pypi(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Serve fake PyPI JSON documents and record the URLs fetched."""
    pages: dict[str, Any] = {
        ha_next.PYPI_JSON.format(project=ha_next.HA_PROJECT): {"releases": HA_RELEASES}
    }
    fetched: list[str] = []

    def fetch_json(url: str) -> dict[str, Any]:
        fetched.append(url)
        if url not in pages:
            raise OSError(f"404 {url}")
        return pages[url]

    monkeypatch.setattr(ha_next, "fetch_json", fetch_json)
    pages["_fetched"] = fetched
    return pages


def test_newest_homeassistant_includes_betas_and_skips_unusable() -> None:
    version, skipped = ha_next.newest_homeassistant(HA_RELEASES, "3.14.2")
    assert version == "2026.11.0b1"
    assert skipped == ["2026.12.0b1", "2026.12.0b0"]


def test_newest_homeassistant_without_candidates() -> None:
    with pytest.raises(LookupError, match=r"Python 3\.13"):
        ha_next.newest_homeassistant({"2026.1.0": [_file(">=3.14")]}, "3.13")


def test_invalid_requires_python_is_ignored() -> None:
    releases = {"2026.11.0": [_file("not a spec")], "2026.10.0": [_file(None)]}
    assert ha_next.newest_homeassistant(releases, "3.14.2") == (
        "2026.10.0",
        ["2026.11.0"],
    )


def test_resolve_pypi_with_matching_harness(pypi: dict[str, Any]) -> None:
    pypi.update(
        _harness_index(
            {
                "0.13.380": "homeassistant==2026.11.0",
                "0.13.379": "homeassistant==2026.11.0b1",
                "0.13.378": "homeassistant==2026.11.0b0",
            }
        )
    )
    outputs = ha_next.resolve("pypi", "3.14.2")
    assert outputs == {
        "ha_requirement": "homeassistant==2026.11.0b1",
        "hassfest_ref": "2026.11.0b1",
        "ha_version": "2026.11.0b1",
        "harness_version": "0.13.379",
        "note": (
            "Newer homeassistant release(s) 2026.12.0b1, 2026.12.0b0 do not "
            "support Python 3.14.2."
        ),
    }
    # The search stops at the first match.
    assert not any("0.13.378" in url for url in pypi["_fetched"])


def test_resolve_pypi_without_harness_stops_at_older_pins(
    pypi: dict[str, Any],
) -> None:
    pypi.update(
        _harness_index(
            {
                "0.13.376": None,  # no homeassistant requirement
                "0.13.375": "homeassistant==2026.10.4",
                "0.13.374": "homeassistant==2026.10.3",
            }
        )
    )
    assert ha_next.resolve("pypi", "3.14.2")["harness_version"] == ""
    assert not any("0.13.374" in url for url in pypi["_fetched"])


def test_harness_pin_ignores_markers_and_invalid_lines() -> None:
    assert ha_next.harness_pin(None) is None
    assert (
        ha_next.harness_pin(
            ["homeassistant==1; extra == 'x'", "not a requirement !!", "other==1"]
        )
        is None
    )
    assert str(ha_next.harness_pin(["homeassistant==2026.11.0b1"]).specifier) == (
        "==2026.11.0b1"
    )


COMMIT = "7c678df5c6a62c4d1a0334f7c9b6050f1926025b"


@pytest.fixture
def ls_remote(monkeypatch: pytest.MonkeyPatch) -> list[list[str]]:
    """Answer git ls-remote with a fixed dev head."""
    calls: list[list[str]] = []

    def run(args: list[str], **_kwargs: Any) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, f"{COMMIT}\trefs/heads/dev\n", "")

    monkeypatch.setattr(ha_next.subprocess, "run", run)
    return calls


def test_resolve_dev_pins_one_commit(
    pypi: dict[str, Any], ls_remote: list[list[str]]
) -> None:
    """Install and Hassfest use the same Core commit, without querying PyPI."""
    assert ha_next.resolve("dev", "3.14.2") == {
        "ha_requirement": (
            "homeassistant @ https://github.com/home-assistant/core/archive/"
            f"{COMMIT}.tar.gz"
        ),
        "hassfest_ref": COMMIT,
        "ha_version": f"dev@{COMMIT[:12]}",
        "harness_version": "",
        "note": ha_next.DEV_NOTE,
    }
    assert ls_remote == [["git", "ls-remote", ha_next.CORE_REPO, "refs/heads/dev"]]
    assert pypi["_fetched"] == []


def test_resolve_dev_rejects_an_unexpected_answer(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(
        ha_next.subprocess,
        "run",
        lambda args, **_: subprocess.CompletedProcess(args, 0, "", ""),
    )
    assert ha_next.main(["resolve", "--channel", "dev"]) == 1
    assert "Cannot resolve the head of Core dev" in capsys.readouterr().err


def test_resolve_dev_reports_git_failure(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def fail(args: list[str], **_kwargs: Any) -> None:
        raise subprocess.CalledProcessError(128, args)

    monkeypatch.setattr(ha_next.subprocess, "run", fail)
    assert ha_next.main(["resolve", "--channel", "dev"]) == 1
    assert "Cannot resolve the dev channel" in capsys.readouterr().err


def test_main_writes_github_output(
    pypi: dict[str, Any],
    ls_remote: list[list[str]],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    output = tmp_path / "output"
    output.write_text("existing=1\n")
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    assert ha_next.main(["resolve", "--channel", "dev"]) == 0
    written = output.read_text()
    assert written.startswith("existing=1\nha_requirement=homeassistant @ ")
    assert f"hassfest_ref={COMMIT}\n" in written
    assert "ha_version=dev" in capsys.readouterr().out


def test_main_reports_resolve_failure(
    pypi: dict[str, Any], capsys: pytest.CaptureFixture[str]
) -> None:
    pypi.pop(ha_next.PYPI_JSON.format(project=ha_next.HA_PROJECT))
    assert ha_next.main(["resolve", "--channel", "pypi"]) == 1
    assert "Cannot resolve the pypi channel" in capsys.readouterr().err


def test_module_names_cover_the_package() -> None:
    names = ha_next.module_names()
    assert names[0] == "custom_components.unraid"
    assert "custom_components.unraid.sensor" in names
    assert len(names) == len(set(names))


def test_import_check_reports_every_problem(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    deprecation_report_guard: list[str],
) -> None:
    own_file = str(ha_next.PACKAGE_DIR / "sensor.py")

    def fake_import(name: str) -> None:
        if name == "custom_components.unraid.broken":
            raise ImportError("cannot import name 'EntityCategory'")
        if name == "custom_components.unraid.sensor":
            warnings.warn_explicit("old", DeprecationWarning, own_file, 1)
            warnings.warn_explicit("lib", DeprecationWarning, "/site/lib.py", 1)
            logging.getLogger("custom_components.unraid.sensor").warning(
                "custom_components.unraid.sensor::CpuSensor provides the "
                "deprecated _attr_x, this will stop working in Home Assistant 2027.1"
            )

    monkeypatch.setattr(
        ha_next,
        "module_names",
        lambda: [
            "custom_components.unraid",
            "custom_components.unraid.broken",
            "custom_components.unraid.sensor",
        ],
    )
    monkeypatch.setattr(importlib, "import_module", fake_import)
    assert ha_next.import_check() == 1
    out = capsys.readouterr().out
    assert "imported 2 modules" in out
    assert "Ignored 1 deprecation warning(s) raised outside" in out
    assert "3 problem(s):" in out
    assert "import custom_components.unraid.broken failed" in out
    assert f"DeprecationWarning: old ({own_file}:1)" in out
    assert "Home Assistant report: custom_components.unraid.sensor: " in out
    # The synthetic report is the point of this test, not a real finding.
    deprecation_report_guard.clear()
