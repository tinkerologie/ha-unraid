"""Repairs for the Unraid integration."""

from __future__ import annotations

from typing import TYPE_CHECKING

import probatio as vol
from homeassistant.components.repairs import RepairsFlow, RepairsFlowResult

from .const import DOMAIN, REPAIR_AUTH_FAILED

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


class AuthFailedRepairFlow(RepairsFlow):
    """Handler for auth failed repair flow."""

    def __init__(self, entry_id: str | None = None) -> None:
        """Remember which config entry the issue belongs to."""
        super().__init__()
        self._entry_id = entry_id

    async def async_step_init(
        self, user_input: dict | None = None
    ) -> RepairsFlowResult:
        """Handle the first step of the repair flow."""
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict | None = None
    ) -> RepairsFlowResult:
        """Handle the confirm step - redirect to reauth flow."""
        if user_input is not None:
            if self._entry_id is not None:
                entry = self.hass.config_entries.async_get_entry(self._entry_id)
            else:
                # The legacy shared issue named no entry; use the first one.
                entries = self.hass.config_entries.async_entries(DOMAIN)
                entry = entries[0] if entries else None
            if entry is None:
                return self.async_abort(reason="entry_not_found")
            entry.async_start_reauth(self.hass)
            return self.async_create_entry(data={})

        return self.async_show_form(
            step_id="confirm",
            data_schema=vol.Schema({}),
        )


async def async_create_fix_flow(
    hass: HomeAssistant,  # noqa: ARG001
    issue_id: str,
    data: dict | None,
) -> RepairsFlow:
    """Create flow for fixing an issue."""
    if issue_id == REPAIR_AUTH_FAILED or issue_id.startswith(f"{REPAIR_AUTH_FAILED}_"):
        entry_id = (data or {}).get("entry_id")
        return AuthFailedRepairFlow(entry_id if isinstance(entry_id, str) else None)

    # Unknown issue - this shouldn't happen
    raise ValueError(f"Unknown issue ID: {issue_id}")
