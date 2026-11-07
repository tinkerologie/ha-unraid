# Gate temperature polling on standby-safe API support

During setup, the coordinator reads the API version.
If the API version is 4.37.6 or later, system polls include `metrics.temperature`.
The coordinator uses the library method without temperature data if the API version is earlier or unknown.

On earlier versions, a temperature query can make a disk leave standby.
The method that omits temperature data lets the disk stay in standby.
After an API upgrade, reload the integration to make it check the API version again.
The library supplies both query methods and the minimum API version for safe temperature queries.

## Related files

- [coordinator selection](../../custom_components/unraid/coordinator.py)
- [temperature setup tests](../../tests/test_temperature_setup.py)
- [coordinator tests](../../tests/test_coordinator.py)
