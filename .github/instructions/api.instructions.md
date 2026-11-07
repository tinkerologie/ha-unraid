---
applyTo: "custom_components/unraid/__init__.py,custom_components/unraid/config_flow.py,custom_components/unraid/coordinator.py"
---

# API Usage Guidelines — ha-unraid

Refer to `AGENTS.md` for full project documentation.

## Architecture Boundary

This integration uses the external `unraid-api` library rather than an in-repo
`api/` package.

Data flow must stay:

`Entities -> Coordinators -> UnraidClient (unraid-api) -> Unraid server`

- Entities read coordinator data only.
- Coordinators and config flow own API calls and exception mapping.
- Do not add direct network I/O in entities.

### Never bypass `unraid-api` (mandatory for all AI agents)

All server communication MUST go through the `unraid-api` library
(`UnraidClient`). Do not add direct GraphQL, HTTP, WebSocket, or SSH calls.
Do not reimplement, patch, vendor, or bypass the library.

Stop if the library has a bug or lacks the necessary field, query, mutation, or subscription.
Do not add a workaround here. Open an issue in **https://github.com/tinkerologie/unraid-api**.
Give the user the issue link.

Use the new function through `UnraidClient` after the library releases it.
See "Critical Rule: Never Bypass `unraid-api`" in `AGENTS.md`.

#### Forbidden patterns (CI will reject these)

```python
# ❌ NEVER — direct HTTP
import requests
import httpx

session.get("http://unraid-server/...")

# ❌ NEVER — raw aiohttp session creation
import aiohttp

session = aiohttp.ClientSession()  # direct construction

# ❌ NEVER — raw GraphQL client
from gql import gql, Client
import python_graphql_client

# ❌ NEVER — raw WebSockets
import websockets

# ❌ NEVER — SSH
import paramiko
import asyncssh
```

```python
# ✅ CORRECT — all I/O through UnraidClient
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from unraid_api import UnraidClient

session = async_get_clientsession(hass)
client = UnraidClient(host=host, port=port, api_key=api_key, session=session)
data = await client.get_system_info()
```

## UnraidClient Construction

- Always pass HA's shared session (`async_get_clientsession`).
- Never create ad-hoc synchronous network clients.
- Close temporary config-flow clients created for connection tests.

## Error Mapping Rules

- Auth failures -> `ConfigEntryAuthFailed` (coordinator) or `InvalidAuthError` (flow)
- Connectivity/timeouts -> `UpdateFailed` (coordinator) or `CannotConnectError` (flow)
- Version incompatibility -> `UnsupportedVersionError` in flow
- Wrap entity action failures in `HomeAssistantError` with translation keys

## Compatibility Checks

- Check API version from `get_server_info().api_version` against `MIN_API_VERSION` during config flow.
- No Unraid OS version requirement — the API is upgradeable independently through Unraid Connect.

## Dependency Management

- Current runtime dependency: `unraid-api>=1.15.1`.
- Dependency upgrades require review first.
- If upgraded, sync `manifest.json`, docs, and agent instructions in the same PR.
