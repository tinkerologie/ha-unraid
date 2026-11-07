# Preserve server and resource identities in the Home Assistant registries

Each config entry groups the entities of one Unraid server under one server device.
An entity unique ID contains the server identity and a resource ID.
Container and VM entities use resource names in their unique IDs.
If you remove and create a resource with the same name, its registry settings stay the same.
If you change the name of a resource, Home Assistant can add a new entity.

If a server has a known placeholder UUID, setup uses the hostname in the config entry identity when available.
Setup moves the registry entries of that config entry before it loads the platforms.
Setup keeps the entity IDs and skips registry entries that have a conflict.

The hostname lets Home Assistant distinguish servers that have the same placeholder UUID.
If you change the hostname of such a server, the server identity can change.

## Related files

- [identity resolution and migration](../../custom_components/unraid/__init__.py)
- [config-entry identity](../../custom_components/unraid/config_flow.py)
- [device grouping](../../custom_components/unraid/entity.py)
- [container and VM identities](../../custom_components/unraid/switch.py)
- [migration tests](../../tests/test_identity_migration.py)
