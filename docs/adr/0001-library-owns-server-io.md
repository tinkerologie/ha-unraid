# Route server communication through unraid-api

Home Assistant entities and coordinators use `UnraidClient` and its typed models.
The `unraid-api` library controls all network communication with Unraid.
One library manages the transport, checks schema support, and reads server responses.

If the library does not support a server function, add the function to the library.
Release the library before the integration uses the new function.

## Related files

- [agent policy](../../AGENTS.md#️-critical-rule-never-bypass-unraid-api)
- [setup](../../custom_components/unraid/__init__.py)
- [policy check](../../script/check_api_boundary.py)
