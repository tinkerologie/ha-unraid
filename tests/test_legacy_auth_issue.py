"""Authentication failures rely on Home Assistant's reauth issue (#420)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant.common import MockConfigEntry
from unraid_api.exceptions import UnraidAuthenticationError

from custom_components import unraid
from custom_components.unraid import async_remove_entry, async_setup_entry
from custom_components.unraid.const import (
    DEFAULT_PORT,
    DOMAIN,
    LEGACY_REPAIR_AUTH_FAILED,
    legacy_auth_failed_issue_id,
)

HA_DOMAIN = "homeassistant"


def _entry(name: str) -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title=name,
        data={
            CONF_HOST: f"{name}.local",
            CONF_API_KEY: "key",
            CONF_PORT: DEFAULT_PORT,
            CONF_SSL: True,
        },
        unique_id=f"uuid-{name}",
    )


def _raise_legacy_issues(hass: HomeAssistant, *entries: MockConfigEntry) -> None:
    """Recreate the issues earlier releases left in the registry."""
    for issue_id in (
        LEGACY_REPAIR_AUTH_FAILED,
        *(legacy_auth_failed_issue_id(entry.entry_id) for entry in entries),
    ):
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            is_fixable=True,
            is_persistent=True,
            severity=ir.IssueSeverity.ERROR,
            translation_key=LEGACY_REPAIR_AUTH_FAILED,
        )


def _unraid_issue_ids(hass: HomeAssistant) -> set[str]:
    return {
        issue_id for domain, issue_id in ir.async_get(hass).issues if domain == DOMAIN
    }


@pytest.fixture
def client() -> MagicMock:
    """Patch UnraidClient with a client whose key was revoked."""
    mock = MagicMock()
    mock.test_connection = AsyncMock(
        side_effect=UnraidAuthenticationError("Invalid API key")
    )
    mock.get_server_info = AsyncMock()
    mock.close = AsyncMock()
    with (
        patch("custom_components.unraid.UnraidClient", return_value=mock),
        patch("custom_components.unraid.async_get_clientsession"),
    ):
        yield mock


async def test_auth_failure_raises_no_issue_of_its_own(
    hass: HomeAssistant, client: MagicMock
) -> None:
    """ConfigEntryAuthFailed is enough; core raises the reauth issue."""
    entry = _entry("tower")
    entry.add_to_hass(hass)

    with pytest.raises(ConfigEntryAuthFailed):
        await async_setup_entry(hass, entry)

    assert _unraid_issue_ids(hass) == set()
    client.close.assert_awaited_once()


async def test_core_raises_one_reauth_issue(
    hass: HomeAssistant, client: MagicMock
) -> None:
    """Through the real setup path the user gets exactly core's reauth issue."""
    entry = _entry("tower")
    entry.add_to_hass(hass)
    _raise_legacy_issues(hass, entry)

    assert not await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    registry = ir.async_get(hass)
    assert _unraid_issue_ids(hass) == set()
    issue = registry.async_get_issue(
        HA_DOMAIN, f"config_entry_reauth_{DOMAIN}_{entry.entry_id}"
    )
    assert issue is not None
    assert issue.issue_domain == DOMAIN
    assert any(entry.async_get_active_flows(hass, {"reauth"}))


async def test_setup_deletes_leftover_issues_when_auth_fails(
    hass: HomeAssistant, client: MagicMock
) -> None:
    """After an upgrade with the key still revoked, the old issues go."""
    entry, other = _entry("tower"), _entry("other")
    entry.add_to_hass(hass)
    other.add_to_hass(hass)
    _raise_legacy_issues(hass, entry, other)

    with pytest.raises(ConfigEntryAuthFailed):
        await async_setup_entry(hass, entry)

    # The other server's issue goes when that server sets up.
    assert _unraid_issue_ids(hass) == {legacy_auth_failed_issue_id(other.entry_id)}


async def test_setup_deletes_leftover_issues_when_auth_succeeds(
    hass: HomeAssistant, client: MagicMock
) -> None:
    entry = _entry("tower")
    entry.add_to_hass(hass)
    _raise_legacy_issues(hass, entry)
    client.test_connection.side_effect = None

    # Stop setup right after the connection succeeds.
    with (
        patch.object(unraid, "_build_server_info", side_effect=RuntimeError("done")),
        pytest.raises(RuntimeError, match="done"),
    ):
        await async_setup_entry(hass, entry)

    assert _unraid_issue_ids(hass) == set()


async def test_removing_the_entry_deletes_leftover_issues(
    hass: HomeAssistant,
) -> None:
    """An entry removed without setting up again leaves no orphaned issue."""
    entry = _entry("tower")
    entry.add_to_hass(hass)
    _raise_legacy_issues(hass, entry)

    await async_remove_entry(hass, entry)

    assert _unraid_issue_ids(hass) == set()
