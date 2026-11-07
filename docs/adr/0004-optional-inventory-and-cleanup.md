# Require successful resource observations before removing entities

The integration keeps the last successful result when a query for an optional inventory fails.
This applies to containers, VMs, UPS devices, network resources, plugin operations, and shares.
A successful query with an empty result can replace the result in the cache.
The integration also records whether each query succeeds.

The cleanup process removes only known dynamic entities of the config entry.
It removes an entity after three applicable observations that do not contain the resource.
Failed queries do not count.
A missing temperature value does not show that the server no longer has the temperature sensor.

For Docker, cleanup counts each successful inventory observation once.
Results from the cache, failed requests, and storage updates alone do not increase the counter.
A successful Docker query that shows the resource resets its counter, also during a storage failure.
Cleanup does not remove entities when either coordinator has failed.
For other resource types, cleanup counts each applicable cleanup pass.

The delay keeps entity settings during temporary outages.
The integration can show old data until a query succeeds.

## Related files

- [optional queries and caches](../../custom_components/unraid/coordinator.py)
- [cleanup policy](../../custom_components/unraid/cleanup.py)
- [listener registration](../../custom_components/unraid/__init__.py)
- [cleanup tests](../../tests/test_cleanup.py)
