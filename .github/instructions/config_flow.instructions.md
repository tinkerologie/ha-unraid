---
applyTo: "custom_components/unraid/config_flow.py"
---

# Config Flow Guidelines — ha-unraid

Refer to `AGENTS.md` for full project documentation.

## Flow Steps

- **`async_step_user`**: Initial setup — host, port, API key input
- **`async_step_reauth_confirm`**: Re-authentication when API key changes
- **`async_step_reconfigure`**: Change host/port/SSL after initial setup

## SSL Auto-Detection

The config flow delegates protocol probing to `unraid-api` and retries with
`verify_ssl=False` when certificate verification fails:

```python
try:
    await api_client.test_connection()
except CannotConnectError as err:
    if "ssl" in str(err).lower() or "certificate" in str(err).lower():
        api_client = UnraidClient(..., verify_ssl=False, session=session)
        await api_client.test_connection()
```

## Version Checking

Enforce API version compatibility before accepting configuration:

```python
server_info = await api_client.get_server_info()
# Compare server_info.api_version against MIN_API_VERSION
```

The integration checks the GraphQL API version from `get_server_info()` against
`MIN_API_VERSION` from `unraid-api`. No Unraid OS version requirement — the API
is upgradeable independently through the Unraid Connect plugin.

## Options Flow

`OptionsFlowWithReload` handles UPS capacity/power settings:

- `CONF_UPS_CAPACITY_VA` — UPS VA rating (0 = informational only)
- `CONF_UPS_NOMINAL_POWER` — Nominal power in watts (0 = disabled)

## Error IDs

Return string error IDs (not exceptions) to the UI:

- `required` — Missing host/API key
- `invalid_hostname` — Host exceeds max length
- `cannot_connect` — Connection failed
- `invalid_auth` — Bad API key
- `unknown` — Unexpected error
- `unsupported_version` — Unraid/API too old

## Abort Reasons

- `already_configured` — Duplicate server detected by unique ID
- `reauth_successful` — Returned by `async_step_reauth_confirm` on success through `self.async_update_reload_and_abort(...)`
- `no_options_available` — Returned by options flow when UPS options are not applicable

## Unique Config Entry

Set unique ID from server UUID (or fallback host) during `async_step_user`:

```python
unique_id = self._server_uuid or user_input[CONF_HOST]
await self.async_set_unique_id(unique_id)
self._abort_if_unique_id_configured()
```

`_fetch_server_info()` qualifies a known placeholder SMBIOS UUID
(`is_placeholder_uuid()` in `const.py`) with the hostname: `{uuid}_{hostname}`.
This is the config entry identity. The `__init__.py` module uses the same value for
runtime `server_info["uuid"]`. This gives each server a separate device and entities (#351). Do not change this format without a registry migration.

`async_step_reauth_confirm` and `async_step_reconfigure` update existing entries
through `_get_reauth_entry()` / `_get_reconfigure_entry()` and finish with
`async_update_reload_and_abort()`. Do not combine that with an update listener
(deprecated 2026.6, error from 2026.12). Use `OptionsFlowWithReload` for options.
`show_advanced_options` is deprecated (2026.6) and must not be checked.

## Validation

- Hostname: max 253 chars
- Port: 1–65535
- API key: non-empty string
- Use `vol.Schema` with `voluptuous` validators

## Repair Issues

Do not create or clear a repair issue for authentication. Raise
`ConfigEntryAuthFailed`. Home Assistant starts reauthentication and creates
a `config_entry_reauth` issue. It deletes the issue when the flow ends (#420).
