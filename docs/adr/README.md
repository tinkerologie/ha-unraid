# Architecture decisions

These records describe the design and its effects.
The initial review used commit `5059762` on 2026-11-07.
The review date can differ from the decision date.
Put proposals in GitHub Issues until the maintainers agree to a change.

The [domain glossary](../../GLOSSARY.md) gives the terms for these records.

| ADR | Decision |
| --- | --- |
| 0001 | [Route server communication through unraid-api](0001-library-owns-server-io.md) |
| 0002 | [Combine fixed polling intervals with selective push updates](0002-polling-and-push.md) |
| 0003 | [Preserve server and resource identities in the Home Assistant registries](0003-server-and-resource-identity.md) |
| 0004 | [Require successful resource observations before removing entities](0004-optional-inventory-and-cleanup.md) |
| 0005 | [Gate temperature polling on standby-safe API support](0005-standby-aware-temperature-polling.md) |
