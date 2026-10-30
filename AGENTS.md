# AI Agent Instructions — ha-unraid

## Mandatory Development Workflow for AI Agents

All AI coding assistants (Claude Code, Gemini, GitHub Copilot, Cursor, Roo, Devin, etc.) MUST strictly adhere to the following workflow when working on this repository:

1. Issue-First Requirement: Never start writing code or creating pull requests without an existing GitHub Issue.
2. Issue Template: Issues must be created using the official Issue Forms (`01-bug-report.yml` for bugs or `02-enhancement-request.yml` for enhancements).
3. CodeRabbit AI Plan: Every issue must have a generated Coding Plan from CodeRabbit AI (`@coderabbitai plan`). AI agents must read and implement strictly according to the approved plan.
4. Branch Discipline: Always create and work on a dedicated branch (`feat/<issue-id>-<description>` or `fix/<issue-id>-<description>`). NEVER commit directly to `main`.
5. Documentation & Changelog: Update `CHANGELOG.md` under `## [Unreleased]` for any user-facing or architectural changes.
6. Local Verification: Run all test, lint, format, and typecheck commands locally before committing. All tests must pass with zero errors and zero warnings.
7. PR Template Completion: Always use `.github/PULL_REQUEST_TEMPLATE.md`. Complete all fields, link the issue using `Closes #<id>` or `Fixes #<id>` when the PR fully resolves it, or `Part of #<id>` for partial work (only maintainers with write access may write `None`, for housekeeping), and check all Pre-Submission Governance boxes with real terminal output.
8. Draft PR First: ALWAYS open pull requests as DRAFT (`gh pr create --draft`).
9. CI Verification: Wait for CI workflows to run on the draft PR and verify that all status checks pass.
10. Ready for Review: Only mark the PR as ready for review (`gh pr ready`) once all checks pass and all due diligence is verified.
11. Review Clearance: Review and resolve all CodeRabbit AI and GitHub Copilot comments. Ensure Codecov reports show zero errors, zero warnings, and no coverage drop.


> **Single source of truth** for all AI agents working on this codebase.
> Agent-specific wrappers (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`) reference this file.

## ️ Critical Rule: Never Bypass `unraid-api`

**This applies to every AI coding agent (Claude Code, Codex, Copilot, Gemini, etc.).**

All communication with the Unraid server **must** go through the
[`unraid-api`](https://github.com/tinkerologie/unraid-api) library. This is a
hard requirement, not a preference — it keeps the integration compliant with
Home Assistant best practice (a single, typed, tested API client owns all I/O).

**You must not, under any circumstances:**

- Add direct GraphQL queries, REST/HTTP calls, websockets, SSH, or any other
  network I/O to the Unraid server from this repository.
- Re-implement, monkey-patch, vendor, fork, or work around `unraid-api`
  behaviour to "get a fix in faster."
- Parse raw server responses outside the library's typed models.

**If a fix appears to require functionality that `unraid-api` does not expose**
(a missing field, query, mutation, subscription, or a library bug): **STOP.** Do
not implement a workaround in this repository. Instead:

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
| **Python**           | 3.14.2+ (`requires-python`; CI uses 3.14.2) |
| **HA minimum**       | 2026.9.0 (`hacs.json`, `pyproject.toml`; device registry 2026.8 + Probatio 2026.9) |
| **HA target**        | 2026.10 and later developer practice          |
| **Key dependency**   | `unraid-api>=1.14.1`                          |
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
`uv pip install --python .venv/bin/python <tool>`; CI installs fresh with
`uv pip install . ".[dev]" homeassistant` on Python 3.14.2, so the lock file is
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

Intervals are **fixed** per HA Core guidelines (not user-configurable). Users can call `homeassistant.update_entity` for on-demand refresh.

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

`server_info["uuid"]` is the **only** source of the `{server_uuid}` prefix used by
entity unique IDs, the server device identifier `(DOMAIN, server_uuid)`,
`cleanup.py`, `async_remove_config_entry_device` and diagnostics. It is resolved
once in `async_setup_entry` by `_resolve_server_identity()`:

- Real UUID → the raw API UUID.
- Known placeholder SMBIOS UUID (`is_placeholder_uuid()` in `const.py`) **and**
  `entry.unique_id` starts with `{uuid}_` → the hostname-qualified
  `entry.unique_id` that the config flow created (#166, #183, #351).
- Anything else (host fallback, no unique ID, legacy raw-placeholder unique ID)
  → the raw API UUID.

Never build registry keys from `ServerInfo.uuid` or `coordinator.data.info.uuid`.
`_async_migrate_registry_identity()` re-keys existing registry records
idempotently before platforms load; see `docs/development/DECISIONS.md`.

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
├── repairs.py           # Repair flows (auth failed)
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
- **Imports**: Use `from __future__ import annotations` in every file
- **Type hints**: Required on all public functions; use `TYPE_CHECKING` guard for import-only types
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

Entity MRO for platform entities: `PlatformEntity, UnraidBaseEntity` (e.g., `SensorEntity, UnraidBaseEntity`)

Key patterns:

- `_attr_has_entity_name = True` (always, set on `UnraidBaseEntity`)
- `_attr_translation_key = "..."` for translated names via `strings.json`
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
- Version checking: API version from `get_server_info()` compared against `MIN_API_VERSION` (requires GraphQL API `v4.31.1+`; no Unraid OS version requirement — API upgradeable via Connect plugin)
- Options flow: `OptionsFlowWithReload` for UPS capacity/power settings
- Unique ID: server UUID from `api_client.get_server_info()`; a placeholder SMBIOS UUID is qualified as `{uuid}_{hostname}`; a missing UUID falls back to the host
- `_get_reauth_entry()` / `_get_reconfigure_entry()` + `async_update_reload_and_abort()`; never pair those with an update listener (deprecated 2026.6, error from 2026.12)
- Shared abort reasons (`already_configured`, `reauth_successful`, ...) are translated centrally by HA 2026.10+

### Error Handling

- Use HA translation system for user-facing errors: `translation_domain=DOMAIN`, `translation_key="..."`, `translation_placeholders={...}`
- Wrap API errors in `HomeAssistantError` for entity actions (switch on/off, button press)
- Create repair issues (`ir.async_create_issue`) for persistent auth failures
- Clear repair issues on successful reconnection

### Models & Data

- All API data comes as Pydantic v2 models from `unraid-api` library
- Use `extra="ignore"` on Pydantic models to handle API evolution
- Enum values from API: always compare with `.upper()` for case-insensitive matching

## Home Assistant API Currency (2026.10+)

Write new code against current core APIs. These are **deprecated or removed** and
must not be (re)introduced; CI tests run on the current HA release where many of
them raise `RuntimeError` through `report_usage`:

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
| Returning `False` from `async_migrate_entry` | raise `ConfigEntryNotReady` / `ConfigEntryError` | 2026.10 |
| `CONCENTRATION_*` constants; `PERCENTAGE` as a unit | `UnitOfDensity`, `UnitOfRatio.PERCENTAGE` | 2026.7 |
| `FlowHandler.show_advanced_options` | remove the check (always true) | 2026.6 (removed 2027.6) |
| Entity IDs whose domain differs from the platform | matching domain | 2026.4 (stops 2027.5) |
| `RestoreStateData.last_states` | `async_get_stored_state` | 2026.11 |
| `import voluptuous as vol` | `import probatio as vol` (HA 2026.9+ engine; voluptuous is only a `sys.modules` alias and is not installed) | 2026.9 |
| `data_entry_flow.FlowResult` as a step return type | `ConfigFlowResult` / `RepairsFlowResult` | 2024.x |
| `"%"`, `"GiB"` and other unit string literals | `UnitOfRatio.PERCENTAGE`, `UnitOfInformation.GIBIBYTES`, ... | 2026.7 |

Home Assistant 2026.11 follow-ups (#394), keep them when touching these areas:

- An entity class that overrides `async_added_to_hass`, `async_will_remove_from_hass`
  or `async_prepare_to_add_to_hass` must also define `async_entity_id_changed`
  that calls `async_delegate_entity_id_changed(super(), old_entity_id)`
  (`entity.py`). Otherwise 2026.11 removes and re-adds it on an entity ID change,
  and 2027.11 drops that fallback. `tests/test_entity.py` fails on a class that
  misses it.
- Repair issues that concern one config entry put the entry ID in the issue ID
  (`auth_failed_issue_id(entry_id)`), carry `data={"entry_id": ...}`, and pass
  `config_entry_id=` only where `ir.async_create_issue` accepts it (2026.11+;
  see `_ISSUES_TAKE_CONFIG_ENTRY`). `async_remove_entry` deletes them for older releases.
- `manifest.json` has `categories` (`computers_network.nas_servers`). Hassfest
  from a Core older than 2026.11 rejects the key, so validate locally with
  `HA_VERSION=2026.11.0b1` or later; CI's Hassfest image accepts it.
- Every `async_show_form`/`async_show_menu`/`async_show_progress` passes
  `step_id` (required from 2027.5).

Still current and expected: `cv.config_entry_only_config_schema`, `ConfigType`,
frozen `EntityDescription` dataclasses, `UpdateFailed(retry_after=...)`,
`ServiceValidationError`, `ir.async_create_issue`, `er.async_migrate_entries` /
`async_update_entity(new_unique_id=...)` for registry migrations (pre-check with
`async_get_entity_id`; a conflict raises `ValueError`), and the entity lifecycle
hooks `async_prepare_to_add_to_hass` (2026.10) / `async_entity_id_changed` (2026.11).

Developer blog index: https://developers.home-assistant.io/blog/ — check it for
the current month before touching registries, config flows or device info.

## Testing

### Setup

```bash
pip install -e ".[dev]"
# or
./script/setup
```

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
├── test_diagnostics.py, test_repairs.py, test_entity.py
├── test_sensor.py, test_binary_sensor.py, test_switch.py, test_button.py
└── test_event.py, test_update.py
```

### Patterns

- Use `pytest-homeassistant-custom-component` for HA test infrastructure
- Mock `UnraidClient` methods, not HTTP calls
- Use `pytest-asyncio` with `asyncio_mode = "auto"`
- Fixtures provide pre-built coordinator data classes
- Test both happy path and error scenarios (auth failure, connection loss, missing optional data)
- Registry behaviour is tested against the real registries from the `hass` fixture (`er.async_get(hass)`, `dr.async_get(hass)`) with `MockConfigEntry.add_to_hass(hass)`; never mock the registries
- Full-integration tests use `hass.config_entries.async_setup(entry.entry_id)`; setting up the first entry of the domain loads every entry, and `async_register_frontend` / `UnraidWebSocketManager` must be patched
- Deprecated core APIs raise `RuntimeError` in tests (`report_usage` with no integration frame), so a failing test that mentions "deprecated" means the code, not the test, must change
- Deprecation checks are blocking (#391):
  - `pyproject.toml` `filterwarnings` turns `DeprecationWarning` and `PendingDeprecationWarning` raised from `custom_components.unraid` into errors.
  - The `deprecation_report_guard` fixture (first dependency of the autouse `auto_enable_custom_integrations`) fails a test when Home Assistant logs one of its three reports about `unraid`: `Detected that custom integration 'unraid' …` (frame helper), `The deprecated … was <verb> from unraid.` (deprecation helpers), and `custom_components.unraid.<module>::<Class> provides the deprecated <name>, …` (an entity class defining a deprecated member, HA 2026.11+).
  - Class-definition reports fire at import time, before any fixture, so `tests/test_deprecation_currency.py` also runs `python3 script/ha_next.py import-check` in a fresh interpreter. Keep the three patterns in `tests/conftest.py` and `script/ha_next.py` identical (a test enforces it).
  - When a check fires, fix the integration code; never weaken the filter, the patterns or the guard. A test that emits a report on purpose takes `deprecation_report_guard` and clears it.
- After deploying to a live Home Assistant, search its log for `Detected that custom integration 'unraid'` (the `report_usage` deprecation report) and for `custom_components.unraid` warnings; both must be empty before a PR is opened

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
- Use typed coordinator data access (e.g., `data: UnraidSystemData | None = self.coordinator.data`)
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
- Changing entity unique ID format or the server identity rule (breaks existing installations; needs a registry migration)
- Modifying `UnraidRuntimeData` structure
- Updating the `unraid-api` library version

### Never Do

- **Bypass `unraid-api`** — no direct GraphQL/HTTP/WebSocket/SSH/raw-socket I/O to the Unraid server; no re-implementing, monkey-patching, vendoring, or working around `UnraidClient`. CI (`check-api-boundary.yml`) blocks this automatically. If the library is missing a capability, stop and open an issue at **https://github.com/tinkerologie/unraid-api**.
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

A manifest version bump on `main` with a matching `## [VERSION]` CHANGELOG
section makes `release.yml` tag `vVERSION`, then build and publish in the same run:

- **`build`** (read-only, `id-token`/`attestations: write`) checks out the tag
  and runs `script/build_release.py --tag vVERSION`. It packages the files Git
  tracks under `custom_components/unraid/` **at the zip root** as `unraid.zip`
  (HACS and the Marketplace extract it straight into `custom_components/unraid/`),
  writes `SHA256SUMS`, and attests the zip.
- **`publish`** (`contents: write`) verifies the checksum and attestation,
  uploads to a draft, then publishes, so release immutability works.

`hacs.json` sets `zip_release: true` and `filename: "unraid.zip"`; never rename
the asset or nest it in a folder. The builder fails on a manifest/tag mismatch,
an unresolved relative Python import, a missing `CARD_FILES` bundle or an
unresolved frontend import. CI's `Release zip` job builds twice and compares
the bytes. Try it locally with
`python3 script/build_release.py --tag v$(jq -r .version custom_components/unraid/manifest.json)`.

## Watching upcoming Home Assistant releases

Two non-blocking scheduled workflows (both with `workflow_dispatch`) warn before
a Home Assistant release breaks the integration:

- **`HA Next`** (`ha-next.yml`, weekly) runs a matrix of two channels, resolved by
  `script/ha_next.py resolve`: `pypi`, the newest `homeassistant` on PyPI
  including betas (pinned exactly, never `--prerelease allow`), and `dev`, the
  head of Core's `dev` branch pinned to one commit (`git ls-remote`), so the
  install and Hassfest test the same Core. Each channel runs the import check, `pytest` when a
  matching `pytest-homeassistant-custom-component` exists (never for `dev`;
  the summary says when it is skipped), and `script/hassfest` from the same
  Core. On `main`, each channel keeps one open issue, labelled `ha-next` and
  `bug` and found by its `<!-- ha-next-channel: … -->` marker: a failure opens
  it or comments on it, a pass comments and closes it.
- **`HA dev blog watch`** (`ha-dev-blog.yml`, weekly, looking back 22 days so a
  failed or late run is covered; dispatch takes `days`) runs
  `script/ha_blog_watch.py scan`. It reads the developer blog feed and
  takes inline code from paragraphs and list items that announce a change. It
  searches the integration's code (not comments or strings) for that code and
  opens one `HA dev blog: <post title>` issue, labelled `ha-dev-blog` and
  `enhancement`, per post that names code the integration uses. Duplicates are
  found by the post link in any issue body, open or closed.

Workflow-created issues get `bug` or `enhancement` in the create call because
issues opened with `GITHUB_TOKEN` never trigger `issue-labeler.yml`, and
CodeRabbit only writes a coding plan for issues with one of those labels.
Missing labels are created first.

`script/hassfest` takes `HA_VERSION` (a tag, `dev`, or a 40-character Core commit) and reconciles its sparse
Core checkout on every run. From Core 2026.11 the validator lives in
`packages/hassfest`; the script then runs it through
`uv run --no-project --with-editable <core>/packages/hassfest`, so `uv` must be
on `PATH`, and the installed `homeassistant` must match the Core it validates
against.

## Debugging

```yaml
# Enable debug logging in configuration.yaml
logger:
  default: info
  logs:
    custom_components.unraid: debug
    unraid_api: debug
```

Check diagnostics via: Settings > Devices & Services > Unraid > (...) > Download diagnostics

## Quality Scale

The integration targets **Platinum** level on the [HA Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/). Current status:

- **Bronze**: All rules done/exempt (including `docs-conditions` and `docs-triggers`, added mid-2026)
- **Silver**: All rules done; `test-coverage` is **>=95%** per module (total ~97%)
- **Gold**: All done/exempt
- **Platinum**: All done (async dependency, inject websession, strict typing)

Every rule must be listed in `quality_scale.yaml` (`done`, `todo`, or
`{status: exempt, comment: ...}`); hassfest validates the file for core
integrations only, so keep it honest by hand.

## Issue and Pull Request Governance

These rules apply to every contributor, including AI coding agents. The full org-wide rules are in
[GOVERNANCE.md](https://github.com/tinkerologie/.github/blob/main/GOVERNANCE.md).

1. **Issue first.** Open an issue with the bug or enhancement template before opening a pull
   request. Keep the title prefix `[Bug]:` or `[Enhancement]:`, followed by a space and the title.
   Automation applies the `bug` or `enhancement` label when it can tell the type, and CodeRabbit
   then posts a Coding Plan on the issue. Implement from that plan. The labeler skips issues labeled
   `question`, `duplicate`, `invalid`, `wontfix`, or `no-type`, and never re-adds a type label that
   a maintainer removed.
2. **Link the issue.** In the PR's **Related Issues** section, write `Closes #<number>` (or `Fixes`
   or `Resolves`) when the PR completely resolves the issue; these keywords close it on merge. Use
   `Part of #<number>` or `Related to #<number>` for partial work. The linked issue must exist; an
   issue in another public repository (`owner/repo#123`) is fine. Only authors with write access or
   higher (maintainers) may write `None`, for housekeeping such as CI,
   documentation, or dependency updates; PR governance rejects `None` from everyone else.
3. **One change at a time.** Contributors without write access can have at most 2 open, non-draft
   pull requests here. GitHub enforces this limit, and draft pull requests do not count toward it.
   Do not open PRs that edit the same files as another open PR, such as `CHANGELOG.md`,
   translations, `README.md`, or generated bundles. Wait for the first to merge, rebase, then
   continue.
4. **Act on the Tinkerologie-Bot report.** When PR governance fails, Tinkerologie-Bot posts one comment
   listing every problem as a numbered item. Fix each item by editing the PR description or pushing
   the missing change; the check re-runs and the comment updates to passed.
5. **Rebase before review.** Rebase on `main` before marking a PR ready for review.
6. **Resolve conflicts first.** When a PR gets the `conflicts` label, rebase on `main`,
   resolve the conflicts (keep every `CHANGELOG.md` entry under `[Unreleased]`), re-run the tests,
   and force-push before doing any other work.
7. **Coverage.** `codecov/patch` must pass: at least 90% of added or changed lines must be
   covered by tests. The gate is the percentage; still, add tests for the uncovered lines the
   Codecov PR comment lists, and explain in the PR description any line you leave uncovered. Do
   not lower coverage targets or add coverage ignore rules to make it pass.
8. **Stale items.** Issues and PRs with no activity for 14 days are labeled `stale` and closed 30
   days later unless there is new activity. These labels are exempt:
   - Issues: `pinned`, `security`, `confirmed`, `work-in-progress`, `priority: critical`, `priority: high`.
   - Pull requests: `pinned`, `security`, `work-in-progress`.
