# Combine fixed polling intervals with selective push updates

Separate coordinators poll system, storage, and infrastructure data.
They poll at intervals of 30 seconds, 5 minutes, and 15 minutes, respectively.
The system coordinator polls the container inventory at a longer interval.
A control action can cause an immediate inventory update.

The library also supplies subscription data.
The integration stores container statistics in a cache.
UPS and notification events request a system update with a time limit between requests.
A new array state requests a storage update.
The integration ignores repeated states and null heartbeat messages.
The first array state also requests a storage update if it has a value.

The intervals limit server load and prevent unnecessary disk spin-up.
The update interval can be different for each type of resource.

## Related files

- [intervals](../../custom_components/unraid/const.py)
- [coordinators](../../custom_components/unraid/coordinator.py)
- [push handling](../../custom_components/unraid/websocket.py)
- [regression tests](../../tests/test_websocket.py)
