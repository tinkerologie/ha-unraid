# Home Assistant Integration for Unraid®

<!-- BADGES:START -->
[![Marketplace and HACS](https://img.shields.io/badge/Marketplace%20%7C%20HACS-Default-orange.svg)](https://www.hacs.xyz/docs/marketplace/)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/tinkerologie/ha-unraid)](https://github.com/tinkerologie/ha-unraid/commits/main)
[![GitHub Release](https://img.shields.io/github/v/release/tinkerologie/ha-unraid)](https://github.com/tinkerologie/ha-unraid/releases)
[![codecov](https://codecov.io/gh/tinkerologie/ha-unraid/graph/badge.svg)](https://codecov.io/gh/tinkerologie/ha-unraid)
[![License](https://img.shields.io/github/license/tinkerologie/ha-unraid)](./LICENSE)
<!-- BADGES:END -->

This Home Assistant integration monitors and controls Unraid servers through the official GraphQL API.

> **Note**: This integration requires the **Unraid GraphQL API v4.31.1 or later**. Install **Unraid Connect** from the Unraid Community Applications store to update the API. You can update the API independently of Unraid OS.
>
> **Important**: If you have a problem, check the Unraid GraphQL API version. Use the Unraid Connect plugin to install the **latest version**. The latest version corrects many known problems.
>
> ⚠️ **Migration Notice**: Release **2025.06.11** is the **last stable SSH-based** version of this integration. Release **2025.12.0** and later use the official Unraid GraphQL API. To move from SSH to GraphQL, remove the old integration. Install the new integration. Configure it with a new API key. Users who prefer the SSH-based integration can continue using [release 2025.06.11](https://github.com/tinkerologie/ha-unraid/releases/tag/v2025.06.11).

## Installation

### HACS (Recommended)

[![Open the Unraid repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tinkerologie&repository=ha-unraid&category=integration)

1. Select the button above. You can also add the repository manually in HACS.
2. Search for **Unraid**.
3. Select **Download**.
4. Restart Home Assistant.

## Features

### System Monitoring

- **CPU Usage**: Current CPU usage as a percentage
- **CPU Temperature**: Package temperature monitoring
- **CPU Power**: Power consumption (when available)
- **Memory Usage**: Memory in use and percentage of total
- **System Uptime**: Human-readable uptime display

### Storage Management

- **Array Status**: State tracking (started/stopped/degraded)
- **Array Capacity**: Total, used, free space with usage percentage
- **Parity Status**: Parity check status, progress, and validation
- **Disk Health**: Per-disk health monitoring (binary sensors)
- **Disk Usage**: Individual disk capacity and usage for data and cache disks
- **Share Usage**: Storage in use for each share
- **Flash Device**: Boot device usage monitoring

### Docker Container Control

- **Container Switches**: Start/stop Docker containers
- **State Sync**: Real-time container state updates
- **Attributes**: Container image, status, and port information

Docker update entities show the cached image details, installed tag, and update status in the release notes panel. The panel also shows available links to the project, registry, and support. Release-specific notes and target versions require [additional API data](https://github.com/tinkerologie/unraid-api/issues/132).

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
- **Unraid Server**: **GraphQL API v4.31.1 or later**. Use the [Unraid Connect](https://unraid.net/connect) plugin to update the API.
- **Unraid API Key**: Generated in Unraid settings

### Manual Installation

1. Download `unraid.zip` from the [latest release](https://github.com/tinkerologie/ha-unraid/releases/latest)
2. Create `config/custom_components/unraid/` in your Home Assistant configuration directory
3. Extract `unraid.zip` into that folder. The integration's files (`manifest.json`, `__init__.py`, ...) are at the root of the zip, so they land directly in `custom_components/unraid/`
4. Restart Home Assistant

HACS and the Home Assistant Marketplace install the same `unraid.zip`.
"Downloaded N times" shows the download count for this file in the latest release.
Release 2026.10.5 and earlier do not include `unraid.zip`. A download in HACS or
the Marketplace can fail if you select one of these releases.

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

After setup, the integration shows UPS settings if it finds a UPS.

1. Go to **Settings** → **Devices & Services**
2. Find the Unraid entry and click **Configure**
3. Adjust:
   - **UPS capacity (VA)**: Your UPS VA rating for reference
   - **UPS nominal power (W)**: Required for UPS Power sensor in Energy Dashboard

> **Note**: The integration uses fixed polling intervals, as specified by the Home Assistant Core guidelines.
>
> - System data (CPU, RAM, Docker, VMs): **30 seconds**
> - Storage data (array, disks, SMART): **5 minutes**
>
> For custom refresh rates, use the `homeassistant.update_entity` service (see [Custom Polling](#custom-polling-intervals) below).

## Entity Overview

### Sensors

| Entity          | Description         | Device Class |
| --------------- | ------------------- | ------------ |
| CPU Usage       | CPU usage %   | -            |
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

Home Assistant enables these host and Docker summary sensors by default.

| Requested metric | Entity name | Translation key |
| --- | --- | --- |
| Docker total CPU usage | Docker Total CPU | `docker_total_cpu` |
| System used memory | RAM Used | `ram_used` |
| System memory usage | RAM Usage | `ram_usage` |
| Docker used memory | Docker Total Memory Used | `docker_total_memory_bytes` |
| Docker memory usage | Docker Total Memory % | `docker_total_memory_percent` |

RAM Used is the host's total memory minus its available memory. RAM Usage uses the percentage from the API. Use the Home Assistant entity unit setting to display byte sensors in MB or MiB.

Docker Total Memory Used adds the memory in use by each running container. The containers can have different memory limits. If any running container gives no reading or an invalid reading, the total stays unknown. A zero reading counts as zero.

Docker Total CPU adds CPU readings from running containers. It divides this sum by the host's logical CPU count. For example, a Docker reading of 225.5% on a host with 12 logical CPUs gives 18.79%. Docker Total Memory % divides Docker Total Memory Used by the total host RAM.

The integration limits both percentages to 0–100% when measurements are temporarily inconsistent. The integration needs the host total and all necessary readings to give a percentage. Each container sensor still uses Docker's per-core CPU percentage or per-limit memory percentage. If an automation uses the old summary scale, check its thresholds.

In Unraid, the Docker vdisk or folder bar shows storage use. The Docker segment of the RAM chart shows memory use.

Docker totals require the container statistics subscription. If the stream stops, the sensors can keep their last values. After a Home Assistant restart, they can show `Unknown`. The container inventory remains available. The integration shows a repair notice after five minutes without statistics while containers run.

[Unraid API #2120](https://github.com/unraid/api/issues/2120) describes a collector fault in Unraid API 4.37.7. In a live test, a restart of the Unraid API service restored the stream.

The integration cannot calculate ZFS ARC memory use from free, buffer, and cache measurements. This feature requires changes to the [Unraid API](https://github.com/unraid/api/issues/2119) and the [Python client](https://github.com/tinkerologie/unraid-api/issues/131).

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

A Docker switch stays **on** while its container is paused. If you set the switch to **off**, the integration resumes the container and then stops it.

Home Assistant disables the Pause and Unpause configuration entities by default. Enable them under **Settings > Devices & services > Unraid > Entities** to show the Pause and Resume controls. The Docker card asks for confirmation for Pause and Stop. Resume requires no confirmation. The card disables Restart while a container is paused.

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
3. Set **UPS capacity (VA)** to your UPS rating (for example, 1000 for a 1000VA UPS)
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
| **Server Overview** | `custom:unraid-server-card` | Uptime, OS version, registration, CPU and RAM use, primary network, live traffic, and boot device. Motherboard temperatures require Unraid API 4.37.6+. |
| **Storage & Disks** | `custom:unraid-storage-card` | Array status, parity sync status and history, and capacity rings. Disk rows show health, temperature, rotation state, and read and write I/O. |
| **User Shares** | `custom:unraid-shares-card` | User shares with disk usage progress bars, used/free/total capacity, and share protection states (`Protected` vs. `Unprotected`). |
| **Network Interfaces** | `custom:unraid-network-card` | Physical NICs, bonds, and bridges. The card shows current rates, totals, link speed and state, MTU, MAC addresses, and links to the WebGUI. |
| **Docker Containers** | `custom:unraid-docker-card` | Container manager displaying active containers, status badges, CPU/memory footprints, autostart toggles, and start/stop/restart/pause/resume controls. |
| **Power & UPS** | `custom:unraid-ups-card` | Power & UPS monitor with battery charge rings, electrical load, AC voltages, estimated runtime, and adaptive status coloring. |
| **Virtual Machines** | `custom:unraid-vm-card` | Virtual machine status, running/stopped filters, custom labels, and lifecycle controls. |
| **Control Center** | `custom:unraid-dashboard-card` | All-in-one unified dashboard with instant tab switching across all Unraid subsystems. |

The integration keeps known hardware temperature entities if readings stop. These entities show an unknown value until readings return. Hardware temperature entities require Unraid API 4.37.6 or later and supported sensors. Older or unknown API versions omit temperature queries to preserve disk standby. On supported servers, entities appear automatically when valid readings become available, including after setup. Reload the integration after upgrading the server API so capability detection runs again.

Server memory subtitles use the native RAM-used sensor, matching the percentage gauge without counting cached memory as used. Storage capacities use the current entity attributes and keep unknown readings distinct from zero. Disk rows combine metrics by device identity when unambiguous, including entity IDs with Home Assistant collision suffixes. Network discovery excludes explicitly foreign registry ownership, and traffic labels respect Home Assistant display units and locale.

### Docker and VM labels and filters

Docker and VM cards display actual workload names. Use `title` to customize the card header and optional label maps to shorten individual names. Map keys are the exact, case-sensitive Unraid workload names (without a leading `/` for Docker containers). For older entities without `container_name` or `vm_name`, use the entity slug as the map key. For example, use `ha` for `switch.cube_virtual_machine_ha`.

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

`default_filter` supports `all` (the default), `running`, and `stopped`. Docker cards also support `paused` and `updates`. Use **Default Filter** in the visual editor to set the initial tab. Select a tab to change the current view.

Set label maps in YAML. The editor preserves these maps. Tooltips show the full workload names. Cards use the friendly name if an older entity has no workload name attribute.

### Card appearance and accessibility

All eight cards use the colors, type, spacing, and corner radii of the selected Home Assistant theme. This includes light, dark, and custom themes. Controls show keyboard focus and have 40px text or 48px icon touch targets. Cards show status in text and color. Cards use the reduced motion preference.

Cards show a placeholder for unknown readings. The Running and Stopped filters exclude workloads with an unknown state. Cards disable power controls for those workloads.

Use the arrow keys to move focus between dashboard tabs. The direction follows the display language. Press Home or End to move to the first or last tab. Press Enter or Space to open the selected section.

Use the keyboard or pointer to open the Home Assistant more-info dialog. Select a workload name, share row, network interface, or gauge. Tooltips show full names. Section heights adjust to show long lists. Narrow layouts wrap controls and support right-to-left languages.

| Editor option | Cards | Default |
| --- | --- | --- |
| `server`, `title` | All | Automatic server, default title |
| `show_system_info` | Server, unified dashboard | `true` |
| `view_mode` | Docker, unified dashboard | `grid` |
| `default_filter` | Docker, VM, unified dashboard | `all`, `running`, `stopped`. `paused` and `updates` apply to Docker only |
| `container_labels`, `vm_labels` | Corresponding card, unified dashboard | YAML only. The editor keeps these labels. |

The visual editor uses Home Assistant form controls. The device picker lists only Unraid servers. Other controls include a text field, drop-down lists, and a switch. The editor shows defaults without writing them to YAML. Clear a field to use its default value.

The code editor opens if `server` contains a server name or an option has an unsupported value. This preserves the existing YAML.

The frontend uses **TypeScript 7.0.2**, pinned in both its package manifest and lockfile. CI installs with `npm ci` and runs `tsc --noEmit`, unit tests, the bundle build and Chromium regression tests. The cards follow the Home Assistant [custom-card guidance](https://contributors.home-assistant.io/frontend/custom-ui/card/) and [accessibility guidance](https://contributors.home-assistant.io/design/foundations/accessibility/). The cards include fallbacks for Home Assistant 2026.9.

### Interactive More-Info Dialogs

Select a CPU, RAM, or storage ring to open the Home Assistant **More-Info dialog**. You can also select an uptime, network, or battery reading. The dialog shows history graphs, attributes, and settings.

### Dashboard Layout & Native View Tabs (2026+ Best Practice)

Use Home Assistant **Sections view** to configure a dashboard for mobile and desktop. Add the `custom:unraid-dashboard-card` or use separate view tabs and subviews.

> **Entity ID Placeholders**: Replace `<your_server>` with your server name (for example, `cube`, `tower`) and `<model>` with your UPS model (for example, `pr1000elcdrt1u`). You can check your exact entity IDs under **Settings → Devices & Services → Unraid**.

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

- **Verify API Key**: Make sure the key is valid and has appropriate permissions
- **Network Access**: Confirm Home Assistant can reach the Unraid server
- **Firewall**: Make sure HTTPS port (443) is accessible
- **Unraid API Version**: Requires GraphQL API v4.31.1+ (install the Unraid Connect plugin to update)

### Missing Entities

- Check the service status (Docker, VMs, UPS).
- Verify devices exist on the Unraid server
- Check Home Assistant logs for errors

### Entities Not Updating

- System sensors update each 30 seconds, storage sensors each 5 minutes
- Use `homeassistant.update_entity` service to force immediate refresh
- Check Unraid server responsiveness
- View integration diagnostics for coordinator status

### Reauthentication

If your API key becomes invalid:

1. Home Assistant shows a repair notice when it needs a new Unraid API key.
2. Select the notice and enter a new API key
3. Alternatively, go to **Settings** → **Devices & Services**, find Unraid, and use the "Reconfigure" option

## Removal

To remove the integration:

1. Go to **Settings** → **Devices & Services**
2. Find the **Unraid** entry
3. Click the three-dot menu (⋮) and select **Delete**
4. Confirm removal

If you installed the integration with HACS, uninstall it from HACS after you remove the integration.

## Known Limitations

- **GraphQL API Required**: This integration requires the Unraid GraphQL API v4.31.1 or later. Use the Unraid Connect plugin to update the API independently of Unraid OS.
- **No Network Discovery**: Unraid servers must be manually configured (no SSDP/mDNS discovery)
- **Disk SMART Data**: SMART queries can be slow on large arrays. The integration polls storage less frequently.
- **Container/VM Actions**: Start/stop operations may take up to 60 seconds to complete
- **SSL Certificates**: Self-signed certificates require enabling "Allow insecure connections" (or configuring custom CA)

## Custom Polling Intervals

The integration uses fixed polling intervals, as specified by the Home Assistant Core integration guidelines. For more frequent sensor updates, call `homeassistant.update_entity` from a time-pattern automation. For example, use this procedure to update a disk temperature sensor for fan control.

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
