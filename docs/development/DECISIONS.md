# Architectural and Design Decisions

The current decision index is [docs/adr/README.md](../adr/README.md), with domain
terms in [GLOSSARY.md](../../GLOSSARY.md). The numbered ADRs record existing
architecture retrospectively and link to implementation and regression tests.
This page preserves the earlier decision headings as navigation and keeps
smaller implementation conventions separate from consequential ADRs.

## Decision Log

### Triple Coordinator Pattern

See [ADR 0002: polling and push](../adr/0002-polling-and-push.md). Three fixed
polling schedules are supplemented by selective push updates and a separate
container-inventory throttle.

### Single Device per Server

See [ADR 0003: server and resource identity](../adr/0003-server-and-resource-identity.md).
All resources of one configured server are grouped under its server device.

### Unique ID Format: `{server_uuid}_{resource_id}`

See [ADR 0003](../adr/0003-server-and-resource-identity.md). The server prefix is
the resolved runtime identity, not necessarily the raw firmware UUID; container
and VM names preserve registry continuity across recreation.

### Server Identity for Placeholder SMBIOS UUIDs

See [ADR 0003](../adr/0003-server-and-resource-identity.md) and the
[identity migration tests](../../tests/test_identity_migration.py). Setup migrates
owned registry records before platform loading and skips conflicts for later retry.

### Optional Services Graceful Degradation

See [ADR 0004: optional inventory and cleanup](../adr/0004-optional-inventory-and-cleanup.md).
Selected inventory queries preserve cached data and report category success;
a failed query is not interchangeable with a successful empty result.

### Button Entities Without Coordinator

This earlier heading is retained for existing links; the previous description
is obsolete. [UnraidButtonEntity](../../custom_components/unraid/button.py) now
extends `UnraidBaseEntity` and uses a coordinator for device metadata and
availability. Actions call coordinator methods that delegate to `UnraidClient`.

### SSL Auto-Detection in Config Flow

The [config flow](../../custom_components/unraid/config_flow.py) tests connection
settings and handles SSL retries; the [library I/O policy](../adr/0001-library-owns-server-io.md)
keeps server requests and endpoint discovery in `unraid-api`. Reauthentication
and reconfiguration update the saved entry and reload it.

### Pydantic v2 with `extra="ignore"` for Forward Compatibility

Response models belong to `unraid-api`; see [ADR 0001](../adr/0001-library-owns-server-io.md).
The library’s base model ignores unknown fields, while new fields need explicit
model and query support before the integration consumes them.

### Sensor Precision and Formatting

Numeric sensors round `native_value` to their natural resolution and set suggested
display precision. They do not override Home Assistant’s `state` property, which
would bypass native conversion and statistics behavior. See
[sensor implementations](../../custom_components/unraid/sensor.py) and
[sensor tests](../../tests/test_sensor.py).

## Future Considerations

### WebSocket/Push Updates

Implemented: [ADR 0002](../adr/0002-polling-and-push.md) describes the existing
subscriptions and refresh guards. Push supplements polling.

### Multi-Server Support

Supported through multiple config entries, with one server identity per entry;
see [ADR 0003](../adr/0003-server-and-resource-identity.md).

## Decision Review

Read the relevant ADR before changing its interface or invariants. Record an
accepted change in a new numbered ADR and identify any superseded decision;
track proposed improvements in GitHub Issues.
