# Architectural and Design Decisions

Use the [decision index](../adr/README.md) to find the numbered architecture decision records (ADRs).
Use the [glossary](../../GLOSSARY.md) to find project terms. The ADRs record
existing decisions and link to the code and regression tests. This page
keeps the earlier headings and records smaller decisions.

## Decision Log

### Triple Coordinator Pattern

See [ADR 0002: polling and push](../adr/0002-polling-and-push.md). The integration uses three fixed polling schedules and push updates for some data.
A separate interval limits how often the integration reads the container inventory.

### Single Device per Server

See [ADR 0003: server and resource identity](../adr/0003-server-and-resource-identity.md).
The integration groups all resources of a configured server under its server device.

### Unique ID Format: `{server_uuid}_{resource_id}`

See [ADR 0003](../adr/0003-server-and-resource-identity.md). The server prefix uses the resolved runtime identity. This value can differ from the raw firmware UUID.
Container and VM names preserve registry entries if you create a resource again.

### Server Identity for Placeholder SMBIOS UUIDs

See [ADR 0003](../adr/0003-server-and-resource-identity.md) and the
[identity migration tests](../../tests/test_identity_migration.py). Setup migrates
owned registry records before platform loading and skips conflicts for later retry.

### Optional Services Graceful Degradation

See [ADR 0004: optional inventory and cleanup](../adr/0004-optional-inventory-and-cleanup.md).
Some inventory queries report whether each category succeeded. The integration keeps cached data if a query fails. A successful query can return an empty result.

### Button Entities Without Coordinator

This heading keeps existing links valid. [UnraidButtonEntity](../../custom_components/unraid/button.py) now
extends `UnraidBaseEntity` and uses a coordinator for device metadata and
availability. Actions call coordinator methods that delegate to `UnraidClient`.

### SSL Auto-Detection in Config Flow

The [config flow](../../custom_components/unraid/config_flow.py) tests connection
settings and handles SSL retries. The [library I/O policy](../adr/0001-library-owns-server-io.md)
keeps server requests and endpoint discovery in `unraid-api`. Reauthentication
and reconfiguration update the saved entry and reload it.

### Pydantic v2 with `extra="ignore"` for Forward Compatibility

`unraid-api` owns response models. See [ADR 0001](../adr/0001-library-owns-server-io.md).
The library's base model ignores unknown fields.
To use a new field in the integration, first add the field to the model and the query.

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

The integration supports multiple config entries. Each entry has one server identity.
See [ADR 0003](../adr/0003-server-and-resource-identity.md).

## Decision Review

Read the applicable ADR before you change its interface or requirements. Record an accepted change in a new numbered ADR. Identify each decision it replaces. Record proposed improvements in GitHub Issues.
