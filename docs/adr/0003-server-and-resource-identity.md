# Preserve server and resource identities in the Home Assistant registries

One configured server groups its entities under one server device, and entity
unique IDs combine the resolved server identity with a resource-specific identity.
Container and VM entities use names so recreation does not discard their registry
customizations; renames can therefore produce new entities. For known placeholder
firmware UUIDs, setup uses the config entry’s hostname-qualified identity when
available and migrates owned registry records before loading platforms, preserving
entity IDs and skipping conflicting records rather than deleting them.

This favors continuity and multi-server separation over uniformly using raw API
UUIDs or runtime container IDs. Hostname changes on placeholder-UUID servers remain
an identity trade-off. See [identity resolution and migration](../../custom_components/unraid/__init__.py),
[config-entry identity](../../custom_components/unraid/config_flow.py),
[device grouping](../../custom_components/unraid/entity.py),
[container and VM identities](../../custom_components/unraid/switch.py), and
[migration tests](../../tests/test_identity_migration.py).
