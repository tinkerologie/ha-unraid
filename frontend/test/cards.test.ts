import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { UnraidServerCard } from "../src/server-card";
import { UnraidStorageCard, formatDiskName } from "../src/storage-card";
import { UnraidSharesCard, formatShareName } from "../src/shares-card";
import { UnraidDockerCard } from "../src/docker-card";
import { UnraidUpsCard, formatRuntime } from "../src/ups-card";
import { UnraidVmCard } from "../src/vm-card";
import { UnraidDashboardCard } from "../src/dashboard-card";
import { UnraidNetworkCard } from "../src/network-card";
import {
  UnraidDockerCardEditor,
  UnraidVmCardEditor,
  UnraidNetworkCardEditor,
  UnraidServerCardEditor,
  UnraidSharesCardEditor,
} from "../src/dashboard-cards-editor";
import workloadSnapshot from "./fixtures/workloads.json";
import type { HomeAssistant } from "../src/ha-types";

function createMockHass(): HomeAssistant {
  return {
    states: {
      "sensor.cube_cpu_usage": {
        entity_id: "sensor.cube_cpu_usage",
        state: "15",
        attributes: {
          friendly_name: "CUBE CPU Usage",
          cpu_model: "Intel i7-8700K",
          cpu_cores: 6,
          cpu_threads: 12,
        },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_ram_usage": {
        entity_id: "sensor.cube_ram_usage",
        state: "25",
        attributes: {
          friendly_name: "CUBE RAM Usage",
          used: "8 GiB",
          total: "32 GiB",
        },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_array_usage": {
        entity_id: "sensor.cube_array_usage",
        state: "10",
        attributes: {
          friendly_name: "CUBE Array Usage",
          capacity_used: "4 TB",
          capacity_total: "40 TB",
          capacity_free: "36 TB",
        },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_array_state": {
        entity_id: "sensor.cube_array_state",
        state: "Started",
        attributes: {},
        last_changed: "",
        last_updated: "",
      },
      "binary_sensor.cube_parity_valid": {
        entity_id: "binary_sensor.cube_parity_valid",
        state: "off",
        attributes: { friendly_name: "Cube Parity Valid" },
        last_changed: "",
        last_updated: "",
      },
      "binary_sensor.cube_parity_check_running": {
        entity_id: "binary_sensor.cube_parity_check_running",
        state: "off",
        attributes: { friendly_name: "Cube Parity Check Running", status: "completed" },
        last_changed: "",
        last_updated: "",
      },
      "binary_sensor.cube_parity_status": {
        entity_id: "binary_sensor.cube_parity_status",
        state: "off",
        attributes: { status: "completed" },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_disk_disk1_usage": {
        entity_id: "sensor.cube_disk_disk1_usage",
        state: "12",
        attributes: {
          friendly_name: "Cube Disk disk1 usage",
          status: "DISK_OK",
          num_errors: 0,
          spin_state: "active",
        },
        last_changed: "",
        last_updated: "",
      },
      "binary_sensor.cube_disk_disk1_health": {
        entity_id: "binary_sensor.cube_disk_disk1_health",
        state: "off",
        attributes: { status: "DISK_OK" },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_disk_disk1_temperature": {
        entity_id: "sensor.cube_disk_disk1_temperature",
        state: "32",
        attributes: {},
        last_changed: "",
        last_updated: "",
      },
      "switch.cube_disk_disk1_spin": {
        entity_id: "switch.cube_disk_disk1_spin",
        state: "on",
        attributes: {},
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_share_appdata_usage": {
        entity_id: "sensor.cube_share_appdata_usage",
        state: "9.7",
        attributes: {
          friendly_name: "Cube Share appdata usage",
          used: "46.6 GB",
          total: "480.6 GB",
          free: "434.0 GB",
          color: "yellow-on",
        },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_share_media_usage": {
        entity_id: "sensor.cube_share_media_usage",
        state: "45.0",
        attributes: {
          friendly_name: "Cube Share media usage",
          used: "18.0 TB",
          total: "40.0 TB",
          free: "22.0 TB",
          color: "green-on",
        },
        last_changed: "",
        last_updated: "",
      },
      "switch.cube_docker_container_plex": {
        entity_id: "switch.cube_docker_container_plex",
        state: "on",
        attributes: { friendly_name: "Unraid Container plex", container_name: "plex" },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_ups_battery": {
        entity_id: "sensor.cube_ups_battery",
        state: "100",
        attributes: {},
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_ups_load": {
        entity_id: "sensor.cube_ups_load",
        state: "15",
        attributes: {},
        last_changed: "",
        last_updated: "",
      },
      "switch.cube_virtual_machine_ha": {
        entity_id: "switch.cube_virtual_machine_ha",
        state: "on",
        attributes: {
          friendly_name: "Unraid VM Home Assistant",
          vm_name: "Home Assistant",
        },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_disk_flash_usage": {
        entity_id: "sensor.cube_disk_flash_usage",
        state: "8",
        attributes: {
          friendly_name: "Cube Disk flash usage",
          status: "DISK_OK",
          num_errors: 0,
          device: "sdb",
          fs_size: "31.4 GB",
          fs_used: "2.68 GB",
          fs_free: "28.7 GB",
        },
        last_changed: "",
        last_updated: "",
      },
      "binary_sensor.cube_disk_flash_health": {
        entity_id: "binary_sensor.cube_disk_flash_health",
        state: "off",
        attributes: { status: "DISK_OK" },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_network_eth0_ip_address": {
        entity_id: "sensor.cube_network_eth0_ip_address",
        state: "192.168.20.21",
        attributes: {
          friendly_name: "Cube Network eth0 IP",
          mac_address: "00:11:22:33:44:55",
          mtu: 1500,
        },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_network_eth0_speed": {
        entity_id: "sensor.cube_network_eth0_speed",
        state: "1000",
        attributes: { unit_of_measurement: "Mbps" },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_network_eth0_rx_throughput": {
        entity_id: "sensor.cube_network_eth0_rx_throughput",
        state: "12.4",
        attributes: { total_received: "1.2 GB" },
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_network_eth0_tx_throughput": {
        entity_id: "sensor.cube_network_eth0_tx_throughput",
        state: "5.8",
        attributes: { total_sent: "650 MB" },
        last_changed: "",
        last_updated: "",
      },
      "binary_sensor.cube_network_eth0_link": {
        entity_id: "binary_sensor.cube_network_eth0_link",
        state: "on",
        attributes: {},
        last_changed: "",
        last_updated: "",
      },
      "sensor.cube_network_access": {
        entity_id: "sensor.cube_network_access",
        state: "http://192.168.20.21",
        attributes: {
          LAN_IPv4_ipv4: "http://192.168.20.21",
          FQDN_LAN_ipv4: "https://cube.myunraid.net",
        },
        last_changed: "",
        last_updated: "",
      },
    },
    devices: {
      dev_1: {
        id: "dev_1",
        name: "CUBE",
        identifiers: [["unraid", "uuid-1234"]],
        model: "Fractal Node 304",
        sw_version: "6.12.10",
      },
    },
    entities: {},
    callService: vi.fn().mockResolvedValue(undefined),
  };
}

describe("Unraid Custom Cards", () => {
  it("registers all cards in window.customCards", () => {
    expect(window.customCards).toBeDefined();
    const tags = window.customCards?.map((c) => c.type);
    expect(tags).toContain("unraid-server-card");
    expect(tags).toContain("unraid-storage-card");
    expect(tags).toContain("unraid-shares-card");
    expect(tags).toContain("unraid-docker-card");
    expect(tags).toContain("unraid-ups-card");
    expect(tags).toContain("unraid-vm-card");
    expect(tags).toContain("unraid-network-card");
    expect(tags).toContain("unraid-dashboard-card");
  });

  it("formats disk and share names cleanly", () => {
    expect(formatDiskName("Cube Disk disk1 usage", "disk1")).toBe("Disk 1");
    expect(formatDiskName("Tower Disk cache usage", "cache")).toBe("Cache");
    expect(formatDiskName("Cube Disk parity health", "parity")).toBe("Parity");
    expect(formatDiskName("Cube Disk flash usage", "flash")).toBe("Flash (Boot)");
    expect(formatDiskName("disk_2", "disk_2")).toBe("Disk 2");

    expect(formatShareName("Cube Share appdata usage", "appdata")).toBe("appdata");
    expect(formatShareName("Media Share", "media")).toBe("Media");
  });

  it("renders UnraidServerCard with mock hass data and formats numeric uptime", async () => {
    const card = new UnraidServerCard();
    card.setConfig({ type: "custom:unraid-server-card" });
    const hass = createMockHass();
    hass.states["sensor.cube_uptime"] = {
      entity_id: "sensor.cube_uptime",
      state: "90000",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.getCardSize()).toBe(4);
    expect(card.getGridOptions().columns).toBe(12);
    expect(card.getGridOptions()).not.toHaveProperty("rows");
    expect(card.shadowRoot?.innerHTML).toContain("CUBE");
    expect(card.shadowRoot?.innerHTML).toContain("CPU Load");
    expect(card.shadowRoot?.innerHTML).toContain("15%");
    expect(card.shadowRoot?.innerHTML).toContain("1d 1h");
    expect(card.shadowRoot?.innerHTML).toContain("192.168.20.21");
    expect(card.shadowRoot?.innerHTML).toContain("Boot Device");
    expect(card.shadowRoot?.innerHTML).toContain("Flash");
    document.body.removeChild(card);
  });

  it("dispatches hass-more-info event when clicking server rings and supports navigation", async () => {
    const card = new UnraidServerCard();
    card.setConfig({ type: "custom:unraid-server-card" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;

    let moreInfoEvent: CustomEvent | null = null;
    card.addEventListener("hass-more-info", ((e: CustomEvent) => {
      moreInfoEvent = e;
    }) as EventListener);

    const cpuRing = card.shadowRoot?.querySelector(".ring-card") as HTMLElement;
    expect(cpuRing).not.toBeNull();
    cpuRing.click();

    expect(moreInfoEvent).not.toBeNull();
    expect((moreInfoEvent as any)?.detail?.entityId).toBe("sensor.cube_cpu_usage");

    // Test navigate helper on BaseUnraidCard
    let locationChanged = false;
    const locHandler = () => {
      locationChanged = true;
    };
    window.addEventListener("location-changed", locHandler);
    (card as any).navigate("/dashboard-unraid/storage");
    expect(locationChanged).toBe(true);
    window.removeEventListener("location-changed", locHandler);

    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard with clean disk names and Healthy badge", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Storage Array &amp; Disks");
    expect(card.shadowRoot?.innerHTML).toContain("Disk 1");
    expect(card.shadowRoot?.innerHTML).toContain("Flash (Boot)");
    expect(card.shadowRoot?.innerHTML).toContain("Healthy");
    expect(card.shadowRoot?.innerHTML).toContain("Active");
    expect(card.shadowRoot?.innerHTML).toContain("32°C");
    expect(card.shadowRoot?.innerHTML).toContain("Parity Valid");
    expect(card.shadowRoot?.innerHTML).toContain("Parity Status: Valid");
    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard with Parity Valid when progress is 100 and check is not running", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    mockHass.states["sensor.cube_parity_progress"] = {
      entity_id: "sensor.cube_parity_progress",
      state: "100",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    mockHass.states["switch.cube_parity_check"] = {
      entity_id: "switch.cube_parity_check",
      state: "off",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Valid");
    expect(card.shadowRoot?.innerHTML).toContain("Parity Status: Valid");
    expect(card.shadowRoot?.innerHTML).not.toContain("Parity Check In Progress");
    expect(card.shadowRoot?.innerHTML).not.toContain("Parity Check Needed");
    expect(card.shadowRoot?.innerHTML).toContain("Check Now");
    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard with Parity Check Needed when validity sensor is on", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    mockHass.states["binary_sensor.cube_parity_valid"] = {
      entity_id: "binary_sensor.cube_parity_valid",
      state: "on",
      attributes: { friendly_name: "Cube Parity Valid" },
      last_changed: "",
      last_updated: "",
    };
    mockHass.states["sensor.cube_last_parity_check_errors"] = {
      entity_id: "sensor.cube_last_parity_check_errors",
      state: "5",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Check Needed");
    expect(card.shadowRoot?.innerHTML).toContain("Parity Status: Check Needed");
    expect(card.shadowRoot?.innerHTML).toContain("5 errors");
    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard with check in progress at 0% and Cancel button", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    mockHass.states["binary_sensor.cube_parity_check_running"] = {
      entity_id: "binary_sensor.cube_parity_check_running",
      state: "on",
      attributes: { friendly_name: "Cube Parity Check Running", status: "running" },
      last_changed: "",
      last_updated: "",
    };
    mockHass.states["sensor.cube_parity_progress"] = {
      entity_id: "sensor.cube_parity_progress",
      state: "0",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    mockHass.states["switch.cube_parity_check"] = {
      entity_id: "switch.cube_parity_check",
      state: "on",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Check In Progress (0%)");
    expect(card.shadowRoot?.innerHTML).toContain("Cancel");
    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard with Parity Check Paused", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    mockHass.states["binary_sensor.cube_parity_check_running"] = {
      entity_id: "binary_sensor.cube_parity_check_running",
      state: "on",
      attributes: { friendly_name: "Cube Parity Check Running", status: "paused" },
      last_changed: "",
      last_updated: "",
    };
    mockHass.states["sensor.cube_parity_progress"] = {
      entity_id: "sensor.cube_parity_progress",
      state: "42",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Check Paused (42%)");
    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard with Parity Status Unknown when validity is unknown or unavailable", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    mockHass.states["binary_sensor.cube_parity_valid"] = {
      entity_id: "binary_sensor.cube_parity_valid",
      state: "unknown",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    delete mockHass.states["binary_sensor.cube_parity_status"];
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Status Unknown");
    expect(card.shadowRoot?.innerHTML).toContain("Parity Status: Unknown");
    expect(card.shadowRoot?.innerHTML).not.toContain("Parity Check Needed");
    document.body.removeChild(card);
  });

  it("renders UnraidStorageCard using legacy sensor fallback when dedicated entities are absent", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    delete mockHass.states["binary_sensor.cube_parity_valid"];
    delete mockHass.states["binary_sensor.cube_parity_check_running"];

    // Legacy off -> Parity Valid
    mockHass.states["binary_sensor.cube_parity_status"] = {
      entity_id: "binary_sensor.cube_parity_status",
      state: "off",
      attributes: { status: "completed" },
      last_changed: "",
      last_updated: "",
    };
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Valid");
    expect(card.shadowRoot?.innerHTML).toContain("Parity Status: Valid");

    // Legacy on with status running -> In Progress
    mockHass.states["binary_sensor.cube_parity_status"] = {
      entity_id: "binary_sensor.cube_parity_status",
      state: "on",
      attributes: { status: "running" },
      last_changed: "",
      last_updated: "",
    };
    mockHass.states["sensor.cube_parity_progress"] = {
      entity_id: "sensor.cube_parity_progress",
      state: "65",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = { ...mockHass };
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Parity Check In Progress (65%)");
    document.body.removeChild(card);
  });

  it("does not render unknown last check date text", async () => {
    const card = new UnraidStorageCard();
    card.setConfig({ type: "custom:unraid-storage-card" });
    const mockHass = createMockHass();
    mockHass.states["sensor.cube_last_parity_check_date"] = {
      entity_id: "sensor.cube_last_parity_check_date",
      state: "unknown",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = mockHass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).not.toContain("Last check: unknown");
    expect(card.shadowRoot?.innerHTML).toContain("Parity healthy");
    document.body.removeChild(card);
  });

  it("renders UnraidSharesCard and handles protection states", async () => {
    const card = new UnraidSharesCard();
    card.setConfig({ type: "custom:unraid-shares-card" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("User Shares");
    expect(card.shadowRoot?.innerHTML).toContain("appdata");
    expect(card.shadowRoot?.innerHTML).toContain("media");
    expect(card.shadowRoot?.innerHTML).toContain("Protected");
    expect(card.shadowRoot?.innerHTML).toContain("46.6 GB");
    expect(card.shadowRoot?.innerHTML).toContain("480.6 GB");
    document.body.removeChild(card);
  });

  it("renders UnraidDockerCard and container list excluding autostart switches", async () => {
    const card = new UnraidDockerCard();
    card.setConfig({ type: "custom:unraid-docker-card", view_mode: "list" });
    const hass = createMockHass();
    hass.states["switch.cube_docker_container_autostart_plex"] = {
      entity_id: "switch.cube_docker_container_autostart_plex",
      state: "on",
      attributes: { friendly_name: "plex Autostart" },
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Docker Containers");
    expect(card.shadowRoot?.innerHTML).toContain("plex");
    expect(card.shadowRoot?.innerHTML).not.toContain("plex Autostart");
    document.body.removeChild(card);
  });

  it("correctly formats UPS runtime for duration strings and numeric values", () => {
    expect(formatRuntime("1 hour 41 minutes")).toBe("1 hour 41 minutes");
    expect(formatRuntime("1 hour 41 minutes min")).toBe("1 hour 41 minutes");
    expect(formatRuntime("45 minutes min")).toBe("45 minutes");
    expect(formatRuntime("101")).toBe("1 hour 41 minutes");
    expect(formatRuntime("60")).toBe("1 hour");
    expect(formatRuntime("1")).toBe("1 minute");
    expect(formatRuntime("45")).toBe("45 minutes");
    expect(formatRuntime("3600", { unit_of_measurement: "s" })).toBe("1 hour");
    expect(formatRuntime("unavailable")).toBeNull();
    expect(formatRuntime("unknown")).toBeNull();
    expect(formatRuntime(null)).toBeNull();
  });

  it("renders UnraidUpsCard with battery, load, and properly formatted runtime", async () => {
    const card = new UnraidUpsCard();
    card.setConfig({ type: "custom:unraid-ups-card" });
    const hass = createMockHass();
    hass.states["sensor.cube_ups_runtime"] = {
      entity_id: "sensor.cube_ups_runtime",
      state: "1 hour 41 minutes",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("UPS Power &amp; Battery");
    expect(card.shadowRoot?.innerHTML).toContain("100%");
    expect(card.shadowRoot?.innerHTML).toContain("1 hour 41 minutes");
    expect(card.shadowRoot?.innerHTML).not.toContain("1 hour 41 minutes min");
    document.body.removeChild(card);
  });

  it("renders UnraidVmCard with virtual machines", async () => {
    const card = new UnraidVmCard();
    card.setConfig({ type: "custom:unraid-vm-card" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Virtual Machines");
    expect(card.shadowRoot?.innerHTML).toContain("Home Assistant");
    document.body.removeChild(card);
  });

  it("renders UnraidDashboardCard with tabs", async () => {
    const card = new UnraidDashboardCard();
    card.setConfig({ type: "custom:unraid-dashboard-card" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Unified Unraid Control Center");
    expect(card.shadowRoot?.innerHTML).toContain("Shares");
    document.body.removeChild(card);
  });

  it("renders UnraidServerCardEditor and updates config", async () => {
    const editor = new UnraidServerCardEditor();
    editor.setConfig({ type: "custom:unraid-server-card", title: "My Tower" });
    editor.hass = createMockHass();
    document.body.appendChild(editor);
    await editor.updateComplete;

    expect(editor.shadowRoot?.innerHTML).toContain("Unraid Server");
    expect(editor.shadowRoot?.innerHTML).toContain("Custom Title");
    document.body.removeChild(editor);
  });

  it("renders UnraidSharesCardEditor", async () => {
    const editor = new UnraidSharesCardEditor();
    editor.setConfig({ type: "custom:unraid-shares-card", title: "My Shares" });
    editor.hass = createMockHass();
    document.body.appendChild(editor);
    await editor.updateComplete;

    expect(editor.shadowRoot?.innerHTML).toContain("Unraid Server");
    expect(editor.shadowRoot?.innerHTML).toContain("Custom Title");
    document.body.removeChild(editor);
  });

  it("renders UnraidServerCard with ISO timestamp uptime", async () => {
    const card = new UnraidServerCard();
    card.setConfig({ type: "custom:unraid-server-card" });
    const hass = createMockHass();
    const threeHoursAgo = new Date(
      Date.now() - 3 * 3600 * 1000 - 15 * 60 * 1000
    ).toISOString();
    hass.states["sensor.cube_up_since"] = {
      entity_id: "sensor.cube_up_since",
      state: threeHoursAgo,
      attributes: { friendly_name: "Cube Up since" },
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("3h 15m");
    document.body.removeChild(card);
  });

  it("renders UnraidNetworkCard with interface list and traffic metrics", async () => {
    const card = new UnraidNetworkCard();
    card.setConfig({ type: "custom:unraid-network-card" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("Network");
    expect(card.shadowRoot?.innerHTML).toContain("eth0");
    expect(card.shadowRoot?.innerHTML).toContain("192.168.20.21");
    expect(card.shadowRoot?.innerHTML).toContain("1 Gbps");
    expect(card.shadowRoot?.innerHTML).toContain("12.40 MB/s");
    expect(card.shadowRoot?.innerHTML).toContain("5.80 MB/s");
    expect(card.shadowRoot?.innerHTML).toContain("1 Connected");
    document.body.removeChild(card);
  });

  it("handles shares with missing color attribute and clamps usage percentage", async () => {
    const card = new UnraidSharesCard();
    card.setConfig({ type: "custom:unraid-shares-card" });
    const hass = createMockHass();
    // Add a share with missing color and >100% usage
    hass.states["sensor.cube_share_unprotected_usage"] = {
      entity_id: "sensor.cube_share_unprotected_usage",
      state: "105.0",
      attributes: {
        friendly_name: "Cube Share unprotected usage",
        used: "10.5 TB",
        total: "10.0 TB",
        free: "0 TB",
      },
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.shadowRoot?.innerHTML).toContain("unprotected");
    expect(card.shadowRoot?.innerHTML).toContain("Unprotected");
    // Verify width is clamped to 100%
    expect(card.shadowRoot?.innerHTML).toContain("width: 100%");
    document.body.removeChild(card);
  });

  it("filters placeholder IP states from connected count and formats small data rates", async () => {
    const card = new UnraidNetworkCard();
    card.setConfig({ type: "custom:unraid-network-card" });
    const hass = createMockHass();
    // Add an unavailable interface
    hass.states["sensor.cube_network_eth1_ip_address"] = {
      entity_id: "sensor.cube_network_eth1_ip_address",
      state: "unavailable",
      attributes: { friendly_name: "Cube Network eth1 IP" },
      last_changed: "",
      last_updated: "",
    };
    hass.states["binary_sensor.cube_network_eth1_link"] = {
      entity_id: "binary_sensor.cube_network_eth1_link",
      state: "off",
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    hass.states["sensor.cube_network_eth1_rx_throughput"] = {
      entity_id: "sensor.cube_network_eth1_rx_throughput",
      state: "0.05", // 0.05 MB/s = 50.0 kB/s
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    // eth0 is connected, eth1 is unavailable/off -> still 1 connected
    expect(card.shadowRoot?.innerHTML).toContain("1 Connected");
    expect(card.shadowRoot?.innerHTML).toContain("50.0 kB/s");
    expect(card.shadowRoot?.innerHTML).not.toContain("unavailable");

    // When throughput reports 'unknown' or 'unavailable', placeholder '--' is shown
    hass.states["sensor.cube_network_eth1_rx_throughput"].state = "unavailable";
    card.requestUpdate();
    await card.updateComplete;
    expect(card.shadowRoot?.innerHTML).not.toContain("unavailable");
    document.body.removeChild(card);
  });

  it("renders UnraidNetworkCardEditor", async () => {
    const editor = new UnraidNetworkCardEditor();
    editor.setConfig({ type: "custom:unraid-network-card", title: "My Network" });
    editor.hass = createMockHass();
    document.body.appendChild(editor);
    await editor.updateComplete;

    expect(editor.shadowRoot?.innerHTML).toContain("Unraid Server");
    expect(editor.shadowRoot?.innerHTML).toContain("Custom Title");
    document.body.removeChild(editor);
  });
});

for (const spec of [
  {
    Card: UnraidDockerCard,
    type: "custom:unraid-docker-card",
    entity: "switch.cube_docker_container_plex",
    attribute: "container_name",
    labels: "container_labels",
    raw: "plex",
    slug: "plex",
    selector: ".row-left span[title]",
  },
  {
    Card: UnraidVmCard,
    type: "custom:unraid-vm-card",
    entity: "switch.cube_virtual_machine_ha",
    attribute: "vm_name",
    labels: "vm_labels",
    raw: "Home Assistant",
    slug: "ha",
    selector: ".vm-name",
  },
]) {
  describe(`${spec.attribute} labels`, () => {
    afterEach(() => document.body.replaceChildren());
    const attributes = {
      friendly_name: `Unraid prefixed ${spec.raw}`,
      [spec.attribute]: spec.raw,
    };
    const scenarios: Array<{
      description: string;
      attributes: Record<string, unknown>;
      labels?: Record<string, unknown>;
      expected: string;
      tooltip: string;
    }> = [
      { description: "raw name", attributes, expected: spec.raw, tooltip: spec.raw },
      {
        description: "explicit override",
        attributes,
        labels: { [spec.raw]: "Short label" },
        expected: "Short label",
        tooltip: spec.raw,
      },
      {
        description: "friendly fallback",
        attributes: { friendly_name: "Friendly label" },
        expected: "Friendly label",
        tooltip: "Friendly label",
      },
      {
        description: "slug fallback",
        attributes: { friendly_name: "" },
        expected: spec.slug,
        tooltip: spec.slug,
      },
      {
        description: "blank raw name friendly fallback",
        attributes: { friendly_name: "Friendly label", [spec.attribute]: "   " },
        expected: "Friendly label",
        tooltip: "Friendly label",
      },
      {
        description: "blank raw name slug fallback",
        attributes: { [spec.attribute]: "   " },
        expected: spec.slug,
        tooltip: spec.slug,
      },
      {
        description: "legacy slug override",
        attributes: { friendly_name: "Long name" },
        labels: { [spec.slug]: "Legacy label" },
        expected: "Legacy label",
        tooltip: "Long name",
      },
      ...["", "   ", 42, null].map((value) => ({
        description: `invalid override ${String(value)}`,
        attributes,
        labels: { [spec.raw]: value },
        expected: spec.raw,
        tooltip: spec.raw,
      })),
    ];
    it.each(scenarios)(
      "renders $description with a full-name tooltip",
      async (scenario) => {
        const card = new spec.Card();
        card.setConfig({
          type: spec.type,
          view_mode: "list",
          [spec.labels]: scenario.labels,
        });
        const hass = createMockHass();
        hass.states[spec.entity]!.attributes = scenario.attributes;
        card.hass = hass;
        document.body.appendChild(card);
        await card.updateComplete;
        const name = card.shadowRoot!.querySelector(spec.selector)!;
        expect(name.textContent?.trim()).toBe(scenario.expected);
        expect(name.getAttribute("title")).toBe(scenario.tooltip);
      }
    );
  });
}

function mixedVmHass(): HomeAssistant {
  const hass = createMockHass();
  hass.states["switch.cube_virtual_machine_backup"] = {
    entity_id: "switch.cube_virtual_machine_backup",
    state: "off",
    attributes: { friendly_name: "Unraid VM Backup", vm_name: "Backup" },
    last_changed: "",
    last_updated: "",
  };
  return hass;
}

function vmNames(card: UnraidVmCard): string[] {
  return [...card.shadowRoot!.querySelectorAll(".vm-name")].map((name) =>
    name.textContent!.trim()
  );
}

describe("VM status filters", () => {
  afterEach(() => document.body.replaceChildren());
  it("filters all, running and stopped VMs using counted tabs", async () => {
    const card = new UnraidVmCard();
    card.setConfig({ type: "custom:unraid-vm-card" });
    card.hass = mixedVmHass();
    document.body.appendChild(card);
    await card.updateComplete;
    expect(vmNames(card)).toEqual(["Home Assistant", "Backup"]);
    const tabs = card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".tab-btn");
    expect([...tabs].map((b) => b.textContent!.trim())).toEqual([
      "All (2)",
      "Running (1)",
      "Stopped (1)",
    ]);
    for (const [index, expected] of [
      [1, ["Home Assistant"]],
      [2, ["Backup"]],
      [0, ["Home Assistant", "Backup"]],
    ] as const) {
      tabs[index]!.click();
      await card.updateComplete;
      expect(vmNames(card)).toEqual(expected);
    }
  });
  it.each(["unknown", "unavailable"])(
    "keeps %s VMs out of running and stopped filters",
    async (state) => {
      const card = new UnraidVmCard();
      const hass = mixedVmHass();
      hass.states["switch.cube_virtual_machine_ha"]!.state = state;
      delete hass.states["sensor.cube_virtual_machine_status_ha"];
      card.setConfig({ type: "custom:unraid-vm-card" });
      card.hass = hass;
      document.body.appendChild(card);
      await card.updateComplete;
      expect(vmNames(card)).toEqual(["Backup", "Home Assistant"]);
      const tabs = card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".tab-btn");
      expect([...tabs].map((b) => b.textContent!.trim())).toEqual([
        "All (2)",
        "Running (0)",
        "Stopped (1)",
      ]);
      tabs[2]!.click();
      await card.updateComplete;
      expect(vmNames(card)).toEqual(["Backup"]);
      tabs[1]!.click();
      await card.updateComplete;
      expect(vmNames(card)).toEqual([]);
    }
  );
  it("honors a configured default without overwriting runtime choices on refresh", async () => {
    const card = new UnraidVmCard();
    card.setConfig({ type: "custom:unraid-vm-card", default_filter: "running" });
    card.hass = mixedVmHass();
    document.body.appendChild(card);
    await card.updateComplete;
    expect(vmNames(card)).toEqual(["Home Assistant"]);
    card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".tab-btn")[2]!.click();
    await card.updateComplete;
    card.hass = mixedVmHass();
    card.setConfig({
      type: "custom:unraid-vm-card",
      default_filter: "running",
      title: "VMs",
    });
    await card.updateComplete;
    expect(vmNames(card)).toEqual(["Backup"]);
    card.setConfig({ type: "custom:unraid-vm-card", default_filter: "all" });
    await card.updateComplete;
    expect(vmNames(card)).toEqual(["Home Assistant", "Backup"]);
  });
  it.each(["updates", "unknown"])(
    "treats unsupported default %s as all",
    async (value) => {
      const card = new UnraidVmCard();
      card.setConfig({
        type: "custom:unraid-vm-card",
        default_filter: value as "updates",
      });
      card.hass = mixedVmHass();
      document.body.appendChild(card);
      await card.updateComplete;
      expect(vmNames(card)).toEqual(["Home Assistant", "Backup"]);
    }
  );
  it("distinguishes an empty filter from an unconfigured VM list", async () => {
    const card = new UnraidVmCard();
    card.setConfig({ type: "custom:unraid-vm-card", default_filter: "stopped" });
    card.hass = createMockHass();
    document.body.appendChild(card);
    await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain("No stopped virtual machines");
    const hass = createMockHass();
    delete hass.states["switch.cube_virtual_machine_ha"];
    card.hass = hass;
    await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain("No virtual machines configured");
  });
});

describe("workload filter editors", () => {
  afterEach(() => document.body.replaceChildren());
  it.each([
    {
      Editor: UnraidDockerCardEditor,
      type: "custom:unraid-docker-card",
      updates: true,
    },
    { Editor: UnraidVmCardEditor, type: "custom:unraid-vm-card", updates: false },
  ])("persists Default Filter and label maps for $type", async (spec) => {
    const editor = new spec.Editor();
    editor.setConfig({
      type: spec.type,
      default_filter: "stopped",
      container_labels: { plex: "Media" },
      vm_labels: { "Home Assistant": "HA" },
    });
    editor.hass = createMockHass();
    document.body.appendChild(editor);
    await editor.updateComplete;
    const select =
      editor.shadowRoot!.querySelector<HTMLSelectElement>("#default_filter")!;
    expect(select).not.toBeNull();
    expect(select.value).toBe("stopped");
    expect([...select.options].map((o) => o.value)).toEqual(
      spec.updates
        ? ["all", "running", "stopped", "updates"]
        : ["all", "running", "stopped"]
    );
    let saved: Record<string, unknown> = {};
    editor.addEventListener("config-changed", (event) => {
      saved = (event as CustomEvent).detail.config;
    });
    select.value = "running";
    select.dispatchEvent(new Event("change"));
    expect(saved.default_filter).toBe("running");
    expect(saved.container_labels).toEqual({ plex: "Media" });
    expect(saved.vm_labels).toEqual({ "Home Assistant": "HA" });
  });
});

describe("Docker filter defaults", () => {
  afterEach(() => document.body.replaceChildren());
  it.each(["running", "stopped"] as const)(
    "applies default %s on initial render",
    async (filter) => {
      const card = new UnraidDockerCard();
      card.setConfig({
        type: "custom:unraid-docker-card",
        view_mode: "list",
        default_filter: filter,
      });
      const hass = createMockHass();
      hass.states["switch.cube_docker_container_backup"] = {
        entity_id: "switch.cube_docker_container_backup",
        state: "off",
        attributes: { container_name: "Backup" },
        last_changed: "",
        last_updated: "",
      };
      card.hass = hass;
      document.body.appendChild(card);
      await card.updateComplete;
      const labels = [
        ...card.shadowRoot!.querySelectorAll(".row-left span[title]"),
      ].map((name) => name.textContent!.trim());
      expect(labels).toEqual(filter === "running" ? ["plex"] : ["Backup"]);
    }
  );
});

describe("VM editor filter compatibility", () => {
  afterEach(() => document.body.replaceChildren());
  it.each(["updates", "unknown"])(
    "shows all for unsupported default %s",
    async (filter) => {
      const editor = new UnraidVmCardEditor();
      editor.setConfig({
        type: "custom:unraid-vm-card",
        default_filter: filter as "updates",
      });
      document.body.appendChild(editor);
      await editor.updateComplete;
      expect(
        editor.shadowRoot!.querySelector<HTMLSelectElement>("#default_filter")!.value
      ).toBe("all");
    }
  );
});

describe("removing workload filter defaults", () => {
  afterEach(() => document.body.replaceChildren());
  it.each([
    {
      Card: UnraidDockerCard,
      type: "custom:unraid-docker-card",
      key: "switch.cube_docker_container_backup",
      attribute: "container_name",
      selector: ".row-left span[title]",
    },
    {
      Card: UnraidVmCard,
      type: "custom:unraid-vm-card",
      key: "switch.cube_virtual_machine_backup",
      attribute: "vm_name",
      selector: ".vm-name",
    },
  ])("restores all workloads in $type when the default is removed", async (spec) => {
    const card = new spec.Card();
    card.setConfig({ type: spec.type, view_mode: "list", default_filter: "running" });
    const hass = createMockHass();
    hass.states[spec.key] = {
      entity_id: spec.key,
      state: "off",
      attributes: { [spec.attribute]: "Backup" },
      last_changed: "",
      last_updated: "",
    };
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelectorAll(spec.selector)).toHaveLength(1);
    card.setConfig({ type: spec.type, view_mode: "list" });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelectorAll(spec.selector)).toHaveLength(2);
    card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".tab-btn")[2]!.click();
    await card.updateComplete;
    card.setConfig({ type: spec.type, view_mode: "list", title: "Renamed" });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelectorAll(spec.selector)).toHaveLength(1);
    expect(card.shadowRoot!.querySelector(spec.selector)!.textContent?.trim()).toBe(
      "Backup"
    );
  });
});

describe("empty Docker update filters", () => {
  afterEach(() => document.body.replaceChildren());
  it.each(["grid", "list"] as const)(
    "keeps the selected Updates tab visible in %s mode",
    async (view_mode) => {
      const card = new UnraidDockerCard();
      card.setConfig({
        type: "custom:unraid-docker-card",
        view_mode,
        default_filter: "updates",
      });
      card.hass = createMockHass();
      document.body.appendChild(card);
      await card.updateComplete;
      const active = card.shadowRoot!.querySelector(".tab-btn.active")!;
      expect(active.textContent!.trim()).toBe("Updates (0)");
      expect(card.shadowRoot!.textContent).toContain("No container updates available");
      card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".tab-btn")[0]!.click();
      await card.updateComplete;
      expect(card.shadowRoot!.textContent).not.toContain(
        "No container updates available"
      );
      expect(
        card.shadowRoot!.querySelectorAll(".container-tile, .list-row")
      ).toHaveLength(1);
    }
  );
});

describe("empty Docker inventory and status filters", () => {
  afterEach(() => document.body.replaceChildren());
  for (const view_mode of ["grid", "list"] as const) {
    it.each([
      { filter: "all", state: null, message: "No Docker containers configured" },
      { filter: "running", state: "off", message: "No running containers" },
      { filter: "stopped", state: "on", message: "No stopped containers" },
    ] as const)(
      `renders $message in ${view_mode} mode`,
      async ({ filter, state, message }) => {
        const card = new UnraidDockerCard();
        card.setConfig({
          type: "custom:unraid-docker-card",
          view_mode,
          default_filter: filter,
        });
        const hass = createMockHass();
        if (state === null) delete hass.states["switch.cube_docker_container_plex"];
        else hass.states["switch.cube_docker_container_plex"]!.state = state;
        card.hass = hass;
        document.body.appendChild(card);
        await card.updateComplete;
        expect(card.shadowRoot!.textContent).toContain(message);
      }
    );
  }
});

describe("dashboard accessibility and action safeguards", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  function snapshotHass(): HomeAssistant {
    const hass = createMockHass();
    const snapshot = structuredClone(workloadSnapshot);
    return {
      ...hass,
      states: { ...hass.states, ...snapshot.states },
      entities: snapshot.entities,
    };
  }

  it("renders the shared 20-container snapshot and counted accessible filters", async () => {
    const card = new UnraidDockerCard();
    card.setConfig({ type: "custom:unraid-docker-card" });
    card.hass = snapshotHass();
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelectorAll(".container-tile")).toHaveLength(20);
    const group = card.shadowRoot!.querySelector('[role="group"]')!;
    expect(
      [...group.querySelectorAll("button")].map((b) => [
        b.textContent!.trim(),
        b.getAttribute("aria-pressed"),
      ])
    ).toEqual([
      ["All (20)", "true"],
      ["Running (12)", "false"],
      ["Stopped (8)", "false"],
      ["Updates (1)", "false"],
    ]);
    expect(
      [...group.querySelectorAll("button")].map((b) => ({
        name: b.textContent!.trim(),
        pressed: b.getAttribute("aria-pressed"),
      }))
    ).toMatchSnapshot();
  });

  for (const spec of [
    {
      Card: UnraidDockerCard,
      type: "custom:unraid-docker-card",
      entity: "switch.cube_docker_container_plex",
      label: "plex",
    },
    {
      Card: UnraidVmCard,
      type: "custom:unraid-vm-card",
      entity: "switch.cube_virtual_machine_ha",
      label: "Home Assistant",
    },
  ]) {
    it.each([true, false])(
      `preserves stop confirmation acceptance=%s for ${spec.type}`,
      async (accept) => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(accept);
        const hass = snapshotHass();
        const card = new spec.Card();
        card.setConfig({ type: spec.type, view_mode: "list" });
        card.hass = hass;
        document.body.append(card);
        await card.updateComplete;
        card
          .shadowRoot!.querySelector<HTMLButtonElement>(
            `button[aria-label="Stop ${spec.label}"]`
          )!
          .click();
        expect(confirm).toHaveBeenCalledOnce();
        expect(hass.callService).toHaveBeenCalledTimes(accept ? 1 : 0);
        if (accept)
          expect(hass.callService).toHaveBeenCalledWith("switch", "toggle", {
            entity_id: spec.entity,
          });
      }
    );
    it(`starts without confirmation and disables unknown workloads in ${spec.type}`, async () => {
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      const hass = snapshotHass();
      hass.states[spec.entity]!.state = "off";
      const card = new spec.Card();
      card.setConfig({ type: spec.type, view_mode: "list" });
      card.hass = hass;
      document.body.append(card);
      await card.updateComplete;
      card
        .shadowRoot!.querySelector<HTMLButtonElement>(
          `button[aria-label="Start ${spec.label}"]`
        )!
        .click();
      expect(confirm).not.toHaveBeenCalled();
      expect(hass.callService).toHaveBeenCalledWith("switch", "toggle", {
        entity_id: spec.entity,
      });
      vi.mocked(hass.callService).mockClear();
      hass.states[spec.entity]!.state = "unknown";
      card.hass = { ...hass };
      await card.updateComplete;
      const control = card.shadowRoot!.querySelector<HTMLButtonElement>(
        `button[aria-label="Start ${spec.label}"]`
      )!;
      expect(control.disabled).toBe(true);
      control.click();
      expect(hass.callService).not.toHaveBeenCalled();
    });
  }

  it("uses existing button.press services for Restart, Reboot and Check Updates", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const hass = snapshotHass();
    for (const [Card, type, selectors] of [
      [
        UnraidDockerCard,
        "custom:unraid-docker-card",
        ['button[aria-label="Restart plex"]', 'button[title="Check for updates"]'],
      ],
      [
        UnraidVmCard,
        "custom:unraid-vm-card",
        ['button[aria-label="Reboot Home Assistant"]'],
      ],
    ] as const) {
      const card = new Card();
      card.setConfig({ type, view_mode: "list" });
      card.hass = hass;
      document.body.append(card);
      await card.updateComplete;
      for (const selector of selectors)
        card.shadowRoot!.querySelector<HTMLButtonElement>(selector)!.click();
    }
    expect(hass.callService).toHaveBeenCalledTimes(3);
    expect(hass.callService).toHaveBeenCalledWith("button", "press", {
      entity_id: "button.cube_docker_container_restart_plex",
    });
    expect(hass.callService).toHaveBeenCalledWith("button", "press", {
      entity_id: "button.cube_vm_reboot_ha",
    });
    expect(hass.callService).toHaveBeenCalledWith("button", "press", {
      entity_id: "button.cube_check_container_updates",
    });
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(["unknown", "unavailable", "NaN", "Infinity", "", " "])(
    "does not present invalid %s gauges as zero",
    async (state) => {
      const hass = createMockHass();
      hass.states["sensor.cube_cpu_usage"]!.state = state;
      const card = new UnraidServerCard();
      card.setConfig({ type: "custom:unraid-server-card" });
      card.hass = hass;
      document.body.append(card);
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector(".ring-content")!.textContent).toBe("—");
    }
  );
  it.each([
    ["0", "0%"],
    ["101", "100%"],
    ["-1", "0%"],
  ])("bounds finite gauge %s as %s", async (state, expected) => {
    const hass = createMockHass();
    hass.states["sensor.cube_cpu_usage"]!.state = state!;
    const card = new UnraidServerCard();
    card.setConfig({ type: "custom:unraid-server-card" });
    card.hass = hass;
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector(".ring-content")!.textContent).toBe(expected);
  });

  it("uses HA localized entity formatting when available", async () => {
    const hass = createMockHass();
    hass.formatEntityName = () => "Localized workload";
    hass.formatEntityState = () => "État localisé";
    hass.states["switch.cube_docker_container_plex"]!.state = "unknown";
    delete hass.states["switch.cube_docker_container_plex"]!.attributes.friendly_name;
    delete hass.states["switch.cube_docker_container_plex"]!.attributes.container_name;
    const card = new UnraidDockerCard();
    card.setConfig({ type: "custom:unraid-docker-card" });
    card.hass = hass;
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain("Localized workload");
    expect(card.shadowRoot!.textContent).toContain("État localisé");
  });

  it("exposes unified editor fields and preserves hidden config keys", async () => {
    const editor = new (customElements.get(
      "unraid-dashboard-card-editor"
    )!)() as UnraidDockerCardEditor;
    editor.setConfig({
      type: "custom:unraid-dashboard-card",
      view_mode: "list",
      default_filter: "updates",
      vm_labels: { Backup: "Spare" },
    });
    document.body.append(editor);
    await editor.updateComplete;
    expect(
      editor.shadowRoot!.querySelector<HTMLSelectElement>("#view_mode")!.value
    ).toBe("list");
    expect(
      editor.shadowRoot!.querySelector<HTMLSelectElement>("#default_filter")!.value
    ).toBe("updates");
    editor.setConfig({ ...editor._config!, type: "custom:unraid-server-card" });
    await editor.updateComplete;
    expect(editor.shadowRoot!.querySelector("#view_mode")).toBeNull();
    expect(editor._config!.vm_labels).toEqual({ Backup: "Spare" });
    expect(editor._config!.view_mode).toBe("list");
  });
});

// Remove presentation-only nodes on a clone; snapshot formatting is not HTML sanitization.
function snapshotMarkup(element: Element, hideIcons = false): string {
  const clone = element.cloneNode(true) as Element;
  const comments = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const nodes: Node[] = [];
  while (comments.nextNode()) nodes.push(comments.currentNode);
  for (const node of nodes) node.parentNode!.removeChild(node);
  if (hideIcons)
    for (const icon of clone.querySelectorAll("svg"))
      icon.replaceWith(document.createTextNode("[icon]"));
  return clone.outerHTML.replace(/\s+/g, " ").trim();
}

describe("accessible filter and tab markup", () => {
  afterEach(() => document.body.replaceChildren());
  it("keeps VM filter labels and pressed states together", async () => {
    const card = new UnraidVmCard();
    card.setConfig({ type: "custom:unraid-vm-card" });
    card.hass = mixedVmHass();
    document.body.append(card);
    await card.updateComplete;
    const group = card.shadowRoot!.querySelector('[role="group"]')!;
    expect(snapshotMarkup(group)).toMatchSnapshot();
  });
  it("links every dashboard tab to its panel with one selected tab", async () => {
    const card = new UnraidDashboardCard();
    card.setConfig({ type: "custom:unraid-dashboard-card" });
    card.hass = createMockHass();
    document.body.append(card);
    await card.updateComplete;
    const tabs = card.shadowRoot!.querySelector('[role="tablist"]')!;
    expect(snapshotMarkup(tabs, true)).toMatchSnapshot();
    expect(tabs.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
    for (const tab of tabs.querySelectorAll('[role="tab"]')) {
      const panel = card.shadowRoot!.getElementById(
        tab.getAttribute("aria-controls")!
      )!;
      expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    }
  });
});

describe("missing array storage readings", () => {
  afterEach(() => document.body.replaceChildren());
  it.each(["unknown", "unavailable", ""])(
    "keeps %s out of the array ring and subtext",
    async (state) => {
      const card = new UnraidServerCard();
      const hass = createMockHass();
      hass.states["sensor.cube_array_usage"]!.state = state;
      hass.states["sensor.cube_array_usage"]!.attributes = {};
      card.setConfig({ type: "custom:unraid-server-card" });
      card.hass = hass;
      document.body.append(card);
      await card.updateComplete;
      const ring = [...card.shadowRoot!.querySelectorAll(".ring-card")].find((el) =>
        el.textContent!.includes("Array Storage")
      )!;
      expect(ring.querySelector(".ring-content")!.textContent!.trim()).toBe("—");
      expect(ring.querySelector(".ring-subtext")!.textContent!.trim()).toBe("No data");
    }
  );
});

describe("system health status", () => {
  afterEach(() => document.body.replaceChildren());
  it.each([
    ["0", "Normal • Healthy"],
    ["3", "3 Active Alerts"],
    ["unknown", "Unknown"],
    ["unavailable", "Unavailable"],
    ["", "No data"],
    ["-1", "No data"],
    ["NaN", "No data"],
    ["Infinity", "No data"],
  ])("renders %s without inventing healthy telemetry", async (state, expected) => {
    const card = new UnraidServerCard();
    const hass = createMockHass();
    hass.states["sensor.cube_notifications_unread_alert"] = {
      entity_id: "sensor.cube_notifications_unread_alert",
      state: state!,
      attributes: {},
      last_changed: "",
      last_updated: "",
    };
    card.setConfig({ type: "custom:unraid-server-card" });
    card.hass = hass;
    document.body.append(card);
    await card.updateComplete;
    const row = [...card.shadowRoot!.querySelectorAll(".detail-item")].find((el) =>
      el.textContent!.includes("System Health")
    )!;
    expect(row.querySelector(".detail-val")!.textContent!.trim()).toBe(expected);
    expect(row.querySelector(".detail-val")!.getAttribute("style")).toBeNull();
  });
});
