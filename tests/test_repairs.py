"""Tests for the Unraid repairs module."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.unraid.const import (
    DOMAIN,
    REPAIR_AUTH_FAILED,
    auth_failed_issue_id,
)
from custom_components.unraid.repairs import (
    AuthFailedRepairFlow,
    async_create_fix_flow,
)


@pytest.fixture
def mock_config_entry() -> MockConfigEntry:
    """Create a mock config entry."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="tower",
        data={"host": "192.168.1.100", "api_key": "test-key"},
        unique_id="test-uuid",
    )


async def test_async_create_fix_flow_auth_failed(hass: HomeAssistant) -> None:
    """Test creating fix flow for auth failed issue."""
    flow = await async_create_fix_flow(hass, REPAIR_AUTH_FAILED, None)
    assert isinstance(flow, AuthFailedRepairFlow)


async def test_async_create_fix_flow_unknown_issue(hass: HomeAssistant) -> None:
    """Test creating fix flow for unknown issue raises error."""
    with pytest.raises(ValueError, match="Unknown issue ID"):
        await async_create_fix_flow(hass, "unknown_issue", None)


async def test_auth_failed_repair_flow_init(hass: HomeAssistant) -> None:
    """Test auth failed repair flow init step redirects to confirm."""
    flow = AuthFailedRepairFlow()
    flow.hass = hass

    result = await flow.async_step_init()

    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "confirm"


async def test_auth_failed_repair_flow_confirm_shows_form(hass: HomeAssistant) -> None:
    """Test auth failed repair flow confirm shows form when no input."""
    flow = AuthFailedRepairFlow()
    flow.hass = hass

    result = await flow.async_step_confirm()

    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "confirm"


async def test_auth_failed_repair_flow_confirm_starts_reauth(
    hass: HomeAssistant,
    mock_config_entry: MockConfigEntry,
) -> None:
    """The legacy shared issue names no entry, so the first entry reauthenticates."""
    mock_config_entry.add_to_hass(hass)

    flow = AuthFailedRepairFlow()
    flow.hass = hass

    with patch.object(
        hass.config_entries.flow, "async_init", return_value={"flow_id": "test"}
    ) as mock_init:
        result = await flow.async_step_confirm(user_input={})

    assert result["type"] is FlowResultType.CREATE_ENTRY
    # Verify reauth flow was initiated
    await hass.async_block_till_done()
    mock_init.assert_called_once()
    call_kwargs = mock_init.call_args
    assert call_kwargs[0][0] == DOMAIN
    assert call_kwargs[1]["context"]["source"] == "reauth"
    assert call_kwargs[1]["context"]["entry_id"] == mock_config_entry.entry_id


async def test_auth_failed_repair_flow_reauthenticates_its_own_entry(
    hass: HomeAssistant,
) -> None:
    """A per-entry issue reauthenticates the entry it names, not the first one."""
    first = MockConfigEntry(domain=DOMAIN, title="first", data={"host": "a"})
    second = MockConfigEntry(domain=DOMAIN, title="second", data={"host": "b"})
    first.add_to_hass(hass)
    second.add_to_hass(hass)

    flow = await async_create_fix_flow(
        hass, auth_failed_issue_id(second.entry_id), {"entry_id": second.entry_id}
    )
    flow.hass = hass

    with patch.object(
        hass.config_entries.flow, "async_init", return_value={"flow_id": "test"}
    ) as mock_init:
        result = await flow.async_step_confirm(user_input={})
        await hass.async_block_till_done()

    assert result["type"] is FlowResultType.CREATE_ENTRY
    mock_init.assert_called_once()
    assert mock_init.call_args[1]["context"]["entry_id"] == second.entry_id


@pytest.mark.parametrize(
    ("issue_id", "data"),
    [
        (auth_failed_issue_id("gone"), {"entry_id": "gone"}),
        (REPAIR_AUTH_FAILED, None),
    ],
    ids=["entry_removed", "legacy_without_entries"],
)
async def test_auth_failed_repair_flow_aborts_without_entry(
    hass: HomeAssistant, issue_id: str, data: dict | None
) -> None:
    """With no matching entry there is nothing to reauthenticate."""
    flow = await async_create_fix_flow(hass, issue_id, data)
    flow.hass = hass

    result = await flow.async_step_confirm(user_input={})

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "entry_not_found"


async def test_fix_flow_ignores_non_string_entry_id(hass: HomeAssistant) -> None:
    """Malformed issue data falls back to the legacy behaviour."""
    flow = await async_create_fix_flow(
        hass, auth_failed_issue_id("x"), {"entry_id": 123}
    )
    assert isinstance(flow, AuthFailedRepairFlow)
    assert flow._entry_id is None
