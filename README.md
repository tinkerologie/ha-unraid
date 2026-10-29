# Home Assistant Integration for Unraid®

<!-- BADGES:START -->
[![Marketplace and HACS](https://img.shields.io/badge/Marketplace%20%7C%20HACS-Default-orange.svg)](https://www.hacs.xyz/docs/marketplace/)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/tinkerologie/ha-unraid)](https://github.com/tinkerologie/ha-unraid/commits/main)
[![GitHub Release](https://img.shields.io/github/v/release/tinkerologie/ha-unraid)](https://github.com/tinkerologie/ha-unraid/releases)
[![codecov](https://codecov.io/gh/tinkerologie/ha-unraid/graph/badge.svg)](https://codecov.io/gh/tinkerologie/ha-unraid)
[![License](https://img.shields.io/github/license/tinkerologie/ha-unraid)](./LICENSE)
<!-- BADGES:END -->

A Home Assistant custom integration for monitoring and controlling Unraid servers via the official GraphQL API.

> **Note**: This integration requires the **Unraid GraphQL API v4.31.1 or later**. The API can be updated independently of the Unraid OS version by installing the **Unraid Connect** plugin from the Unraid Community Applications store.
>
> **Important**: If you encounter issues, ensure you have the **latest version** of the Unraid GraphQL API installed via the Unraid Connect plugin. Many reported issues are resolved simply by updating to the latest API version.
>
> ⚠️ **Migration Notice**: Release **2025.06.11** is the **last stable SSH-based** version of this integration. Starting with **2025.12.0**, this integration has been completely rebuilt to use Unraid's official GraphQL API. **There is no direct migration or upgrade path** from SSH to GraphQL - you will need to remove the old integration and set up fresh with a new API key. Users who prefer the SSH-based integration can continue using [release 2025.06.11](https://github.com/tinkerologie/ha-unraid/releases/tag/v2025.06.11).

## Installation

### HACS (Recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tinkerologie&repository=ha-unraid&category=integration)

1. Click the button above or manually add the repository in HACS
2. Search for **Unraid** and click **Download**
3. Restart Home Assistant

## Features

### System Monitoring

- **CPU Usage**: Real-time CPU utilization percentage
- **CPU Temperature**: Package temperature monitoring
- **CPU Power**: Power consumption (when available)
- **Memory Usage**: Used memory and percentage utilization
- **System Uptime**: Human-readable uptime display

### Storage Management

- **Array Status**: State tracking (started/stopped/degraded)
- **Array Capacity**: Total, used, free space with usage percentage
- **Parity Status**: Parity check status, progress, and validation
- **Disk Health**: Per-disk health monitoring (binary sensors)
- **Disk Usage**: Individual disk capacity and usage for data and cache disks
- **Share Usage**: Per-share storage utilization
- **Flash Device**: Boot device usage monitoring

### Docker Container Control

- **Container Switches**: Start/stop Docker containers
- **State Sync**: Real-time container state updates
- **Attributes**: Container image, status, and port information

Docker update entities provide a release-notes panel with cached image details, installed tag, update status and available project, registry and support links. Actual target versions and changelogs require future [upstream API/client metadata](https://github.com/tinkerologie/unraid-api/issues/132); generic links are not release-specific notes.

### Virtual Machine Control

- **VM Switches**: Start/stop virtual machines
- **State Sync**: Real-time VM state updates
- **Attributes**: VM name and state information

### UPS Monitoring (when connected)

- **Battery Level**: Charge percentage
- **Load**: Current UPS load percentage
- **Runtime**: Estimated battery runtime
- **Power Consumption**: Calculated power usage for Energy Dashboard (requires configuration)
- **Connection Status**: UPS connected binary sensor

### Notifications

- **Active Notifications**: Count of unread Unraid notifications

## Requirements

- **Home Assistant**: 2026.9.0 or later
- **Unraid Server**: With **GraphQL API v4.31.1 or later** (install the [Unraid Connect](https://unraid.net/connect) plugin to stay up to date)
- **Unraid API Key**: Generated in Unraid settings

### Manual Installation

1. Download `unraid.zip` from the [latest release](https://github.com/tinkerologie/ha-unraid/releases/latest)
2. Create `config/custom_components/unraid/` in your Home Assistant configuration directory
3. Extract `unraid.zip` into that folder. The integration's files (`manifest.json`, `__init__.py`, ...) are at the root of the zip, so they land directly in `custom_components/unraid/`
4. Restart Home Assistant

HACS and the Home Assistant Marketplace install the same `unraid.zip`, and the
"Downloaded N times" figure they show is that asset's download count on the
latest release. Releases published before the zip was introduced (2026.10.5 and
earlier) don't carry `unraid.zip`, so choosing one of them in HACS or the
Marketplace can fail to download.

#### Verify the download

Each release ships `unraid.zip`, a `SHA256SUMS` file and a signed build
provenance attestation. In the folder holding both files:

```sh
# The checksum matches the release
sha256sum -c SHA256SUMS

# The zip was built by this repository's release workflow
gh attestation verify unraid.zip --repo tinkerologie/ha-unraid \
  --signer-workflow tinkerologie/ha-unraid/.github/workflows/release.yml

# Immutable releases only: the asset belongs to the published release
gh release verify-asset <tag> unraid.zip --repo tinkerologie/ha-unraid
```

## Configuration

### Step 1: Generate Unraid API Key

1. Log in to your Unraid WebGUI
2. Navigate to **Settings** → **Management Access** → **API**
3. Click **Add** to create a new API key
4. Copy the generated API key

### Step 2: Add the Integration

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration**
3. Search for **Unraid**
4. Enter your configuration:
   - **Host**: Unraid server IP or hostname
   - **API Key**: The key from Step 1

The integration will validate the connection and create entities for all discovered devices.

### Step 3: Configure Options (Optional)

After setup, you can adjust UPS settings (only shown if UPS is detected):

1. Go to **Settings** → **Devices & Services**
2. Find the Unraid entry and click **Configure**
3. Adjust:
   - **UPS capacity (VA)**: Your UPS VA rating for reference
   - **UPS nominal power (W)**: Required for UPS Power sensor in Energy Dashboard

> **Note**: Polling intervals are fixed per Home Assistant Core guidelines:
>
> - System data (CPU, RAM, Docker, VMs): **30 seconds**
> - Storage data (array, disks, SMART): **5 minutes**
>
> For custom refresh rates, use the `homeassistant.update_entity` service (see [Custom Polling](#custom-polling-intervals) below).

## Entity Overview

### Sensors

| Entity          | Description         | Device Class |
| --------------- | ------------------- | ------------ |
| CPU Usage       | CPU utilization %   | -            |
| CPU Temperature | Package temp °C     | temperature  |
| CPU Power       | Power consumption W | power        |
| Memory Usage    | RAM used %          | -            |
| Uptime          | System uptime       | -            |
| Array State     | started/stopped     | enum         |
| Array Usage     | Capacity used %     | -            |
| Parity Progress | Check progress %    | -            |
| Disk Usage      | Per-disk used %     | -            |
| Share Usage     | Per-share used %    | -            |
| Flash Usage     | Boot device used %  | -            |
| UPS Battery     | Charge level %      | battery      |
| UPS Load        | Current load %      | -            |
| UPS Runtime     | Estimated runtime   | -            |
| UPS Power       | Power consumption W | power        |
| Notifications   | Unread count        | -            |

### Summary sensors

These host and Docker aggregates are enabled by default; group helpers are unnecessary:

| Requested metric | Entity name | Translation key |
| --- | --- | --- |
| Docker total CPU usage | Docker Total CPU | `docker_total_cpu` |
| System used memory | RAM Used | `ram_used` |
| System memory usage | RAM Usage | `ram_usage` |
| Docker used memory | Docker Total Memory Used | `docker_total_memory_bytes` |
| Docker memory usage | Docker Total Memory % | `docker_total_memory_percent` |

RAM Used is whole-host total memory minus available memory. RAM Usage uses the API-reported percentage. Docker memory bytes sum the reported usage of running containers, including containers with different memory limits. A missing or invalid reading from any running container keeps the total unknown; a reported zero remains zero. Byte sensors can display MB or MiB through Home Assistant's entity unit setting.

Docker Total CPU is the sum of running-container CPU readings divided by the host's logical CPU count, so it represents 0–100% of total host capacity. For example, Docker's raw 225.5% on a 12-thread host becomes 18.79%. Docker Total Memory % uses the same actual-byte total as Docker Total Memory Used, divided by total host RAM; it does not sum percentages based on different container limits. Both aggregate percentages are bounded to 0–100% for transiently inconsistent snapshots. Missing host denominators or incomplete readings stay unknown. Individual container sensors retain Docker's per-core CPU and per-limit memory percentages. Automations using the old aggregate scales may need threshold adjustments. Unraid's separate Docker vdisk/folder bar measures storage; the Docker segment of its RAM chart measures memory.

Docker totals require the container-statistics subscription. If the API stream stops publishing, these sensors can show `Unknown` while container inventory remains available. A stalled collector in Unraid API 4.37.7 is tracked in [Unraid API #2120](https://github.com/unraid/api/issues/2120); restarting only the Unraid API service restored the stream in live testing.

ZFS ARC used memory and percentage require an upstream API extension ([Unraid API #2119](https://github.com/unraid/api/issues/2119), [Python client #131](https://github.com/tinkerologie/unraid-api/issues/131)). Generic free/buffer/cache metrics cannot identify ARC usage, so this integration does not estimate it.

### Binary Sensors

| Entity               | Description                         |
| -------------------- | ----------------------------------- |
| Array Started        | Array running state                 |
| Parity Check Running | Parity check in progress            |
| Parity Valid         | Parity status healthy               |
| Disk Health          | Per-disk health (problem if not OK) |
| UPS Connected        | UPS connection status               |

### Switches

| Entity            | Description           |
| ----------------- | --------------------- |
| Docker Containers | Start/stop containers |
| Virtual Machines  | Start/stop VMs        |

Docker switches remain **on** while containers are paused. Turning a paused container off first unpauses it, then stops it. Pause and Unpause buttons are configuration entities, disabled by default; enable them under **Settings > Devices & services > Unraid > Entities** to show Pause/Resume controls in the Docker card. Pause and Stop require confirmation; Resume does not. Restart is disabled in the card while paused.

### Buttons

| Entity                  | Description               |
| ----------------------- | ------------------------- |
| Array Start/Stop        | Control array state       |
| Parity Check Start/Stop | Control parity operations |
| Disk Spin Up/Down       | Control disk spin state   |
| Docker Pause/Unpause    | Pause or resume containers (disabled by default) |

## UPS Power Sensor for Energy Dashboard

To track UPS power consumption in Home Assistant's Energy Dashboard:

1. Go to **Settings** → **Devices & Services**
2. Find Unraid and click **Configure**
3. Set **UPS capacity (VA)** to your UPS rating (e.g., 1000 for a 1000VA UPS)
4. The UPS Power sensor will show calculated wattage based on load percentage

**Formula**: `Power (W) = Load% × Capacity (VA) × 0.6 (power factor)`

## Dynamic Entity Creation

The integration only creates entities for available services:

- **No UPS connected** → No UPS sensors created
- **Docker service stopped** → No container switches created
- **No VMs defined** → No VM switches created
- **No shares** → No share sensors created

Entities are automatically created when services become available.

## Custom Dashboard Cards

The integration includes a suite of 8 modern custom Lovelace cards bundled directly with zero extra setup needed:

| Card | Tag | Description |
| :--- | :--- | :--- |
| **Server Overview** | `custom:unraid-server-card` | System uptime, OS version, registration badge, CPU/RAM utilization progress rings, motherboard temperatures (Unraid API 4.37.6+), primary network info, live traffic, and boot device. |
| **Storage & Disks** | `custom:unraid-storage-card` | Storage matrix showing array status, parity sync status and history, capacity progress rings, and individual disk health (temperatures, spin states, and read/write I/O). |
| **User Shares** | `custom:unraid-shares-card` | User shares with disk usage progress bars, used/free/total capacity, and share protection states (`Protected` vs. `Unprotected`). |
| **Network Interfaces** | `custom:unraid-network-card` | Physical NICs, bonds, and bridges with real-time throughput metrics (rates and totals), link speed badges, active link state chips, MTU, MAC addresses, and clickable WebGUI links. |
| **Docker Containers** | `custom:unraid-docker-card` | Container manager displaying active containers, status badges, CPU/memory footprints, autostart toggles, and start/stop/restart/pause/resume controls. |
| **Power & UPS** | `custom:unraid-ups-card` | Power & UPS monitor with battery charge rings, electrical load, AC voltages, estimated runtime, and adaptive status coloring. |
| **Virtual Machines** | `custom:unraid-vm-card` | Virtual machine status, running/stopped filters, custom labels, and lifecycle controls. |
| **Control Center** | `custom:unraid-dashboard-card` | All-in-one unified dashboard with instant tab switching across all Unraid subsystems. |

Previously discovered hardware temperature entities are retained when readings are absent; they show unknown until telemetry returns. Hardware temperature entities require Unraid API 4.37.6 or later and supported sensors. Older or unknown API versions omit temperature queries to preserve disk standby. On supported servers, entities appear automatically when valid readings become available, including after setup. Reload the integration after upgrading the server API so capability detection runs again.

Server memory subtitles use the native RAM-used sensor, matching the percentage gauge without counting cached memory as used. Storage capacities use the current entity attributes and keep unknown readings distinct from zero. Disk rows combine metrics by device identity when unambiguous, including entity IDs with Home Assistant collision suffixes. Network discovery excludes explicitly foreign registry ownership, and traffic labels respect Home Assistant display units and locale.

### Docker and VM labels and filters

Docker and VM cards display actual workload names. Use `title` to customize the card header and optional label maps to shorten individual names. Map keys are the exact, case-sensitive Unraid workload names (without a leading `/` for Docker containers). Older entities without `container_name` or `vm_name` attributes use the entity slug as their map key (for example, `ha` for `switch.cube_virtual_machine_ha`), rather than the displayed friendly name:

```yaml
type: custom:unraid-docker-card
title: Applications
container_labels:
  plex: Media
default_filter: running
```

```yaml
type: custom:unraid-vm-card
title: Guests
vm_labels:
  Home Assistant: HA
default_filter: running
```

`default_filter` supports `all` (the default), `running`, or `stopped`; Docker also supports `paused` and `updates`. Choose **Default Filter** in the visual editor to persist the initial tab. Runtime tabs can still change the current view. Label maps are configured in YAML and preserved by the editor. Full workload names remain available in tooltips, and cards using older entities fall back to their friendly names.

### Card appearance and accessibility

All eight cards follow Home Assistant theme colours, typography, spacing and radii, including light, dark and custom themes. Controls have visible keyboard focus and 40px text or 48px icon touch targets. Status is shown in text as well as colour. Reduced-motion preferences are respected. Unknown readings show a placeholder rather than a false zero; unknown workloads are excluded from Running/Stopped filters and their power controls are disabled.

The unified dashboard uses accessible tabs: Left/Right moves focus (following RTL direction), Home/End jumps to the first/last tab, and Enter/Space opens the focused section. Workload names, share rows, network interfaces and metric gauges open the native more-info dialog by keyboard or pointer. Long names keep full-name tooltips. Cards use content-driven Sections heights so long lists remain reachable; narrow layouts wrap controls and respect RTL.

| Editor option | Cards | Default |
| --- | --- | --- |
| `server`, `title` | All | Automatic server, default title |
| `show_system_info` | Server, unified dashboard | `true` |
| `view_mode` | Docker, unified dashboard | `grid` |
| `default_filter` | Docker, VM, unified dashboard | `all`, `running`, `stopped`; `paused` and `updates` apply to Docker only |
| `container_labels`, `vm_labels` | Corresponding card, unified dashboard | YAML only; preserved by the editor |

The visual editor uses Home Assistant's own form controls: a device picker that lists only Unraid servers, a text field, drop-down lists and a switch. It shows each card's defaults without writing them to the card's YAML, and clearing a field returns it to the default. A card whose `server` is a name rather than a picked device, or whose option has a value that card doesn't offer, opens in the code editor instead, so nothing is rewritten silently.

The frontend uses **TypeScript 7.0.2**, pinned in both its package manifest and lockfile. CI installs with `npm ci` and runs `tsc --noEmit`, unit tests, the bundle build and Chromium regression tests. The design follows Home Assistant's [custom-card guidance](https://contributors.home-assistant.io/frontend/custom-ui/card/) and [accessibility foundations](https://contributors.home-assistant.io/design/foundations/accessibility/) with fallbacks for the supported HA 2026.9 baseline.

### Interactive More-Info Dialogs

Clicking on CPU, RAM, or Storage rings, as well as uptime, network, and battery metrics, automatically opens Home Assistant's native **More-Info dialog** with historical usage graphs, attributes, and settings.

### Dashboard Layout & Native View Tabs (2026+ Best Practice)

For the best experience across mobile and desktop, configure your Unraid dashboard using Home Assistant's **Sections view** combined with the unified `custom:unraid-dashboard-card` or dedicated view tabs/subviews.

> **Entity ID Placeholders**: Replace `<your_server>` with your server name (e.g., `cube`, `tower`) and `<model>` with your UPS model (e.g., `pr1000elcdrt1u`). You can check your exact entity IDs under **Settings → Devices & Services → Unraid**.

```yaml
views:
  - title: Overview
    path: overview
    icon: mdi:server
    type: sections
    max_columns: 2
    badges:
      - type: entity
        entity: sensor.<your_server>_array_state
        show_name: true
        show_state: true
        color: green
      - type: entity
        entity: sensor.<your_server>_ups_<model>_battery
        show_name: true
        show_state: true
        color: accent
      - type: entity
        entity: sensor.<your_server>_unread_notifications_total
        show_name: true
        show_state: true
        color: red
        visibility:
          - condition: numeric_state
            entity: sensor.<your_server>_unread_notifications_total
            above: 0
    sections:
      - type: grid
        column_span: 2
        cards:
          - type: custom:unraid-dashboard-card
            grid_options:
              columns: full
              rows: auto

  # Dedicated views accessible via top tabs or subviews:
  - title: Storage & Disks
    path: storage
    icon: mdi:harddisk
    type: sections
    sections:
      - type: grid
        column_span: 2
        cards:
          - type: custom:unraid-storage-card
          - type: custom:unraid-shares-card

  - title: Docker
    path: docker
    icon: mdi:docker
    type: sections
    sections:
      - type: grid
        column_span: 2
        cards:
          - type: custom:unraid-docker-card

  - title: VMs
    path: vms
    icon: mdi:monitor
    type: sections
    sections:
      - type: grid
        column_span: 2
        cards:
          - type: custom:unraid-vm-card

  - title: Network
    path: network
    icon: mdi:lan-connect
    type: sections
    sections:
      - type: grid
        column_span: 2
        cards:
          - type: custom:unraid-network-card

  - title: Power & UPS
    path: ups
    icon: mdi:flash
    type: sections
    sections:
      - type: grid
        column_span: 2
        cards:
          - type: custom:unraid-ups-card
```

## Troubleshooting

### Connection Issues

- **Verify API Key**: Ensure the key is valid and has appropriate permissions
- **Network Access**: Confirm Home Assistant can reach the Unraid server
- **Firewall**: Ensure HTTPS port (443) is accessible
- **Unraid API Version**: Requires GraphQL API v4.31.1+ (install the Unraid Connect plugin to update)

### Missing Entities

- Check if the service is running (Docker, VMs, UPS)
- Verify devices exist on the Unraid server
- Check Home Assistant logs for errors

### Entities Not Updating

- System sensors update every 30 seconds, storage sensors every 5 minutes
- Use `homeassistant.update_entity` service to force immediate refresh
- Check Unraid server responsiveness
- View integration diagnostics for coordinator status

### Reauthentication

If your API key becomes invalid:

1. A repair notification will appear in Home Assistant
2. Click the notification and follow the steps to enter a new API key
3. Alternatively, go to **Settings** → **Devices & Services**, find Unraid, and use the "Reconfigure" option

## Removal

To remove the integration:

1. Go to **Settings** → **Devices & Services**
2. Find the **Unraid** entry
3. Click the three-dot menu (⋮) and select **Delete**
4. Confirm removal

If you installed via HACS, you can also uninstall from HACS after removing the integration.

## Known Limitations

- **GraphQL API Required**: This integration requires the Unraid GraphQL API v4.31.1 or later. The API can be updated independently of the Unraid OS version — install the Unraid Connect plugin to keep it updated
- **No Network Discovery**: Unraid servers must be manually configured (no SSDP/mDNS discovery)
- **Disk SMART Data**: SMART queries can be slow on large arrays; storage polling is less frequent to compensate
- **Container/VM Actions**: Start/stop operations may take up to 60 seconds to complete
- **SSL Certificates**: Self-signed certificates require enabling "Allow insecure connections" (or configuring custom CA)

## Custom Polling Intervals

Polling intervals are fixed per Home Assistant Core integration guidelines. If you need more frequent updates for specific sensors (e.g., disk temperatures for fan control), use the `homeassistant.update_entity` service with a time-pattern automation:

```yaml
automation:
  - alias: "Update disk temperatures every 60 seconds"
    trigger:
      - trigger: time_pattern
        seconds: "/60"
    action:
      - action: homeassistant.update_entity
        target:
          entity_id:
            - sensor.unraid_tower_disk1_temperature
            - sensor.unraid_tower_disk2_temperature
            # Add all disk temperature sensors you need
```

This allows custom refresh rates while keeping the integration compliant with HA Core standards.

## Automation Examples

### Alert on Parity Check Errors

```yaml
automation:
  - alias: "Unraid Parity Check Error Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.unraid_tower_parity_valid
        to: "off"
    action:
      - service: notify.mobile_app
        data:
          title: "⚠️ Unraid Parity Error"
          message: "Parity check has detected errors on your Unraid server."
```

### Notify When Array Stops

```yaml
automation:
  - alias: "Unraid Array Stopped"
    trigger:
      - platform: state
        entity_id: binary_sensor.unraid_tower_array_started
        to: "off"
    action:
      - service: notify.mobile_app
        data:
          title: "Unraid Array"
          message: "The Unraid array has stopped."
```

### Start Container on Schedule

```yaml
automation:
  - alias: "Start Plex at 6PM"
    trigger:
      - platform: time
        at: "18:00:00"
    action:
      - service: switch.turn_on
        target:
          entity_id: switch.unraid_tower_plex
```

## Development

### Prerequisites

- Docker Desktop
- VS Code with Dev Containers extension

### Setup

```bash
git clone https://github.com/tinkerologie/ha-unraid.git
cd ha-unraid
code .
# Reopen in Dev Container when prompted
```

### Commands

```bash
./script/setup    # Install dependencies
./script/lint     # Format and lint (run after every change!)
pytest             # Run tests
./script/develop  # Start Home Assistant for testing
```

### Code Quality

This project enforces strict code quality:

- All changes must pass `./script/lint` with zero warnings
- All tests must pass before committing
- Type hints required for all functions

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make changes and run `./script/lint`
4. Run tests with `pytest`
5. **Keep PRs small and focused** - one issue/feature per PR
6. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

Licensed under the Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Disclaimer

Unraid® is a registered trademark of Lime Technology, Inc. This integration is not affiliated with, endorsed, or sponsored by Lime Technology, Inc.
