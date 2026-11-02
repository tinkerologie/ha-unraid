#!/usr/bin/env python3
"""Refuse automatic HA downgrades before changing a development environment."""

from __future__ import annotations

import sys
import tomllib
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent / "pyproject.toml"


def test_baseline(project: Path) -> str:
    """Read the single exact Home Assistant pin from the project's test extra."""
    metadata = tomllib.loads(project.read_text())
    pins = [
        requirement.removeprefix("homeassistant==")
        for requirement in metadata["project"]["optional-dependencies"]["test"]
        if requirement.startswith("homeassistant==")
    ]
    if len(pins) != 1:
        raise ValueError("The test extra must contain one exact Home Assistant pin")
    return pins[0]


def main() -> int:
    """Fail before package changes when the selected environment has newer HA."""
    try:
        baseline_pin = test_baseline(PROJECT)
        try:
            installed_version = version("homeassistant")
        except PackageNotFoundError:
            return 0
        # Fresh bootstrap environments have only the standard library. An
        # installed Home Assistant supplies packaging as a dependency.
        from packaging.version import Version

        baseline = Version(baseline_pin)
        installed = Version(installed_version)
        if installed > baseline:
            print(
                f"Home Assistant {installed} is newer than test baseline {baseline}. "
                "Refusing an automatic downgrade. Use a separate virtual "
                "environment for pinned tests to protect existing recorder data.",
                file=sys.stderr,
            )
            return 1
    except (OSError, ValueError, KeyError, ImportError) as error:
        print(
            f"Cannot verify the Home Assistant test baseline: {error}", file=sys.stderr
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
