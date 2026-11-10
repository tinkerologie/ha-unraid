"""Tests for script/ha_next.py: the HA Next resolver and import check."""

from __future__ import annotations

import importlib
import importlib.util
import logging
import subprocess
import sys
import tomllib
import warnings
from pathlib import Path
from types import ModuleType
from typing import Any
from urllib.parse import parse_qs, urlsplit

import pytest
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

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
    "2026.11.0": [_file()],
    "2026.11.0b1": [_file()],
    "2026.11.0b0": [_file()],
    "2026.12.0b0": [_file(">=3.15")],  # newer, but not for Python 3.14
    "2026.12.0b1": [_file(yanked=True)],  # only a yanked file
    "2026.13.0": [],  # no files at all
    "not-a-version": [_file()],
}


COMMIT = "7c678df5c6a62c4d1a0334f7c9b6050f1926025b"
TAG_OBJECT = "1" * 40


@pytest.fixture
def pypi(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Serve the Home Assistant release index and record requests."""
    pages = {
        ha_next.PYPI_JSON.format(project=ha_next.HA_PROJECT): {"releases": HA_RELEASES}
    }
    fetched = []

    def fetch_json(url: str) -> dict[str, Any]:
        fetched.append(url)
        if url not in pages:
            raise OSError(f"404 {url}")
        return pages[url]

    monkeypatch.setattr(ha_next, "fetch_json", fetch_json)
    pages["_fetched"] = fetched
    return pages


@pytest.fixture
def ls_remote(monkeypatch: pytest.MonkeyPatch) -> list[list[str]]:
    """Resolve the requested branch or peeled tag to one immutable commit."""
    calls = []

    def run(args: list[str], **_kwargs: Any) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, f"{COMMIT}\t{args[-1]}\n", "")

    monkeypatch.setattr(ha_next.subprocess, "run", run)
    return calls


def test_newest_homeassistant_prefers_stable_and_skips_unusable() -> None:
    version, skipped = ha_next.newest_homeassistant(HA_RELEASES, "3.14.2")
    assert version == "2026.11.0"
    assert skipped == ["2026.12.0b1", "2026.12.0b0"]


def test_newest_homeassistant_without_candidates() -> None:
    with pytest.raises(LookupError, match=r"Python 3\.13"):
        ha_next.newest_homeassistant({"2026.1.0": [_file(">=3.14")]}, "3.13")


def test_invalid_requires_python_is_ignored() -> None:
    assert ha_next.newest_homeassistant(
        {"2026.11.0": [_file("not a spec")], "2026.10.0": [_file(None)]}, "3.14.2"
    ) == ("2026.10.0", ["2026.11.0"])


def test_resolve_pypi_uses_plugin_from_selected_tag(
    pypi: dict[str, Any], ls_remote: list[list[str]]
) -> None:
    assert ha_next.resolve("pypi", "3.14.2") == {
        "ha_requirement": "homeassistant==2026.11.0",
        "hassfest_ref": "2026.11.0",
        "ha_version": "2026.11.0",
        "plugin_requirement": (
            f"pytest-homeassistant @ git+{ha_next.CORE_REPO}@{COMMIT}"
            "#subdirectory=packages/pytest-homeassistant"
        ),
        "plugin_ref": COMMIT[:12],
        "note": (
            "Newer homeassistant release(s) 2026.12.0b1, 2026.12.0b0 do not "
            "support Python 3.14.2."
        ),
    }
    assert ls_remote == [
        [
            "git",
            "ls-remote",
            ha_next.CORE_REPO,
            "refs/tags/2026.11.0",
            "refs/tags/2026.11.0^{}",
        ]
    ]
    assert pypi["_fetched"] == [ha_next.PYPI_JSON.format(project=ha_next.HA_PROJECT)]


@pytest.mark.parametrize("annotated", [False, True])
def test_core_tag_resolution(monkeypatch: pytest.MonkeyPatch, annotated: bool) -> None:
    ref = "refs/tags/2026.11.0b1"
    output = f"{COMMIT}\t{ref}\n"
    if annotated:
        output = f"{TAG_OBJECT}\t{ref}\n{COMMIT}\t{ref}^{{}}\n"
    monkeypatch.setattr(
        ha_next.subprocess,
        "run",
        lambda args, **_: subprocess.CompletedProcess(args, 0, output, ""),
    )
    assert ha_next.core_commit("2026.11.0b1") == COMMIT


def test_resolve_dev_pins_core_and_plugin(
    pypi: dict[str, Any], ls_remote: list[list[str]]
) -> None:
    assert ha_next.resolve("dev", "3.14.2") == {
        "ha_requirement": (
            f"homeassistant @ {ha_next.CORE_REPO}/archive/{COMMIT}.tar.gz"
        ),
        "hassfest_ref": COMMIT,
        "ha_version": f"dev@{COMMIT[:12]}",
        "plugin_requirement": (
            f"pytest-homeassistant @ git+{ha_next.CORE_REPO}@{COMMIT}"
            "#subdirectory=packages/pytest-homeassistant"
        ),
        "plugin_ref": COMMIT[:12],
        "note": "",
    }
    assert ls_remote == [["git", "ls-remote", ha_next.CORE_REPO, "refs/heads/dev"]]
    assert pypi["_fetched"] == []


@pytest.mark.parametrize("channel", ["pypi", "dev"])
def test_channel_override_matches_project_plugin(
    channel: str, pypi: dict[str, Any], ls_remote: list[list[str]]
) -> None:
    project = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text())
    override = Requirement(ha_next.resolve(channel, "3.14.2")["plugin_requirement"])
    plugin = next(
        Requirement(item)
        for item in project["project"]["optional-dependencies"]["test"]
        if item.startswith("pytest-home")
    )
    assert canonicalize_name(override.name) == canonicalize_name(plugin.name)
    assert override.url is not None
    fragment = parse_qs(urlsplit(override.url).fragment)
    assert fragment["subdirectory"] == [
        project["tool"]["uv"]["sources"][plugin.name]["subdirectory"]
    ]


@pytest.mark.parametrize(
    "output", ["", "not-a-sha\trefs/heads/dev\n", f"{COMMIT}\trefs/heads/wrong\n"]
)
def test_resolve_dev_rejects_invalid_ref(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], output: str
) -> None:
    monkeypatch.setattr(
        ha_next.subprocess,
        "run",
        lambda args, **_: subprocess.CompletedProcess(args, 0, output, ""),
    )
    assert ha_next.main(["resolve", "--channel", "dev"]) == 1
    assert "Cannot resolve Core ref dev" in capsys.readouterr().err


def test_missing_release_tag_fails(
    pypi: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        ha_next.subprocess,
        "run",
        lambda args, **_: subprocess.CompletedProcess(args, 0, "", ""),
    )
    assert ha_next.main(["resolve", "--channel", "pypi"]) == 1
    assert "Cannot resolve Core ref 2026.11.0" in capsys.readouterr().err


def test_resolve_dev_reports_git_failure(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def fail(args: list[str], **_kwargs: Any) -> None:
        raise subprocess.CalledProcessError(128, args)

    monkeypatch.setattr(ha_next.subprocess, "run", fail)
    assert ha_next.main(["resolve", "--channel", "dev"]) == 1
    assert "Cannot resolve the dev channel" in capsys.readouterr().err


def test_main_writes_github_output(
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
    assert (
        f"plugin_requirement=pytest-homeassistant @ git+{ha_next.CORE_REPO}@{COMMIT}"
        in written
    )
    assert f"plugin_ref={COMMIT[:12]}\n" in written
    assert "ha_version=dev" in capsys.readouterr().out


def test_main_reports_resolve_failure(
    pypi: dict[str, Any], capsys: pytest.CaptureFixture[str]
) -> None:
    pypi.clear()
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
