# AI Agent Instructions — ha-unraid

Use [ASD-STE100 Issue 9](docs/agents/documentation.md) for new or changed English documentation.

## Mandatory Development Workflow for AI Agents

All AI coding agents must follow these steps.

1. Find the GitHub issue before you write code or create a pull request (PR).
2. Use the official issue form. Use `01-bug-report.yml` for a bug or `02-enhancement-request.yml` for an enhancement.
3. Make sure the issue has a CodeRabbit Coding Plan (`@coderabbitai plan`). Read the approved plan. Follow it.
4. Create a branch for the issue. Use `feat/<issue-id>-<description>` or `fix/<issue-id>-<description>`. Do not commit to `main`.
5. Record user-facing or architecture changes under `## [Unreleased]` in `CHANGELOG.md`.
6. Run all local test, lint, format, and type checks before you commit. Correct all errors and warnings.
7. Use `.github/PULL_REQUEST_TEMPLATE.md`. Complete each field. Link the issue as specified in **Issue and Pull Request Governance**. Complete the Pre-Submission Governance checklist. Paste the terminal output from the checks.
8. Open the PR as a draft (`gh pr create --draft`).
9. Wait for all CI checks on the draft PR to pass.
10. Complete the required verification. Then mark the PR as ready for review (`gh pr ready`).
11. Review and resolve all CodeRabbit and GitHub Copilot comments. Check that Codecov shows zero errors, zero warnings, and no decrease in coverage.


> **Single source of truth** for all AI agents working on this codebase.
> Agent-specific wrappers (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`) reference this file.

## ️ Critical Rule: Never Bypass `unraid-api`

**This applies to each AI coding agent (Claude Code, Codex, Copilot, Gemini, etc.).**

All communication with the Unraid server **must** go through the
[`unraid-api`](https://github.com/tinkerologie/unraid-api) library.
The typed API client owns all server I/O. The library tests this code.

**You must not, under any circumstances:**

- Add direct GraphQL queries, REST/HTTP calls, websockets, SSH, or any other
  network I/O to the Unraid server from this repository.
- Re-implement, monkey-patch, vendor, fork, or work around `unraid-api`
  behaviour to "get a fix in faster."
- Parse raw server responses outside the library's typed models.

If a fix needs a missing field, query, mutation, or subscription, stop.
Also stop if the cause is a library bug. Do not add a workaround to this integration.

1. Explain to the user that the change belongs in the `unraid-api` library.
2. Open (or direct the user to open) an issue on the library repo:
   **https://github.com/tinkerologie/unraid-api**
3. Once the library ships the capability, consume it here through `UnraidClient`.

The only sanctioned data flow is:

`Entities → Coordinators → UnraidClient (unraid-api) → Unraid server`

## Project Identity

| Field                | Value                                         |
| -------------------- | --------------------------------------------- |
| **Domain**           | `unraid`                                      |
| **Integration name** | Unraid                                        |
| **Class prefix**     | `Unraid`                                      |
| **Code path**        | `custom_components/unraid/`                   |
| **Test path**        | `tests/`                                      |
| **Python**           | 3.14.2+ (`requires-python`). CI uses 3.14.2. |
| **HA minimum**       | 2026.9.0 (`hacs.json`, `pyproject.toml`). The device registry requires 2026.8. Probatio requires 2026.9. |
| **HA target**        | 2026.10 and later developer practice          |
| **Key dependency**   | `unraid-api>=1.16.0`                          |
| **iot_class**        | `local_polling` (plus websocket push for container stats and UPS) |
| **Config flow**      | Yes (UI only, no YAML)                        |
| **Platforms**        | `sensor`, `binary_sensor`, `switch`, `button`, `event`, `update` |

## Quick Commands

```bash
# Lint
./script/lint          # or: ruff check . --fix && ruff format .

# Test
./script/test          # or: pytest

# Full validation
./script/check

# Setup dev environment
./script/setup

# Start dev Home Assistant
./script/develop

# Type checking (pyright, basic mode — see pyrightconfig.json)
./script/type-check

# Spelling
./script/spell-check
```

The scripts activate `.local/ha-venv`. If a tool is missing there, install it with
`uv pip install --python .venv/bin/python <tool>`. CI installs dependencies with
`uv pip install . ".[dev]"` on Python 3.14.2, so the lock file is
for local reproducibility only.

## Architecture

### Data Flow

```text
Entities ──▶ Coordinator ──▶ UnraidClient (unraid-api) ──▶ Unraid Server (GraphQL)
   ▲              │ ▲
   └──────────────┘ └── UnraidWebSocketManager (GraphQL subscriptions push
     (coordinator.data)   container stats / UPS updates into the coordinators)
```

### Triple Coordinator Pattern

Three `DataUpdateCoordinator` subclasses poll at different intervals:

| Coordinator                | Interval | Data                                                                     |
| -------------------------- | -------- | ------------------------------------------------------------------------ |
| `UnraidSystemCoordinator`  | 30s      | Server info, CPU/RAM metrics, Docker containers, VMs, UPS, notifications |
| `UnraidStorageCoordinator` | 5min     | Array state, disks, parity, shares, capacity                             |
| `UnraidInfraCoordinator`   | 15min    | Services, registration, cloud, remote access, plugins                    |

The integration uses fixed intervals, as specified by the HA Core guidelines. For an on-demand refresh, call `homeassistant.update_entity`.

### Runtime Data

```python
@dataclass
class UnraidRuntimeData:
    api_client: UnraidClient
    system_coordinator: UnraidSystemCoordinator
    storage_coordinator: UnraidStorageCoordinator
    infra_coordinator: UnraidInfraCoordinator
    websocket_manager: UnraidWebSocketManager
    server_info: dict


type UnraidConfigEntry = ConfigEntry[UnraidRuntimeData]
```

Access in platform setup: `entry.runtime_data.system_coordinator`, etc.

### Server Identity (`server_info["uuid"]`)

`server_info["uuid"]` is the only source of the `{server_uuid}` prefix.
Use it in entity unique IDs and the server device identifier `(DOMAIN, server_uuid)`.
Use it in `cleanup.py`, `async_remove_config_entry_device`, and diagnostics.
`async_setup_entry` calls `_resolve_server_identity()` once.

- Real UUID → the raw API UUID.
- Use `entry.unique_id` with its hostname if these two conditions apply.
  The API UUID is a known SMBIOS placeholder (`is_placeholder_uuid()` in `const.py`).
  The config flow set an `entry.unique_id` that starts with `{uuid}_` (#166, #183, #351).
- Anything else (host fallback, no unique ID, legacy raw-placeholder unique ID)
  → the raw API UUID.

Do not build registry keys from `ServerInfo.uuid` or `coordinator.data.info.uuid`.
`_async_migrate_registry_identity()` re-keys existing registry records
before platforms load. You can repeat this migration safely. See `docs/development/DECISIONS.md`.

### Data Classes

Each coordinator returns a typed dataclass:

- `UnraidSystemData` — `info`, `metrics`, `containers`, `vms`, `ups_devices`, `network_metrics`, `notification_overview`
- `UnraidStorageData` — `array`, `shares`, `parity_history` (+ convenience properties: `array_state`, `capacity`, `parity_status`, `boot`, `disks`, `parities`, `caches`)
- `UnraidInfraData` — `services`, `registration`, `cloud`, `remote_access`, `plugins`, `vars`

## Integration File Structure

```text
custom_components/unraid/
├── __init__.py          # Setup/teardown, UnraidRuntimeData, identity resolution + registry migration, platform forwarding
├── cleanup.py           # Stale dynamic-entity / empty-device pruning after each refresh
├── config_flow.py       # Config flow (user, reauth, reconfigure), options flow (UPS, container updates)
├── const.py             # All constants: domain, intervals, keys, placeholder UUIDs, states
├── coordinator.py       # Triple coordinator pattern + data classes
├── diagnostics.py       # Diagnostic data for troubleshooting (UUID/hostname redacted)
├── entity.py            # UnraidBaseEntity, UnraidEntity, dynamic-resource entity helpers
├── event.py             # Event entities (notifications, plugin operations)
├── frontend.py          # Registers the bundled Lovelace cards as a static path / resource
├── frontend/            # Built card bundle (sources live in /frontend at repo root)
├── sensor.py            # All sensor entities
├── binary_sensor.py     # All binary sensor entities
├── switch.py            # Container, VM, array, parity, disk spin switches
├── button.py            # Array, parity, notification, disk, VM buttons
├── update.py            # Per-container update entities
├── websocket.py         # UnraidWebSocketManager: GraphQL subscriptions → coordinators
├── icons.json           # Icon definitions per translation key
├── strings.json         # English translations (source of truth)
├── translations/en.json # Generated from strings.json
├── manifest.json        # Integration metadata
└── quality_scale.yaml   # HA quality scale self-assessment (every rule listed)
```

## Code Style & Conventions

### General

- **Line length**: 88 characters (ruff formatter)
- **Linter**: ruff (`E`, `W`, `F`, `I`, `C`, `B`, `UP` rules)
- **Target**: Python 3.14 (ruff `target-version = "py314"`, `requires-python >= 3.14.2`)
- **Imports**: Use `from __future__ import annotations` in each file
- **Type hints**: Add type hints to all public functions. Use a `TYPE_CHECKING` guard for import-only types.
- **Logging**: `_LOGGER = logging.getLogger(__name__)` — use `_LOGGER.debug()` for data updates, `.info()` for lifecycle, `.warning()` for user-visible issues, `.error()` for failures
- **Constants**: Define in `const.py` with `Final` type annotation
- **Strings**: f-strings preferred

### Entity Pattern

Entity class hierarchy:

```text
CoordinatorEntity
  └── UnraidBaseEntity          # Base: device_info, unique_id, availability
        └── UnraidEntity        # + EntityDescription support
```

Entity MRO for platform entities: `PlatformEntity, UnraidBaseEntity` (for example, `SensorEntity, UnraidBaseEntity`)

Key patterns:

- `_attr_has_entity_name = True` (always, set on `UnraidBaseEntity`)
- `_attr_translation_key = "..."` for translated names through `strings.json`
- Unique ID format: `{server_uuid}_{resource_id}` where `server_uuid` is `server_info["uuid"]` (see *Server Identity* above)
- Access coordinator data: `data: UnraidSystemData | None = self.coordinator.data`
- Use `@property` for `native_value`, `is_on`, `extra_state_attributes`
- Per-resource entities (disks, containers, VMs) store `_disk_id` / `_container_id` and implement `_get_disk()` / `_get_container()` helper

### Coordinator Pattern

- Extend `DataUpdateCoordinator[UnraidXxxData]`
- Authentication errors → `raise ConfigEntryAuthFailed`
- Connection/timeout errors → `raise UpdateFailed`
- Optional services (Docker, VMs, UPS, network) → fail gracefully with `_LOGGER.debug()`, return `None` (preserving last known-good cache)
- Log recovery when connection restored after previous failure
- Pass `config_entry=` to `super().__init__()`

### Config Flow

- Steps: `user` → `reauth_confirm` → `reconfigure`
- SSL auto-detection: Try HTTPS first, fall back to HTTP on `UnraidSSLError`
- Compare the API version from `get_server_info()` with `MIN_API_VERSION`. The integration requires GraphQL API `v4.31.1+` and has no Unraid OS version requirement. Update the API with the Connect plugin.
- Options flow: `OptionsFlowWithReload` for UPS capacity/power settings
- Use the server UUID from `api_client.get_server_info()`. For a placeholder SMBIOS UUID, use `{uuid}_{hostname}`. If the UUID is missing, use the host.
- `_get_reauth_entry()` / `_get_reconfigure_entry()` + `async_update_reload_and_abort()`. Do not use them with an update listener (deprecated 2026.6, error from 2026.12)
- HA 2026.10+ supplies translations for shared abort reasons such as `already_configured` and `reauth_successful`.

### Error Handling

- Use HA translation system for user-facing errors: `translation_domain=DOMAIN`, `translation_key="..."`, `translation_placeholders={...}`
- Wrap API errors in `HomeAssistantError` for entity actions (switch on/off, button press)
- Raise `ConfigEntryAuthFailed` for a rejected API key. Home Assistant starts the reauthentication flow and creates a repair issue. Do not create a second issue.
- Create repair issues only for problems the user can correct and that Home Assistant does not report. One example is `docker_stats_stalled`. Clear the issue when the problem stops.

### Models & Data

- All API data comes as Pydantic v2 models from `unraid-api` library
- Use `extra="ignore"` on Pydantic models to handle API evolution
- Enum values from API: always compare with `.upper()` for case-insensitive matching

## Home Assistant API Currency (2026.10+)

Use current Core APIs. Do not use the deprecated or removed APIs in the table. CI tests run on the current HA release. Many of these APIs raise `RuntimeError` through `report_usage`.

| Do not use | Use instead | Since |
| --- | --- | --- |
| `hass.data[DOMAIN]` for runtime state | `entry.runtime_data` (`UnraidRuntimeData`) | 2024.4 |
| `async_forward_entry_setup` (singular) | `async_forward_entry_setups(entry, PLATFORMS)` | removed 2025.6 |
| `OptionsFlowWithConfigEntry`, setting `OptionsFlow.config_entry` | `OptionsFlowWithReload` / `OptionsFlow` (read-only `self.config_entry`) | 2025.12 |
| `DataUpdateCoordinator(...)` without `config_entry=` | always pass `config_entry=entry` | 2025.x |
| `dr.async_get_device(identifiers=...)` | `async_get_device_by_identifier((DOMAIN, id), entry.entry_id)` | 2026.8 (removed 2027.8) |
| `DeviceEntry.config_entries`, `primary_config_entry` | `DeviceEntry.config_entry_id` (a device has one entry) | 2026.8 / reports 2026.10 |
| `async_update_device(add_config_entry_id= / remove_config_entry_id= / merge_identifiers=)` | `new_config_entry_id=`, `new_identifiers=` | 2026.8 |
| `DeviceInfo(via_device=...)` | `via_device_id=` | 2026.8 |
| Mapping construction or dictionary operations on `DeviceInfo` (`[]`, `.get()`, `.update()`, `.copy()`, iteration, `\|`, truthiness) | Construct with keyword arguments. Use attributes for fields. Compare complete `DeviceInfo(...)` objects in tests for older HA versions. | Dataclass from 2026.11. Dictionary support will end later. |
| `DeviceInfo` fields `created_at`, `modified_at`, `default_manufacturer`, `default_model`, `default_name` | Use `manufacturer`, `model`, `name`. Let HA set registry timestamps. | removed 2027.9 |
| Returning `False` from `async_migrate_entry` | raise `ConfigEntryNotReady` / `ConfigEntryError` | 2026.10 |
| `CONCENTRATION_*` constants, or `PERCENTAGE` as a unit | `UnitOfDensity`, `UnitOfRatio.PERCENTAGE` | 2026.7 |
| `FlowHandler.show_advanced_options` | remove the check (always true) | 2026.6 (removed 2027.6) |
| Entity IDs whose domain differs from the platform | matching domain | 2026.4 (stops 2027.5) |
| `RestoreStateData.last_states` | `async_get_stored_state` | 2026.11 |
| `import voluptuous as vol` | `import probatio as vol` (HA 2026.9+). The `voluptuous` name is a `sys.modules` alias. Do not install the package. | 2026.9 |
| `data_entry_flow.FlowResult` as a step return type | `ConfigFlowResult` (`RepairsFlowResult` for any repair flow) | 2024.x |
| `"%"`, `"GiB"` and other unit string literals | `UnitOfRatio.PERCENTAGE`, `UnitOfInformation.GIBIBYTES`, ... | 2026.7 |

Home Assistant 2026.11 follow-ups (#394), keep them when touching these areas:

- An entity class that overrides `async_added_to_hass`, `async_will_remove_from_hass`
  or `async_prepare_to_add_to_hass` must also define `async_entity_id_changed`
  that calls `async_delegate_entity_id_changed(super(), old_entity_id)`
  (`entity.py`). Otherwise 2026.11 removes and re-adds it on an entity ID change,
  and 2027.11 drops that fallback. `tests/test_entity.py` fails on a class that
  misses it.
- For a repair issue about one config entry, include the entry ID in the issue ID
  (`docker_stats_stalled_issue_id(entry_id)`). Include `data={"entry_id": ...}`.
  Pass `config_entry_id=` only if `ir.async_create_issue` accepts it
  (2026.11+, see `_ISSUES_TAKE_CONFIG_ENTRY`).
  `async_setup` deletes the old `auth_failed` issues from before #420, even for disabled entries.
  `async_remove_entry` also deletes these issues.
- `manifest.json` has `categories` (`computers_network.nas_servers`). Hassfest
  from a Core older than 2026.11 rejects the key, so validate locally with
  `HA_VERSION=2026.11.0b1` or later. The Hassfest image in CI accepts this key.
- Each `async_show_form`/`async_show_menu`/`async_show_progress` passes
  `step_id` (required from 2027.5).

Continue to use these APIs.

- Configuration and errors: `cv.config_entry_only_config_schema`, `ConfigType`,
  `UpdateFailed(retry_after=...)`, `ServiceValidationError`, and `ir.async_create_issue`.
- Entities: frozen `EntityDescription` dataclasses, `async_prepare_to_add_to_hass`
  (2026.10), and `async_entity_id_changed` (2026.11).
- Registry migrations: `er.async_migrate_entries` and
  `async_update_entity(new_unique_id=...)`. Check for conflicts with
  `async_get_entity_id` before the update. A conflict raises `ValueError`.

Check this month's posts before you change registries, config flows, or device information.
See the [Home Assistant developer blog](https://developers.home-assistant.io/blog/).

## Testing

### Setup

```bash
uv pip install -e ".[dev]"
# or
./script/setup
```

The test extra pins Home Assistant separately from the runtime minimum. The `[tool.uv.sources]` section pins the Core commit for `pytest-home-assistant` until the package is on PyPI.

To update the test baseline, change the HA test pin and the plugin commit together.
Run `uv lock`. Run all tests. Use uv to install dependencies from the pinned source. `script/setup/bootstrap` removes the retired plugin
from existing environments. Do not install both plugins in the same environment.
Bootstrap, upgrade, develop and automatic test setup refuse to downgrade a newer
installed HA to the test pin. Use a separate test virtual environment in that case.

### Structure

```text
tests/
├── conftest.py                 # Shared fixtures: mock API client, coordinators, config entries, data factories
├── fixtures/                   # JSON fixtures for API responses
├── test_init.py                # Setup/teardown tests
├── test_identity_migration.py  # Server identity resolution + registry migration (#351)
├── test_config_flow.py         # Config flow tests
├── test_coordinator.py         # Coordinator tests
├── test_cleanup.py             # Stale entity / device cleanup
├── test_websocket.py           # Subscription manager
├── test_frontend.py            # Card registration
├── test_diagnostics.py, test_legacy_auth_issue.py, test_entity.py
├── test_sensor.py, test_binary_sensor.py, test_switch.py, test_button.py
└── test_event.py, test_update.py
```

### Patterns

- Use the official `pytest-home-assistant` plugin. Import helpers from `pytest_homeassistant.common`.
- Mock `UnraidClient` methods, not HTTP calls
- Use `pytest-asyncio` with `asyncio_mode = "auto"`
- Fixtures provide pre-built coordinator data classes
- Test both happy path and error scenarios (auth failure, connection loss, missing optional data)
- Test registry behavior with the registries from the `hass` fixture (`er.async_get(hass)`, `dr.async_get(hass)`) with `MockConfigEntry.add_to_hass(hass)`. Do not mock the registries.
- Use `hass.config_entries.async_setup(entry.entry_id)` in full integration tests. Setup of the first domain entry loads all entries. Patch `async_register_frontend` and `UnraidWebSocketManager`.
- Deprecated Core APIs raise `RuntimeError` in tests (`report_usage` has no integration frame). Correct the integration code if a test reports deprecation.
- All deprecation checks must pass (#391).
  - `pyproject.toml` `filterwarnings` turns `DeprecationWarning` and `PendingDeprecationWarning` raised from `custom_components.unraid` into errors.
  - The autouse `deprecation_report_guard` fixture starts before `hass` and stops after it.
    It fails a test if Home Assistant logs any of these reports.
    - Frame helper: `Detected that custom integration 'unraid' …`
    - Deprecation helpers: `The deprecated … was <verb> from unraid.`
    - Deprecated entity class member (HA 2026.11+): `custom_components.unraid.<module>::<Class> provides the deprecated <name>, …`
  - Class-definition reports fire at import time, before any fixture, so `tests/test_deprecation_currency.py` also runs `python3 script/ha_next.py import-check` in a fresh interpreter. Keep the three patterns in `tests/conftest.py` and `script/ha_next.py` identical (a test enforces it).
  - When a check fires, fix the integration code. Keep the filter, patterns, and guard in effect. A test that emits a report on purpose takes `deprecation_report_guard` and clears it.
- After deploying to a live Home Assistant, search its log for `Detected that custom integration 'unraid'` (the `report_usage` deprecation report) and for `custom_components.unraid` warnings. Correct both types of report before you open a PR.

### Running Tests

```bash
pytest                           # All tests with coverage
pytest tests/test_sensor.py      # Single module
pytest -k "test_cpu"             # Pattern match
pytest --no-cov                  # Skip coverage for speed
```

## Boundaries

### Always Do

- Read existing code before modifying — understand patterns in place
- Follow the entity class hierarchy (`UnraidBaseEntity` or `UnraidEntity`)
- Use `_attr_translation_key` for entity names (not hardcoded strings)
- Add translation keys to `strings.json` when creating new entities
- Match existing icon patterns in `icons.json`
- Use typed coordinator data access (for example, `data: UnraidSystemData | None = self.coordinator.data`)
- Handle `None` coordinator data gracefully
- Use `Final` type annotations for constants in `const.py`
- Run `./script/lint` before committing
- Pass `config_entry=` to coordinator `super().__init__()`
- Use `entry.runtime_data` to access runtime data (not `hass.data[DOMAIN]`)

### Ask First

- Adding new platforms (beyond sensor, binary_sensor, switch, button, event, update)
- Changing coordinator polling intervals
- Modifying the config flow steps
- Adding new dependencies to `manifest.json` or `pyproject.toml`
- Changing entity unique ID format or the server identity rule (requires a registry migration to keep existing installations working)
- Modifying `UnraidRuntimeData` structure
- Updating the `unraid-api` library version

### Never Do

- **Bypass `unraid-api`** — no direct GraphQL/HTTP/WebSocket/SSH/raw-socket I/O to the Unraid server. Do not reimplement, monkey-patch, vendor, or bypass `UnraidClient`. CI (`check-api-boundary.yml`) blocks this automatically. If the library is missing a capability, stop and open an issue at **https://github.com/tinkerologie/unraid-api**.
- Make polling intervals user-configurable (HA Core policy)
- Skip `from __future__ import annotations`
- Use bare `except:` — always catch specific exceptions
- Hardcode entity names (use translation keys)
- Auto-update `translations/` files other than `en.json`
- Import from `homeassistant.core` at module level in entity files (use `TYPE_CHECKING`)
- Use `entity_id` for identification (use `unique_id`)
- Derive unique IDs or device identifiers from `ServerInfo.uuid` directly (use `server_info["uuid"]`)
- Use deprecated core APIs listed under *Home Assistant API Currency*
- Store state in the entity that should be in the coordinator
- Commit secrets, API keys, or credentials
- Use `hass.data[DOMAIN]` directly (use `config_entry.runtime_data`)
- Use blocking I/O in async functions
- Remove existing tests without replacement

## Commit Format

```text
type: short description

Longer explanation if needed.
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`

## Releases

The release workflow starts when a manifest version change reaches `main`.
The changelog must have a matching `## [VERSION]` section.
In one run, `release.yml` creates the `vVERSION` tag, builds the archive, and publishes the release.

- **`build`** (read-only, `id-token`/`attestations: write`) checks out the tag.
  The job runs `script/build_release.py --tag vVERSION`.
  It puts the tracked files from `custom_components/unraid/` at the root of `unraid.zip`.
  HACS and the Marketplace extract the archive into `custom_components/unraid/`.
  The job writes `SHA256SUMS` and attests the archive.
- **`publish`** (`contents: write`) verifies the checksum and attestation,
  uploads to a draft, then publishes, so release immutability works.

`hacs.json` sets `zip_release: true` and `filename: "unraid.zip"`. Keep
this file name and place the asset at the archive root. The build fails if the manifest and tag disagree.
It also fails if a relative Python import, frontend import, or `CARD_FILES` bundle is missing. CI's `Release zip` job builds twice and compares
the bytes. Try it locally with
`python3 script/build_release.py --tag v$(jq -r .version custom_components/unraid/manifest.json)`.

## Watching upcoming Home Assistant releases

Two non-blocking scheduled workflows (both with `workflow_dispatch`) warn before
a Home Assistant release breaks the integration:

- **`HA Next`** (`ha-next.yml`) checks two channels each week.
  The `script/ha_next.py resolve` command selects both targets.
  The `pypi` channel uses the latest exact `homeassistant` version, including beta releases.
  Do not use `--prerelease allow`.
  The `dev` channel uses `git ls-remote` to pin Core's `dev` branch to one commit.
  The installation and Hassfest use the same Core target.

  For each channel, the job runs the import check, the full pytest suite, and `script/hassfest`.
  It uses the official test plugin from the applicable Core commit.
  All five results must pass, including pytest.
  On `main`, the job identifies each channel issue by its `<!-- ha-next-channel: … -->` marker.
  A failure opens or updates an issue with the `ha-next` and `bug` labels.
  A pass adds a comment to the issue and closes it.
- **`HA dev blog watch`** (`ha-dev-blog.yml`) runs `script/ha_blog_watch.py scan` each week.
  It checks 22 days of posts to cover late or failed runs. A manual run accepts `days`. It reads the developer blog feed and
  takes inline code from paragraphs and list items that announce a change.
  It searches the integration's code and ignores comments and strings.
  It opens one `HA dev blog: <post title>` issue for each post that names code the integration uses.
  The issue uses the `ha-dev-blog` and `enhancement` labels.
  It checks the post link in open and closed issues to prevent duplicates.

The workflow creates a label first if it does not exist.
It sets `bug` or `enhancement` when it opens an issue.
A `GITHUB_TOKEN` issue does not start `issue-labeler.yml`.
CodeRabbit needs one of these labels to write a plan.

Set `HA_VERSION` to a tag, `dev`, or a 40-character Core commit.
On each run, `script/hassfest` updates its sparse Core checkout to that target.
From Core 2026.11, `packages/hassfest` contains the validator.
The script calls `uv run --no-project --with-editable <core>/packages/hassfest`.
Make sure `uv` is on `PATH`. Install the `homeassistant` version that matches the validation target.

## Debugging

```yaml
# Enable debug logging in configuration.yaml
logger:
  default: info
  logs:
    custom_components.unraid: debug
    unraid_api: debug
```

Check diagnostics through: Settings > Devices & Services > Unraid > (...) > Download diagnostics

## Quality Scale

The integration targets **Platinum** level on the [HA Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/). Current status:

- **Bronze**: All rules done/exempt (including `docs-conditions` and `docs-triggers`, added mid-2026)
- **Silver**: All rules are complete. `test-coverage` is **>=95%** per module (total ~97%)
- **Gold**: All done/exempt
- **Platinum**: All done (async dependency, inject websession, strict typing)

List each rule in `quality_scale.yaml` (`done`, `todo`, or
`{status: exempt, comment: ...}`). Hassfest checks the file for Core
integrations only. Check the file manually for this integration.

## Issue and Pull Request Governance

These rules apply to each contributor, including AI coding agents. The full org-wide rules are in
[GOVERNANCE.md](https://github.com/tinkerologie/.github/blob/main/GOVERNANCE.md).

1. **Issue first.** Open an issue with the bug or enhancement template before you open a pull
   request. Use `[Bug]:` or `[Enhancement]:`, followed by a space and the title.
   The labeler adds `bug` or `enhancement` when it can identify the issue type.
   CodeRabbit then adds a Coding Plan to the issue. Follow that plan.
   The labeler skips issues with `question`, `duplicate`, `invalid`, `wontfix`, or `no-type`.
   It does not add a type label again if a maintainer removed it.
2. **Link the issue.** In **Related Issues**, use `Closes #<number>`, `Fixes #<number>`, or
   `Resolves #<number>` if the PR completes the issue. GitHub then closes the issue when
   the PR merges. For partial work, use `Part of #<number>` or `Related to #<number>`.
   Link to an existing issue. You can link to an issue in another public repository
   with `owner/repo#123`. Only contributors with write access or higher can use
   `None` for maintenance work such as CI, documentation, or dependency updates.
3. **One change at a time.** GitHub limits contributors without write access to two open,
   non-draft pull requests. Draft pull requests do not count. Do not edit files that another
   open PR changes. Examples include `CHANGELOG.md`, translations, `README.md`, and generated
   bundles. Wait for the first PR to merge. Then rebase your branch before you continue.
4. **Act on the Tinkerologie-Bot report.** If the PR governance check fails, the bot lists
   all problems in one numbered comment. Correct each problem in the PR description
   or push the necessary change. The check runs again and the bot updates the comment.
5. **Rebase before review.** Rebase on `main` before you mark the PR ready for review.
6. **Resolve conflicts first.** If the PR has the `conflicts` label, rebase on `main`.
   Resolve the conflicts. Keep all `CHANGELOG.md` entries under `[Unreleased]`.
   Run the tests again. Force-push the branch before you do other work.
7. **Coverage.** Tests must cover at least 90% of the added or changed lines for
   `codecov/patch`. Add tests for uncovered lines in the Codecov comment.
   In the PR description, explain each line that still has no coverage.
   Do not decrease coverage targets or add coverage ignore rules to pass the check.
8. **Stale items.** The bot adds `stale` to issues and PRs after 14 days without activity.
   It closes them 30 days later if there is no new activity. The bot skips these labels.
   - Issues: `pinned`, `security`, `confirmed`, `work-in-progress`, `priority: critical`, `priority: high`.
   - Pull requests: `pinned`, `security`, `work-in-progress`.
