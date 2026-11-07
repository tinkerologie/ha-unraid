# Route server communication through unraid-api

Home Assistant entities and coordinators consume `UnraidClient` and its typed models;
the integration delegates all Unraid network communication to the `unraid-api`
library. This keeps transport, schema compatibility, and response interpretation
in one maintained client, at the cost of requiring a library change and release
before the integration can use an unsupported server capability.

This records the existing repository policy, rather than authorizing a new transport.
See [agent policy](../../AGENTS.md#️-critical-rule-never-bypass-unraid-api),
[setup](../../custom_components/unraid/__init__.py), and the executable
[policy check](../../script/check_api_boundary.py).
