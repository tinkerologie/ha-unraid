"""Verify the official HA plugin and deprecation/snapshot fixture integration."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, distribution

import pytest
from homeassistant.core import HomeAssistant
from syrupy.assertion import SnapshotAssertion


def test_official_plugin_loaded(pytestconfig: pytest.Config) -> None:
    """The official plugin entry point supplies the HA fixtures."""
    assert pytestconfig.pluginmanager.hasplugin("pytest_homeassistant")
    assert distribution("pytest-homeassistant")
    for retired in ("pytest-homeassistant-custom-component", "pytest-home-assistant"):
        with pytest.raises(PackageNotFoundError):
            distribution(retired)


def test_deprecation_guard_precedes_hass(
    hass: HomeAssistant, request: pytest.FixtureRequest
) -> None:
    """The guard covers setup, tests and shutdown of the HA fixture."""
    assert request.fixturenames.index(
        "deprecation_report_guard"
    ) < request.fixturenames.index("hass")
    assert hass is not None


def test_official_snapshot_extension(
    hass: HomeAssistant, snapshot: SnapshotAssertion
) -> None:
    """The plugin normalizes HA state objects without a local snapshot override."""
    hass.states.async_set("sensor.unraid_test", "42", {"friendly_name": "Unraid test"})
    assert hass.states.get("sensor.unraid_test") == snapshot
