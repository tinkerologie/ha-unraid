# Combine fixed polling intervals with selective push updates

System, storage, and infrastructure data use separate coordinators with fixed
30-second, 5-minute, and 15-minute polling intervals; the container inventory has
its own slower throttle and can be refreshed after a control action. Library
subscriptions supplement polling: container statistics are cached, UPS and
notification events request debounced system refreshes, and non-null changed
array states request storage refreshes. This balances responsive state against
server load and disk wake-ups, while retaining polling and accepting multiple
refresh paths and different freshness across resource categories.

See [intervals](../../custom_components/unraid/const.py),
[coordinators](../../custom_components/unraid/coordinator.py),
[push handling](../../custom_components/unraid/websocket.py), and
[regression tests](../../tests/test_websocket.py). An initial non-null array state
also requests a refresh; repeated identical states and null heartbeats do not.
