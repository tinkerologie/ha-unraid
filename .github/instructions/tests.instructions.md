---
applyTo: "tests/**/*.py"
---

# Test Guidelines — ha-unraid

Refer to `AGENTS.md` for full project documentation.

## Test Framework

- `pytest` with `pytest-asyncio` (`asyncio_mode = "auto"`)
- Official `pytest-homeassistant` plugin for HA fixtures and `pytest_homeassistant.common` helpers
- Plugin-provided `pytest_homeassistant.syrupy.HomeAssistantSnapshotExtension` for snapshots
- `pytest-cov` for coverage reporting
- `syrupy` for snapshot testing

## Test Structure

```
tests/
├── conftest.py                 # Shared fixtures and data factories
├── fixtures/                   # JSON API response fixtures
├── snapshots/                  # Syrupy snapshots from the official HA extension
├── test_harness.py             # Plugin, guard ordering and snapshot checks
├── test_environment.py         # Development-environment downgrade protection
├── test_init.py                # Setup/teardown
├── test_identity_migration.py  # Server identity + registry migration (#351)
├── test_config_flow.py         # Config flow paths
├── test_coordinator.py         # Coordinator update logic
├── test_cleanup.py             # Stale entity / device cleanup
├── test_websocket.py           # Subscription manager
├── test_sensor.py, test_binary_sensor.py, test_switch.py, test_button.py
├── test_event.py, test_update.py
└── test_diagnostics.py, test_legacy_auth_issue.py, test_entity.py, test_frontend.py
```

## Fixture Patterns

Fixtures in `conftest.py` provide:
- Mock `UnraidClient` with pre-configured return values
- Pre-built data classes (`UnraidSystemData`, `UnraidStorageData`, `UnraidInfraData`)
- Mock config entries with realistic data
- Helper functions like `make_system_data()`, `make_storage_data()`

## Mocking

Mock at the `UnraidClient` method level, not HTTP:

```python
@pytest.fixture
def mock_api_client():
    client = AsyncMock(spec=UnraidClient)
    client.get_server_info.return_value = ServerInfo(...)
    client.get_system_metrics.return_value = SystemMetrics(...)
    return client
```

## Test Scenarios

Cover both happy path and error cases:

- **Happy path**: Normal data, all services available
- **Auth failure**: `UnraidAuthenticationError` → `ConfigEntryAuthFailed`
- **Connection loss**: `UnraidConnectionError` → `UpdateFailed`
- **Missing optional data**: Docker/VMs/UPS not enabled → empty lists, no crash
- **None data**: Coordinator data is `None` → entity returns `None`/unavailable

## Running Tests

```bash
pytest                           # All tests with coverage
pytest tests/test_sensor.py      # Single module
pytest -k "test_cpu"             # Pattern match
pytest --no-cov                  # Skip coverage for speed
```

## Registries

Use the real registries from the `hass` fixture. Do not mock the registries.

```python
entry = MockConfigEntry(domain=DOMAIN, data={...}, unique_id="...")
entry.add_to_hass(hass)
ent_reg = er.async_get(hass)
dev_reg = dr.async_get(hass)
```

Find devices by config entry.
Use `dev_reg.async_get_device_by_identifier((DOMAIN, uuid), entry.entry_id)`. Deprecated core APIs raise `RuntimeError`
under pytest because there is no integration frame. Correct the integration code.

## Deprecation Checks

Tests fail on `DeprecationWarning` or `PendingDeprecationWarning` from the integration.
See `filterwarnings` in `pyproject.toml`. Tests also fail if Home Assistant
logs a deprecation report about `unraid`. The autouse
`deprecation_report_guard` fixture in `conftest.py` detects these reports.
 Fix the integration. Do not
weaken the filter, the three report patterns or the guard. A test that emits a
report on purpose requests `deprecation_report_guard` and clears it. Import-time
reports are caught by `script/ha_next.py import-check`, which
`test_deprecation_currency.py` runs in a fresh interpreter. Keep its patterns
identical to `conftest.py`.

## Full-Integration Setup

`await hass.config_entries.async_setup(entry.entry_id)` loads the integration
and all entries for the domain. Patch
`custom_components.unraid.async_register_frontend`. Patch
`custom_components.unraid.UnraidWebSocketManager` with `AsyncMock` for
`async_start` and `async_stop`. Use `AsyncMock` for each client method that
a coordinator awaits. See `tests/test_coordinator.py::mock_api_client`.

## Assertions

- Use `hass.states.get("sensor.unraid_...")` to verify entity state
- Check `state.state` for the value
- Check `state.attributes` for extra attributes
- For config flow: assert `result["type"]` and `result["errors"]`
