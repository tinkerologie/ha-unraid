"""Verify Docker update reporting through registered Home Assistant entities."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest
from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT, CONF_SSL
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.update_coordinator import REQUEST_REFRESH_DEFAULT_COOLDOWN
from homeassistant.util import dt as dt_util
from pytest_homeassistant.common import MockConfigEntry, async_fire_time_changed
from unraid_api.exceptions import UnraidAPIError, UnraidTimeoutError
from unraid_api.models import ContainerUpdateStatus, DockerContainer

from custom_components.unraid.const import DOMAIN

if TYPE_CHECKING:
    from collections.abc import AsyncIterator
    from unittest.mock import MagicMock

    from homeassistant.core import HomeAssistant
    from pytest_homeassistant.typing import MockHAClientWebSocket, WebSocketGenerator


@pytest.fixture
async def update_entry(
    hass: HomeAssistant, mock_unraid_client: MagicMock
) -> AsyncIterator[MockConfigEntry]:
    """Set up and unload an entry with real coordinator and platform setup."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="tower",
        unique_id="test-uuid-123",
        data={
            CONF_HOST: "192.168.1.100",
            CONF_API_KEY: "test-api-key",
            CONF_PORT: 443,
            CONF_SSL: True,
        },
    )
    entry.add_to_hass(hass)
    with (
        patch("custom_components.unraid.async_register_frontend"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_start"),
        patch("custom_components.unraid.websocket.UnraidWebSocketManager.async_stop"),
    ):
        yield entry
        if entry.runtime_data:
            assert await hass.config_entries.async_unload(entry.entry_id)


async def refresh_docker(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    """Request a Docker refresh and let Home Assistant run any queued update."""
    await entry.runtime_data.system_coordinator.async_request_docker_refresh()
    async_fire_time_changed(
        hass, dt_util.utcnow() + timedelta(seconds=REQUEST_REFRESH_DEFAULT_COOLDOWN + 1)
    )
    await hass.async_block_till_done()


@pytest.mark.parametrize(
    ("image", "tag"),
    [
        ("postgres:17", "17"),
        ("redis", "latest"),
        ("redis:7.4", "7.4"),
        ("redis:8", "8"),
        ("docker.io/library/postgres:17", "17"),
        ("linuxserver/plex:latest", "latest"),
    ],
)
async def test_update_flag_through_registered_state(
    hass: HomeAssistant,
    mock_unraid_client: MagicMock,
    update_entry: MockConfigEntry,
    image: str,
    tag: str,
) -> None:
    """Distinguish a missing flag from a negative flag on an older Unraid API."""
    statuses = mock_unraid_client.get_container_update_statuses
    statuses.side_effect = UnraidAPIError("Cannot query field containerUpdateStatuses")
    fetch_containers = mock_unraid_client.typed_get_containers_safe
    fetch_containers.return_value = [
        DockerContainer(
            id="initial", name="/example", image=image, isUpdateAvailable=False
        )
    ]
    assert await hass.config_entries.async_setup(update_entry.entry_id)
    await hass.async_block_till_done()
    registry = er.async_get(hass)
    uuid = update_entry.runtime_data.server_info["uuid"]
    unique_id = f"{uuid}_container_update_example"
    entity_id = registry.async_get_entity_id("update", DOMAIN, unique_id)
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "off"

    for flag, expected_state, latest in [
        (None, "unknown", None),
        (True, "on", "Update available"),
        (None, "unknown", None),
    ]:
        fetch_containers.return_value = [
            DockerContainer(
                id=f"recreated-{flag}",
                name="/example",
                image=image,
                isUpdateAvailable=flag,
            )
        ]
        await refresh_docker(hass, update_entry)
        assert registry.async_get_entity_id("update", DOMAIN, unique_id) == entity_id
        state = hass.states.get(entity_id)
        assert state is not None
        assert state.state == expected_state
        assert state.attributes["installed_version"] == tag
        assert state.attributes["latest_version"] == latest
        assert bool(state.attributes["release_summary"]) is (flag is True)
    assert statuses.await_count == 4


def _extract_release_notes(result: object) -> str:
    """Extract release notes text across HA 2026.9-2026.11 and 2026.12+ shapes."""
    if isinstance(result, str):
        return result
    if (
        isinstance(result, dict)
        and isinstance(result.get("release_notes"), str)
        and isinstance(result.get("messages"), list)
    ):
        return result["release_notes"]
    raise AssertionError(f"Unexpected update/release_notes result shape: {result!r}")


async def assert_reporting(
    hass: HomeAssistant,
    ws: MockHAClientWebSocket,
    entity_ids: tuple[str, str, str],
    expected: str,
) -> None:
    """Show the same effective status across the Home Assistant entities."""
    update_id, legacy_id, count_id = entity_ids
    update_state = hass.states.get(update_id)
    assert update_state is not None
    assert update_state.state == expected
    available = expected == "on"
    latest = {
        "on": "Update available",
        "off": update_state.attributes["installed_version"],
        "unknown": None,
    }
    assert update_state.attributes["latest_version"] == latest[expected]
    assert bool(update_state.attributes["release_summary"]) is available
    legacy_state = hass.states.get(legacy_id)
    assert legacy_state is not None
    assert legacy_state.state == ("on" if available else "off")
    count = hass.states.get(count_id)
    assert count is not None
    assert count.state == ("1" if available else "0")
    assert count.attributes.get("containers") == (["example"] if available else None)
    await ws.send_json_auto_id({"type": "update/release_notes", "entity_id": update_id})
    response = await ws.receive_json()
    assert response["success"]
    expected_note = {
        "on": "Update available",
        "off": "No update reported",
        "unknown": "Unknown",
    }
    assert expected_note[expected] in _extract_release_notes(response["result"])


@pytest.mark.parametrize(
    ("image", "status_name", "status", "reverse"),
    [
        ("ghcr.io/immich-app/immich-server:v3", "example", "UNKNOWN", False),
        ("redis:7.4@sha256:abc", "/example", "UNKNOWN", True),
        ("redis:7.4", "example", None, False),
    ],
)
async def test_webgui_unknown_and_recovery_through_registered_state(
    hass: HomeAssistant,
    mock_unraid_client: MagicMock,
    update_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    image: str,
    status_name: str,
    status: str | None,
    reverse: bool,
) -> None:
    """Retain the last unknown status until a successful query clears it."""
    inventory = mock_unraid_client.typed_get_containers_safe
    inventory.return_value = [
        DockerContainer(id="ct:1", name="/example", image=image, isUpdateAvailable=True)
    ]
    statuses = mock_unraid_client.get_container_update_statuses
    conflicting = [
        ContainerUpdateStatus(name="/example", updateStatus="UPDATE_AVAILABLE"),
        ContainerUpdateStatus(name=status_name, updateStatus=status),
    ]
    statuses.return_value = conflicting[::-1] if reverse else conflicting
    assert await hass.config_entries.async_setup(update_entry.entry_id)
    await hass.async_block_till_done()
    coordinator = update_entry.runtime_data.system_coordinator
    registry = er.async_get(hass)
    uuid = update_entry.runtime_data.server_info["uuid"]
    update_id = registry.async_get_entity_id(
        "update", DOMAIN, f"{uuid}_container_update_example"
    )
    legacy_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{uuid}_container_example_update"
    )
    count_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{uuid}_container_updates_count"
    )
    assert update_id is not None
    assert legacy_id is not None
    assert count_id is not None
    entity_ids = update_id, legacy_id, count_id
    ws = await hass_ws_client(hass)

    await assert_reporting(hass, ws, entity_ids, "unknown")
    statuses.assert_awaited_once_with()
    generation = coordinator.data.docker_inventory_generation

    await coordinator.async_refresh()
    await hass.async_block_till_done()
    statuses.assert_awaited_once_with()
    assert coordinator.data.docker_inventory_generation == generation

    inventory.side_effect = UnraidAPIError("Inventory query failed")
    statuses.side_effect = UnraidTimeoutError("Status query timed out")
    await refresh_docker(hass, update_entry)
    assert coordinator.optional_query_status["container_update_statuses"] is False
    await assert_reporting(hass, ws, entity_ids, "unknown")

    statuses.side_effect = None
    statuses.return_value = []
    await refresh_docker(hass, update_entry)
    assert coordinator.optional_query_status["container_update_statuses"] is True
    assert coordinator.data.docker_inventory_generation == generation
    await assert_reporting(hass, ws, entity_ids, "on")

    inventory.side_effect = None
    statuses.return_value = [
        ContainerUpdateStatus(name="/other", updateStatus="UNKNOWN"),
        ContainerUpdateStatus(name="/example", updateStatus="UP_TO_DATE"),
    ]
    await refresh_docker(hass, update_entry)
    assert coordinator.data.docker_inventory_generation == generation + 1
    await assert_reporting(hass, ws, entity_ids, "on")

    inventory.return_value = [
        DockerContainer(id="ct:2", name="example", image=image, isUpdateAvailable=False)
    ]
    statuses.return_value = [
        ContainerUpdateStatus(name="/example", updateStatus="UPDATE_AVAILABLE"),
    ]
    await refresh_docker(hass, update_entry)
    await assert_reporting(hass, ws, entity_ids, "off")
    assert statuses.await_count == 5


async def test_docker_refresh_requested_while_status_query_is_running(
    hass: HomeAssistant, mock_unraid_client: MagicMock, update_entry: MockConfigEntry
) -> None:
    """Honor a second Docker refresh requested after inventory has been read."""
    assert await hass.config_entries.async_setup(update_entry.entry_id)
    await hass.async_block_till_done()
    coordinator = update_entry.runtime_data.system_coordinator
    statuses = mock_unraid_client.get_container_update_statuses
    inventory = mock_unraid_client.typed_get_containers_safe
    status_started = asyncio.Event()
    finish_status = asyncio.Event()

    async def slow_status_query() -> list[ContainerUpdateStatus]:
        status_started.set()
        await finish_status.wait()
        return []

    statuses.side_effect = slow_status_query
    first = hass.async_create_task(coordinator.async_request_docker_refresh())
    await status_started.wait()
    assert inventory.await_count == 2
    try:
        await coordinator.async_request_docker_refresh()
    finally:
        finish_status.set()
        await first
    async_fire_time_changed(
        hass, dt_util.utcnow() + timedelta(seconds=REQUEST_REFRESH_DEFAULT_COOLDOWN + 1)
    )
    await hass.async_block_till_done()

    assert inventory.await_count == 3
    assert statuses.await_count == 3


def test_extract_release_notes_supports_legacy_and_envelope_shapes() -> None:
    """Accept legacy string payloads and HA 2026.12+ release_notes envelopes."""
    assert _extract_release_notes("Update available") == "Update available"
    assert (
        _extract_release_notes({"release_notes": "Update available", "messages": []})
        == "Update available"
    )


@pytest.mark.parametrize(
    "bad_payload",
    [
        None,
        {},
        {"release_notes": 123, "messages": []},
        {"release_notes": "Update available"},
        {"release_notes": "Update available", "messages": "not-a-list"},
    ],
)
def test_extract_release_notes_rejects_unexpected_shapes(bad_payload: object) -> None:
    """Reject unexpected update/release_notes WebSocket payload shapes."""
    with pytest.raises(AssertionError, match="Unexpected update/release_notes"):
        _extract_release_notes(bad_payload)
