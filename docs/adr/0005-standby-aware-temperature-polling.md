# Gate temperature polling on standby-safe API support

Setup-time server information determines whether system polling includes
`metrics.temperature`: API versions at least 4.37.6 enable it, while older or
unparsable versions use the library’s temperature-free metrics method. This
preserves disk standby on servers whose temperature resolver can wake disks,
at the cost of omitting that temperature data and requiring a reload to reassess
the version decision after an API upgrade.

See [coordinator selection](../../custom_components/unraid/coordinator.py),
[temperature setup tests](../../tests/test_temperature_setup.py), and
[coordinator tests](../../tests/test_coordinator.py). The library owns the query
variants and the minimum standby-safe API version.
