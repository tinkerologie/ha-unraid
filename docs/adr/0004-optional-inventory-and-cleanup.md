# Require successful resource observations before removing entities

Selected optional inventories, including containers, VMs, UPS devices, network
resources, plugin operations, and shares, preserve the last successful result
when their query fails and expose category success separately; a successful empty
result can replace the cache. Cleanup skips failed coordinators and failed
categories, considers only recognized dynamic entity identities owned by the
config entry, and requires three missing observations before removal; missing
hardware temperature telemetry is not treated as sensor removal. This favors
registry continuity over immediate deletion, at the cost of retaining stale
resources during outages and a grace period after removal.

The grace counter advances when cleanup runs, including system and storage
listeners; it is not a guarantee of three distinct upstream inventory requests.
Other optional values have their own fallback behavior. See
[optional queries and caches](../../custom_components/unraid/coordinator.py),
[cleanup policy](../../custom_components/unraid/cleanup.py),
[listener registration](../../custom_components/unraid/__init__.py), and
[cleanup tests](../../tests/test_cleanup.py).
