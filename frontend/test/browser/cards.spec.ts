import { expect, test } from "@playwright/test";
import type { UnraidDockerCard } from "../../src/docker-card";
import type { UnraidVmCard } from "../../src/vm-card";
import type { HomeAssistant } from "../../src/ha-types";

test.describe("Unraid Lovelace Dashboard Cards Browser Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/browser/fixture.html");
    await page.waitForFunction(
      () => (window as unknown as { fixtureReady?: boolean }).fixtureReady === true
    );
  });

  test("defines all custom card elements without template corruption", async ({ page }) => {
    const defined = await page.evaluate(() => {
      const tags = [
        "unraid-server-card",
        "unraid-storage-card",
        "unraid-shares-card",
        "unraid-docker-card",
        "unraid-ups-card",
        "unraid-vm-card",
        "unraid-network-card",
        "unraid-dashboard-card",
      ];
      return tags.every((t) => Boolean(customElements.get(t)));
    });
    expect(defined).toBe(true);

    // Verify NO raw Lit placeholder markers or leaked attribute syntax exist in DOM
    const rawLitMarkers = await page.evaluate(() => {
      const allText = document.body.innerText;
      return allText.includes("lit$") || allText.includes("@click=") || allText.includes(".style=");
    });
    expect(rawLitMarkers).toBe(false);
  });

  test("renders Server Card with system metrics", async ({ page }) => {
    const serverCard = page.locator("#server-card");
    await expect(serverCard).toBeVisible();

    await expect(serverCard.getByText("Cube")).toBeVisible();
    await expect(serverCard.getByText("CPU Load")).toBeVisible();
    await expect(serverCard.getByText("15%")).toBeVisible();
    await expect(serverCard.getByText("Memory")).toBeVisible();
    await expect(serverCard.getByText("System Uptime")).toBeVisible();
    await expect(serverCard.getByText("Primary Network")).toBeVisible();
    await expect(serverCard.getByText("Boot Device")).toBeVisible();
    await expect(serverCard.getByText(/Flash/)).toBeVisible();
  });

  test("renders Storage Card with clean disk names and Healthy status badges", async ({ page }) => {
    const storageCard = page.locator("#storage-card");
    await expect(storageCard).toBeVisible();

    await expect(storageCard.getByText("Storage Array & Disks")).toBeVisible();
    await expect(storageCard.getByText("Parity", { exact: true }).first()).toBeVisible();
    await expect(storageCard.getByText("Disk 1", { exact: true }).first()).toBeVisible();
    await expect(storageCard.getByText("Cache", { exact: true }).first()).toBeVisible();
    await expect(storageCard.getByText("Flash (Boot)", { exact: true }).first()).toBeVisible();
    await expect(storageCard.getByText("Healthy").first()).toBeVisible();
    await expect(storageCard.getByText("--").first()).toBeVisible();
    await expect(storageCard.getByText("29°C")).toBeVisible();
  });

  test("renders Shares Card with user shares and protection states", async ({ page }) => {
    const sharesCard = page.locator("#shares-card");
    await expect(sharesCard).toBeVisible();

    await expect(sharesCard.getByText("User Shares")).toBeVisible();
    await expect(sharesCard.getByText("appdata")).toBeVisible();
    await expect(sharesCard.getByText("media")).toBeVisible();
    await expect(sharesCard.getByText("Protected").first()).toBeVisible();
    await expect(sharesCard.getByText("Unprotected").first()).toBeVisible();
    await expect(sharesCard.getByText("46.6 GB / 480.6 GB")).toBeVisible();
    await expect(sharesCard.getByText("1.4 TB / 39.1 TB")).toBeVisible();
  });

  test("renders Network Card with interfaces and link metrics", async ({ page }) => {
    const networkCard = page.locator("#network-card");
    await expect(networkCard).toBeVisible();

    await expect(networkCard.getByText("Cube Network")).toBeVisible();
    await expect(networkCard.getByText("ETH0")).toBeVisible();
    await expect(networkCard.getByText("192.168.20.21", { exact: true }).first()).toBeVisible();
    await expect(networkCard.getByText("1 Gbps")).toBeVisible();
    await expect(networkCard.getByText("12.40 MB/s")).toBeVisible();
    await expect(networkCard.getByText("5.80 MB/s")).toBeVisible();
  });

  test("renders Dashboard Card and allows tab navigation", async ({ page }) => {
    const dashboardCard = page.locator("unraid-dashboard-card");
    await expect(dashboardCard).toBeVisible();

    // Default overview tab
    await expect(dashboardCard.locator("unraid-server-card")).toBeVisible();

    // Click Shares tab
    await dashboardCard.locator(".tab-btn:has-text('Shares')").click();
    await expect(dashboardCard.locator("unraid-shares-card")).toBeVisible();

    // Click Network tab
    await dashboardCard.locator(".tab-btn:has-text('Network')").click();
    await expect(dashboardCard.locator("unraid-network-card")).toBeVisible();

    // Click Storage tab
    await dashboardCard.locator(".tab-btn:has-text('Storage & Disks')").click();
    await expect(dashboardCard.locator("unraid-storage-card")).toBeVisible();
  });

  test("shows custom Docker labels in grid and list views", async ({ page }) => {
    await page.evaluate(async () => {
      const hass = (window as unknown as { mockHass: HomeAssistant }).mockHass;
      hass.states["switch.cube_docker_container_plex"]!.attributes = {
        friendly_name: "Unraid Container plex",
        container_name: "plex",
      };
      const card = document.querySelector<UnraidDockerCard>("#docker-card")!;
      card.setConfig({ type: "custom:unraid-docker-card", view_mode: "grid", container_labels: { plex: "Media" } });
      card.hass = { ...hass };
      await card.updateComplete;
    });
    const card = page.locator("#docker-card");
    await expect(card.locator(".tile-name[title=plex]")).toHaveText("Media");
    await expect(card.locator(".tile-name[title=plex]")).toHaveAttribute("title", "plex");
    await page.evaluate(async () => {
      const card = document.querySelector<UnraidDockerCard>("#docker-card")!;
      card.setConfig({ ...card.config, view_mode: "list" });
      await card.updateComplete;
    });
    await expect(card.locator(".row-left span[title=plex]")).toHaveText("Media");
    await expect(card.locator(".row-left span[title=plex]")).toHaveAttribute("title", "plex");
  });

  test("persists the VM running default and allows stopped VM filtering", async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const hass = (window as unknown as { mockHass: HomeAssistant }).mockHass;
      hass.states["switch.cube_virtual_machine_ha"]!.attributes = {
        friendly_name: "Unraid VM Home Assistant",
        vm_name: "Home Assistant",
      };
      hass.states["switch.cube_virtual_machine_backup"] = {
        entity_id: "switch.cube_virtual_machine_backup", state: "off", attributes: { vm_name: "Backup" }, last_changed: "", last_updated: "",
      };
      const card = document.querySelector<UnraidVmCard>("#vm-card")!;
      card.style.width = "320px";
      card.setConfig({ type: "custom:unraid-vm-card", default_filter: "running", vm_labels: { "Home Assistant": "Smart Home" } });
      card.hass = { ...hass };
      await card.updateComplete;
    });
    const card = page.locator("#vm-card");
    await expect(card.locator(".vm-name")).toHaveText("Smart Home");
    await expect(card.locator(".vm-name")).toHaveAttribute("title", "Home Assistant");
    await card.getByRole("button", { name: "Stopped (1)" }).click();
    await expect(card.locator(".vm-name")).toHaveText("Backup");
    await card.getByRole("button", { name: "All (2)" }).click();
    await expect(card.locator(".vm-name")).toHaveText(["Smart Home", "Backup"]);
    await card.screenshot({ path: testInfo.outputPath("vm-card.png") });
  });

  test("truncates long VM names without losing the full tooltip", async ({ page }) => {
    const fullName = "A virtual machine with a very long descriptive workload name for the dashboard";
    await page.evaluate(async (name) => {
      const hass = (window as unknown as { mockHass: HomeAssistant }).mockHass;
      hass.states["switch.cube_virtual_machine_ha"]!.attributes.vm_name = name;
      const card = document.querySelector<UnraidVmCard>("#vm-card")!;
      card.style.width = "320px";
      card.hass = { ...hass };
      await card.updateComplete;
    }, fullName);
    const name = page.locator("#vm-card .vm-name");
    await expect(name).toHaveAttribute("title", fullName);
    expect(await name.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await name.evaluate((element) => getComputedStyle(element).textOverflow)).toBe("ellipsis");
  });
});

test("maps collision-suffixed disk metrics and native RAM without foreign network rows", async ({
  page,
}) => {
  await page.goto("/test/browser/fixture.html");
  await page.waitForFunction(
    () => (window as unknown as { fixtureReady?: boolean }).fixtureReady
  );
  const snapshot = await (
    await page.request.get("/test/fixtures/storage-suffixed.json")
  ).json();
  await page.evaluate(async (snapshot) => {
    const hass = {
      ...(window as unknown as { mockHass: HomeAssistant }).mockHass,
      states: snapshot.states,
      entities: snapshot.entities,
    };
    hass.formatEntityState = (entity) =>
      `${entity.state}${entity.attributes.unit_of_measurement ? ` ${entity.attributes.unit_of_measurement}` : ""}`;
    for (const selector of ["#server-card", "#storage-card"]) {
      const card = document.querySelector(selector) as HTMLElement & {
        hass: HomeAssistant;
        updateComplete: Promise<boolean>;
      };
      card.hass = hass;
      await card.updateComplete;
    }
  }, snapshot);
  await expect(
    page.locator("#server-card").getByText("8 GiB used", { exact: true })
  ).toBeVisible();
  await expect(
    page.locator("#server-card").getByText("10 TB / 40 TB", { exact: true })
  ).toBeVisible();
  const storage = page.locator("#storage-card");
  await expect(storage.locator(".item-list .list-row")).toHaveCount(6);
  await expect(storage.getByText("10 TB used of 40 TB (30 TB Free)")).toBeVisible();
  await expect(storage.getByText("Cache (POOL_2)", { exact: true })).toBeVisible();
  await expect(storage.getByText("0°C", { exact: true }).first()).toBeVisible();
  await page.evaluate(async () => {
    const hass = (window as unknown as { mockHass: HomeAssistant }).mockHass;
    for (const name of ["aaa_foreign", "other"]) {
      const entity_id = `sensor.cube_network_${name}_rx`;
      hass.states[entity_id] = {
        entity_id,
        state: "99999",
        attributes: { unit_of_measurement: "B/s" },
        last_changed: "",
        last_updated: "",
      };
      hass.entities![entity_id] = {
        entity_id,
        platform: name === "aaa_foreign" ? "unraid_management_agent" : "unraid",
        device_id: name === "other" ? "other" : "dev_1",
      };
    }
    for (const direction of ["rx", "tx"]) {
      const entity = hass.states[`sensor.cube_network_eth0_${direction}_throughput`]!;
      entity.state = "25000";
      entity.attributes.unit_of_measurement = "B/s";
    }
    for (const selector of ["#server-card", "#network-card"]) {
      const card = document.querySelector(selector) as HTMLElement & {
        hass: HomeAssistant;
        updateComplete: Promise<boolean>;
      };
      card.hass = { ...hass };
      await card.updateComplete;
    }
  });
  await expect(page.locator("#network-card .network-row")).toHaveCount(1);
  await expect(
    page.locator("#network-card").getByText("25.00 kB/s", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page
      .locator("#server-card")
      .getByText("↓ 25.00 kB/s • ↑ 25.00 kB/s", { exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __serviceCalls: unknown[] }).__serviceCalls
    )
  ).toEqual([]);
});
