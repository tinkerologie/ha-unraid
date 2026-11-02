#!/usr/bin/env python3
"""
Check the integration against upcoming Home Assistant releases.

Subcommands:

``import-check``
    Import every module of ``custom_components.unraid`` in this interpreter and
    fail on an import error, on a ``DeprecationWarning`` or
    ``PendingDeprecationWarning`` raised from the integration's own files, or on
    a Home Assistant deprecation report that names the integration. It runs
    on every HA Next channel and from ``tests/test_deprecation_currency.py``
    in a fresh interpreter, because class-definition reports fire at import time, before
    any test fixture runs. Standard library only; Home Assistant is not started.

``resolve --channel pypi|dev``
    Resolve what the ``HA Next`` workflow installs: the newest ``homeassistant``
    on PyPI (betas included) with the matching
    official pytest plugin from the same Core commit, or Core's ``dev`` branch.
    Writes ``key=value`` lines to ``$GITHUB_OUTPUT``, or to stdout when it is not
    set. Needs ``packaging``.

Usage:
    python3 script/ha_next.py import-check
    python3 script/ha_next.py resolve --channel pypi [--python 3.14.2]

Exit 0 = clean, Exit 1 = findings or failure.
"""

from __future__ import annotations

import argparse
import importlib
import json
import logging
import os
import pkgutil
import re
import subprocess
import sys
import traceback
import urllib.request
import warnings
from collections.abc import Sequence
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = "custom_components.unraid"
PACKAGE_DIR = ROOT / "custom_components" / "unraid"
DEPRECATIONS = (DeprecationWarning, PendingDeprecationWarning)

# Home Assistant's deprecation reports that name the integration. Keep these
# three patterns identical to DEPRECATION_REPORT_PATTERNS in tests/conftest.py.
# In order: the frame helper (report_usage); the deprecation helpers for
# constants, aliases and functions; an entity class that still defines a
# deprecated member, logged when the class is defined.
DEPRECATION_REPORT_PATTERNS = (
    re.compile(r"Detected that custom integration 'unraid' "),
    re.compile(r"The deprecated .+ was \w+ from unraid\."),
    re.compile(r"custom_components\.unraid(?:\.\w+)*::[\w.]+ provides the deprecated "),
)

PYPI_JSON = "https://pypi.org/pypi/{project}/json"
HA_PROJECT = "homeassistant"
CORE_REPO = "https://github.com/home-assistant/core"
DEV_ARCHIVE = CORE_REPO + "/archive/{commit}.tar.gz"
DEFAULT_PYTHON = "3.14.2"
TIMEOUT = 30


class ReportCollector(logging.Handler):
    """Collect log messages that report deprecated use by the integration."""

    def __init__(self) -> None:
        """Collect from DEBUG upwards; the logger levels decide the rest."""
        super().__init__(logging.DEBUG)
        self.reports: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        """Keep the message when it matches one of the report formats."""
        message = record.getMessage()
        if any(p.search(message) for p in DEPRECATION_REPORT_PATTERNS):
            self.reports.append(f"{record.name}: {message}")


def module_names() -> list[str]:
    """Return the integration package and every module below it."""
    modules = pkgutil.walk_packages([str(PACKAGE_DIR)], prefix=f"{PACKAGE}.")
    return [PACKAGE, *sorted(info.name for info in modules)]


def is_own_warning(message: warnings.WarningMessage) -> bool:
    """Return whether a deprecation warning was raised from the integration."""
    if not issubclass(message.category, DEPRECATIONS):
        return False
    return Path(message.filename).resolve().is_relative_to(PACKAGE_DIR)


def import_check() -> int:
    """Import every module; print findings and return the exit status."""
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    collector = ReportCollector()
    root_logger = logging.getLogger()
    root_logger.addHandler(collector)
    failures: list[str] = []
    imported = 0
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            for name in module_names():
                try:
                    importlib.import_module(name)
                except Exception:  # noqa: BLE001 - report every broken module
                    failures.append(f"import {name} failed:\n{traceback.format_exc()}")
                else:
                    imported += 1
    finally:
        root_logger.removeHandler(collector)

    ignored = 0
    for message in caught:
        if is_own_warning(message):
            failures.append(
                f"{message.category.__name__}: {message.message} "
                f"({message.filename}:{message.lineno})"
            )
        elif issubclass(message.category, DEPRECATIONS):
            ignored += 1
    failures.extend(f"Home Assistant report: {r}" for r in collector.reports)

    from homeassistant.const import __version__ as ha_version

    print(f"Home Assistant {ha_version}: imported {imported} modules of {PACKAGE}")
    if ignored:
        print(f"Ignored {ignored} deprecation warning(s) raised outside {PACKAGE}")
    if failures:
        print(f"{len(failures)} problem(s):")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("No import errors or deprecated use found")
    return 0


def fetch_json(url: str) -> dict[str, Any]:
    """Return the JSON document at ``url``."""
    request = urllib.request.Request(url, headers={"Accept": "application/json"})  # noqa: S310 - fixed https URLs
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:  # noqa: S310
        return json.load(response)


def _admits(files: list[dict[str, Any]], python: Any) -> bool:
    """Return whether one non-yanked file supports the target interpreter."""
    from packaging.specifiers import InvalidSpecifier, SpecifierSet

    for file in files:
        if file.get("yanked"):
            continue
        try:
            spec = SpecifierSet(file.get("requires_python") or "")
        except InvalidSpecifier:
            continue
        if spec.contains(python, prereleases=True):
            return True
    return False


def newest_homeassistant(
    releases: dict[str, list[dict[str, Any]]], python: str
) -> tuple[str, list[str]]:
    """Return the newest release the interpreter can install, and newer skips."""
    from packaging.version import InvalidVersion, Version

    target = Version(python)
    versions = []
    for name, files in releases.items():
        try:
            versions.append((Version(name), name, files))
        except InvalidVersion:
            continue
    versions.sort(reverse=True)
    skipped = []
    for _, name, files in versions:
        if not files:
            continue
        if _admits(files, target):
            return name, skipped
        skipped.append(name)
    raise LookupError(f"No {HA_PROJECT} release supports Python {python}")


def core_commit(ref: str) -> str:
    """Resolve a Core branch or tag, preferring an annotated tag's commit."""
    reference = "refs/heads/dev" if ref == "dev" else f"refs/tags/{ref}"
    references = [reference]
    if ref != "dev":
        references.append(f"{reference}^{{}}")
    result = subprocess.run(  # noqa: S603 - fixed Git arguments, no shell
        ["git", "ls-remote", CORE_REPO, *references],  # noqa: S607
        check=True,
        capture_output=True,
        text=True,
        timeout=TIMEOUT,
    )
    resolved = {}
    for line in result.stdout.splitlines():
        commit, separator, name = line.partition("\t")
        if separator:
            resolved[name] = commit
    commit = resolved.get(f"{reference}^{{}}", resolved.get(reference, ""))
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise LookupError(f"Cannot resolve Core ref {ref}: {result.stdout!r}")
    return commit


def plugin_requirement(commit: str) -> str:
    """Build an immutable official test plugin requirement for a Core commit."""
    return (
        f"pytest-home-assistant @ git+{CORE_REPO}@{commit}"
        "#subdirectory=packages/pytest-home-assistant"
    )


def resolve(channel: str, python: str) -> dict[str, str]:
    """Return the install requirement and versions for one channel."""
    if channel == "dev":
        # Pin one commit, so the install and Hassfest test the same Core.
        commit = core_commit("dev")
        return {
            "ha_requirement": f"{HA_PROJECT} @ {DEV_ARCHIVE.format(commit=commit)}",
            "hassfest_ref": commit,
            "ha_version": f"dev@{commit[:12]}",
            "plugin_requirement": plugin_requirement(commit),
            "plugin_ref": commit[:12],
            "note": "",
        }
    releases = fetch_json(PYPI_JSON.format(project=HA_PROJECT))["releases"]
    version, skipped = newest_homeassistant(releases, python)
    note = ""
    if skipped:
        note = (
            f"Newer {HA_PROJECT} release(s) {', '.join(skipped)} do not support "
            f"Python {python}."
        )
    commit = core_commit(version)
    return {
        "ha_requirement": f"{HA_PROJECT}=={version}",
        "hassfest_ref": version,
        "ha_version": version,
        "plugin_requirement": plugin_requirement(commit),
        "plugin_ref": commit[:12],
        "note": note,
    }


def write_outputs(outputs: dict[str, str]) -> None:
    """Append outputs to ``$GITHUB_OUTPUT``, or print them for local runs."""
    lines = "".join(f"{key}={value}\n" for key, value in outputs.items())
    if path := os.environ.get("GITHUB_OUTPUT"):
        with Path(path).open("a", encoding="utf-8") as output:
            output.write(lines)
    print(lines, end="")


def main(argv: Sequence[str] | None = None) -> int:
    """Run the command-line interface."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("import-check", help="import every module and report")
    resolve_parser = commands.add_parser("resolve", help="resolve a channel")
    resolve_parser.add_argument("--channel", choices=("pypi", "dev"), required=True)
    resolve_parser.add_argument(
        "--python",
        default=DEFAULT_PYTHON,
        help=f"Target interpreter version (default: {DEFAULT_PYTHON})",
    )
    args = parser.parse_args(argv)

    if args.command == "import-check":
        return import_check()
    try:
        outputs = resolve(args.channel, args.python)
    except (
        OSError,
        LookupError,
        KeyError,
        ValueError,
        subprocess.SubprocessError,
    ) as err:
        print(f"Cannot resolve the {args.channel} channel: {err}", file=sys.stderr)
        return 1
    write_outputs(outputs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
