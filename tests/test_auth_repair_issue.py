"""The authentication repair issue belongs to one config entry (#394)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant import config_entries
from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import MockConfigEntry
from unraid_api.exceptions import UnraidAuthenticationError

from custom_components import unraid
from custom_components.unraid import (
    async_delete_auth_issue,
    async_remove_entry,
    async_setup_entry,
)
from custom_components.unraid.const import (
    DEFAULT_PORT,
    DOMAIN,
    REPAIR_AUTH_FAILED,
    auth_failed_issue_id,
)


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


def _raise_legacy_issue(hass: HomeAssistant) -> None:
    ir.async_create_issue(
        hass,
        DOMAIN,
        REPAIR_AUTH_FAILED,
        is_fixable=True,
        severity=ir.IssueSeverity.ERROR,
        translation_key=REPAIR_AUTH_FAILED,
    )


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


async def test_auth_failure_raises_an_issue_for_the_entry(
    hass: HomeAssistant, client: MagicMock
) -> None:
    entry = _entry("tower")
    entry.add_to_hass(hass)

    with pytest.raises(ConfigEntryAuthFailed):
        await async_setup_entry(hass, entry)

    issue = ir.async_get(hass).async_get_issue(
        DOMAIN, auth_failed_issue_id(entry.entry_id)
    )
    assert issue is not None
    assert issue.translation_key == REPAIR_AUTH_FAILED
    assert issue.translation_placeholders == {"host": "tower.local"}
    assert issue.data == {"entry_id": entry.entry_id}
    assert issue.is_fixable
    assert issue.is_persistent
    if unraid._ISSUES_TAKE_CONFIG_ENTRY:  # Home Assistant 2026.11+
        assert issue.config_entry_id == entry.entry_id
    assert ir.async_get(hass).async_get_issue(DOMAIN, REPAIR_AUTH_FAILED) is None


async def test_config_entry_id_is_passed_only_when_supported(
    hass: HomeAssistant, client: MagicMock
) -> None:
    """Older Home Assistant releases don't accept config_entry_id."""
    entry = _entry("tower")
    entry.add_to_hass(hass)

    for supported in (False, True):
        with (
            patch.object(unraid, "_ISSUES_TAKE_CONFIG_ENTRY", supported),
            patch.object(unraid.ir, "async_create_issue") as create,
            pytest.raises(ConfigEntryAuthFailed),
        ):
            await async_setup_entry(hass, entry)
        kwargs = create.call_args.kwargs
        assert ("config_entry_id" in kwargs) is supported
        if supported:
            assert kwargs["config_entry_id"] == entry.entry_id


async def test_one_server_recovering_keeps_the_other_servers_issue(
    hass: HomeAssistant, client: MagicMock
) -> None:
    broken, healthy = _entry("broken"), _entry("healthy")
    broken.add_to_hass(hass)
    healthy.add_to_hass(hass)
    with pytest.raises(ConfigEntryAuthFailed):
        await async_setup_entry(hass, broken)
    _raise_legacy_issue(hass)

    async_delete_auth_issue(hass, healthy.entry_id)

    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, auth_failed_issue_id(broken.entry_id))
    # The shared issue from before #394 goes on any successful connection.
    assert registry.async_get_issue(DOMAIN, REPAIR_AUTH_FAILED) is None


async def test_successful_connection_clears_the_entrys_issue(
    hass: HomeAssistant, client: MagicMock
) -> None:
    entry = _entry("tower")
    entry.add_to_hass(hass)
    with pytest.raises(ConfigEntryAuthFailed):
        await async_setup_entry(hass, entry)
    _raise_legacy_issue(hass)

    # The key works again; stop setup right after the connection succeeds.
    client.test_connection.side_effect = None
    with (
        patch.object(unraid, "_build_server_info", side_effect=RuntimeError("done")),
        pytest.raises(RuntimeError, match="done"),
    ):
        await async_setup_entry(hass, entry)

    registry = ir.async_get(hass)
    assert (
        registry.async_get_issue(DOMAIN, auth_failed_issue_id(entry.entry_id)) is None
    )
    assert registry.async_get_issue(DOMAIN, REPAIR_AUTH_FAILED) is None


async def test_removing_the_entry_deletes_its_issue(
    hass: HomeAssistant, client: MagicMock
) -> None:
    entry = _entry("tower")
    entry.add_to_hass(hass)
    with pytest.raises(ConfigEntryAuthFailed):
        await async_setup_entry(hass, entry)

    await async_remove_entry(hass, entry)

    assert (
        ir.async_get(hass).async_get_issue(DOMAIN, auth_failed_issue_id(entry.entry_id))
        is None
    )


async def test_reauth_clears_only_its_own_issue(
    hass: HomeAssistant, client: MagicMock
) -> None:
    first, second = _entry("first"), _entry("second")
    first.add_to_hass(hass)
    second.add_to_hass(hass)
    for entry in (first, second):
        with pytest.raises(ConfigEntryAuthFailed):
            await async_setup_entry(hass, entry)

    flow_client = MagicMock()
    flow_client.test_connection = AsyncMock()
    flow_client.get_server_info = AsyncMock()
    flow_client.close = AsyncMock()
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": config_entries.SOURCE_REAUTH, "entry_id": first.entry_id},
        data=first.data,
    )
    with (
        patch(
            "custom_components.unraid.config_flow.ConfigFlow._test_connection",
            AsyncMock(),
        ),
        patch("custom_components.unraid.async_setup_entry", return_value=True),
    ):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_API_KEY: "new-key"}
        )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    registry = ir.async_get(hass)
    assert (
        registry.async_get_issue(DOMAIN, auth_failed_issue_id(first.entry_id)) is None
    )
    assert registry.async_get_issue(DOMAIN, auth_failed_issue_id(second.entry_id))
