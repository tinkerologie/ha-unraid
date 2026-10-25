import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/test/browser/fixture.html");
  await page.waitForFunction(
    () => (window as unknown as { fixtureReady: boolean }).fixtureReady
  );
});

test("dashboard tabs support selected states and arrow, Home and End keys", async ({
  page,
}) => {
  const card = page.locator("#dashboard-card");
  const overview = card.getByRole("tab", { name: "Overview", exact: true });
  await overview.focus();
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  const storage = card.getByRole("tab", { name: "Storage & Disks", exact: true });
  await expect(storage).toBeFocused();
  await expect(storage).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("Enter");
  await expect(storage).toHaveAttribute("aria-selected", "true");
  await expect(card.getByRole("tabpanel")).toBeVisible();
  await page.keyboard.press("End");
  await expect(card.getByRole("tab", { name: "VMs", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(overview).toBeFocused();
  expect(await overview.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe(
    "none"
  );
});

test("workload names and gauges are native keyboard-operable details buttons", async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as unknown as { details: string[] }).details = [];
    document.addEventListener("hass-more-info", (e) =>
      (window as unknown as { details: string[] }).details.push(
        (e as CustomEvent).detail.entityId
      )
    );
  });
  const details = page
    .locator("#docker-card")
    .getByRole("button", { name: /Show details for.*plex/i });
  await expect(details).toHaveJSProperty("tagName", "BUTTON");
  await details.focus();
  await page.keyboard.press("Enter");
  const cpu = page.locator("#server-card").getByRole("button", { name: /CPU Load/i });
  await expect(cpu).toHaveJSProperty("tagName", "BUTTON");
  await cpu.focus();
  await page.keyboard.press("Space");
  expect(
    await page.evaluate(() => (window as unknown as { details: string[] }).details)
  ).toEqual(["switch.cube_docker_container_plex", "sensor.cube_cpu_usage"]);
});

test("buttons and icon controls have HA-sized touch targets", async ({ page }) => {
  const sizes = await page.locator("#container").evaluate((container) =>
    [...container.children].flatMap((card) =>
      [...card.shadowRoot!.querySelectorAll<HTMLElement>("button, a[href]")]
        .filter((el) => el.getClientRects().length)
        .map((el) => ({
          card: card.localName,
          icon: el.classList.contains("btn-icon"),
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        }))
    )
  );
  expect(sizes.length).toBeGreaterThan(20);
  for (const control of sizes) {
    expect(control.height, control.card).toBeGreaterThanOrEqual(control.icon ? 48 : 40);
    if (control.icon) expect(control.width).toBeGreaterThanOrEqual(48);
  }
});

test("narrow RTL cards fit content and have automatic Sections heights", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
    document.body.style.padding = "8px";
    for (const card of document.getElementById("container")!.children)
      (card as HTMLElement).style.width = "280px";
  });
  const widths = await page.locator("#container").evaluate((container) =>
    [...container.children].map((card) => {
      const inner = card.shadowRoot!.querySelector("ha-card")!;
      const options = (
        card as HTMLElement & { getGridOptions: () => { rows?: string | number } }
      ).getGridOptions();
      return {
        name: card.localName,
        width: inner.clientWidth,
        scroll: inner.scrollWidth,
        rows: options.rows,
      };
    })
  );
  for (const card of widths) {
    expect(card.scroll, card.name).toBeLessThanOrEqual(card.width + 1);
    expect(card.rows === undefined || card.rows === "auto", card.name).toBe(true);
  }
  const overview = page
    .locator("#dashboard-card")
    .getByRole("tab", { name: "Overview", exact: true });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.locator("#dashboard-card").getByRole("tab", { name: "VMs", exact: true })
  ).toBeFocused();
});

test("reduced motion removes card transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const durations = await page
    .locator("#container")
    .evaluate((container) =>
      [...container.children].flatMap((card) =>
        [
          ...card.shadowRoot!.querySelectorAll(".progress-fill, .btn, .container-tile"),
        ].map((el) => getComputedStyle(el).transitionDuration)
      )
    );
  expect(durations.length).toBeGreaterThan(0);
  expect(
    durations.every((d) => d.split(",").every((part) => parseFloat(part) <= 0.001))
  ).toBe(true);
});

test("editors only expose system-details settings where they apply", async ({
  page,
}) => {
  const settings = await page.evaluate(async () => {
    const rows: boolean[] = [];
    for (const type of ["docker", "vm", "server", "dashboard"]) {
      const editor = document.createElement(
        `unraid-${type}-card-editor`
      ) as HTMLElement & {
        setConfig: (config: unknown) => void;
        updateComplete: Promise<unknown>;
      };
      editor.setConfig({ type: `custom:unraid-${type}-card` });
      document.body.append(editor);
      await editor.updateComplete;
      rows.push(Boolean(editor.shadowRoot!.querySelector('input[type="checkbox"]')));
      editor.remove();
    }
    return rows;
  });
  expect(settings).toEqual([false, false, true, true]);
});

for (const [theme, variables] of Object.entries({
  light: {
    "--primary-text-color": "#212121",
    "--secondary-text-color": "#5e5e5e",
    "--card-background-color": "#ffffff",
    "--primary-color": "#03a9f4",
  },
  dark: {
    "--primary-text-color": "#e0e0e0",
    "--secondary-text-color": "#b0b0b0",
    "--card-background-color": "#1c1c24",
    "--primary-color": "#03a9f4",
  },
  custom: {
    "--primary-text-color": "#251532",
    "--secondary-text-color": "#625066",
    "--card-background-color": "#fff8f4",
    "--primary-color": "#7340c8",
  },
})) {
  test(`${theme} theme preserves text, controls and focus contrast`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate((vars) => {
      for (const [key, value] of Object.entries(vars))
        document.documentElement.style.setProperty(key, value);
      for (const [key, value] of Object.entries({
        "--success-color": "#4caf50",
        "--warning-color": "#ff9800",
        "--error-color": "#db4437",
      }))
        document.documentElement.style.setProperty(key, value);
    }, variables);
    await page.evaluate(async () => {
      const fixture = window as unknown as {
        mockHass: { states: Record<string, unknown> };
      };
      fixture.mockHass.states["sensor.cube_notifications_unread_alert"] = {
        entity_id: "sensor.cube_notifications_unread_alert",
        state: "3",
        attributes: {},
      };
      for (const tag of ["#server-card", "#dashboard-card"]) {
        const card = document.querySelector(tag) as HTMLElement & {
          hass: unknown;
          updateComplete: Promise<unknown>;
        };
        card.hass = { ...fixture.mockHass };
        await card.updateComplete;
      }
    });
    const contrast = await page.locator("#container").evaluate((container) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const rgba = (color: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const blend = (front: number[], back: number[]) =>
        front
          .slice(0, 3)
          .map(
            (value, i) => (value * front[3]!) / 255 + back[i]! * (1 - front[3]! / 255)
          )
          .concat(255);
      const background = (element: Element) => {
        const chain: Element[] = [];
        let next: Element | null = element;
        while (next) {
          chain.unshift(next);
          next = next.parentElement ?? (next.getRootNode() as ShadowRoot).host ?? null;
        }
        return chain.reduce(
          (color, el) => blend(rgba(getComputedStyle(el).backgroundColor), color),
          [255, 255, 255, 255]
        );
      };
      const luminance = (color: number[]) =>
        color
          .slice(0, 3)
          .map((value) => value / 255)
          .map((value) =>
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          )
          .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i]!, 0);
      const ratio = (front: number[], back: number[]) => {
        const a = luminance(front);
        const b = luminance(back);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const rows = [...container.children].flatMap((card) =>
        [...card.shadowRoot!.querySelectorAll<HTMLElement>("*")].filter(
          (el) =>
            el.getClientRects().length &&
            !el.closest("button:disabled") &&
            [...el.childNodes].some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim()
            )
        )
      );
      const textRows = rows.map((el) => ({
        text: el.textContent!.trim().slice(0, 65),
        color: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
        resolved: background(el),
        card:
          el.getRootNode() instanceof ShadowRoot
            ? (el.getRootNode() as ShadowRoot).host.localName
            : "",
        ratio: ratio(
          blend(rgba(getComputedStyle(el).color), background(el)),
          background(el)
        ),
      }));
      const borderRows = [...container.children].flatMap((card) =>
        [
          ...card.shadowRoot!.querySelectorAll<HTMLElement>(
            ".btn, button.ring-card, button.list-row, .tab-btn.active"
          ),
        ]
          .filter((el) => el.getClientRects().length && !el.matches(":disabled"))
          .map((el) => ({
            text: `Control border: ${el.textContent!.trim().slice(0, 30)}`,
            ratio: ratio(rgba(getComputedStyle(el).borderColor), background(el)),
          }))
      );
      return { textRows, borderRows };
    });
    expect(contrast.textRows.length).toBeGreaterThan(40);
    expect(contrast.textRows.filter((row) => row.ratio < 4.5)).toEqual([]);
    expect(contrast.borderRows.filter((row) => row.ratio < 3)).toEqual([]);
    const control = page
      .locator("#docker-card")
      .getByRole("button", { name: "All (1)" });
    await control.focus();
    const colors = await control.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        focus: style.outlineColor,
        border: style.borderColor,
        fill: style.backgroundColor,
        primary: getComputedStyle(el).getPropertyValue("--primary-color").trim(),
      };
    });
    expect(colors.focus).not.toBe("rgba(0, 0, 0, 0)");
    expect(colors.primary).toBe(variables["--primary-color"]);
  });
}

test("shared state snapshot renders all workloads without clipping or live actions", async ({
  page,
}, testInfo) => {
  await page.evaluate(async () => {
    const fixture = window as unknown as {
      mockHass: Record<string, unknown> & {
        states: Record<string, unknown>;
        entities: unknown;
      };
      workloadSnapshot: { states: Record<string, unknown>; entities: unknown };
    };
    const card = document.querySelector("#docker-card") as HTMLElement & {
      hass: unknown;
      setConfig: (config: unknown) => void;
      updateComplete: Promise<unknown>;
    };
    card.style.width = "300px";
    card.setConfig({ type: "custom:unraid-docker-card", view_mode: "list" });
    card.hass = {
      ...fixture.mockHass,
      states: { ...fixture.mockHass.states, ...fixture.workloadSnapshot.states },
      entities: fixture.workloadSnapshot.entities,
    };
    await card.updateComplete;
  });
  const card = page.locator("#docker-card");
  await expect(card.locator(".list-row")).toHaveCount(20);
  await card.locator(".list-row").last().scrollIntoViewIfNeeded();
  await expect(card.locator(".list-row").last()).toBeInViewport();
  expect(
    await card.locator("ha-card").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
  ).toBe(true);
  await card.getByRole("button", { name: "Running (12)" }).click();
  await expect(card.locator(".list-row")).toHaveCount(12);
  await expect(card.getByRole("button", { name: "Running (12)" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { __serviceCalls: unknown[] }).__serviceCalls
    )
  ).toEqual([]);
  await card.screenshot({ path: testInfo.outputPath("dashboard-300px.png") });
});

test("keyboard Stop cancellation sends no mocked HA service calls", async ({
  page,
}) => {
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  const card = page.locator("#docker-card");
  await card.getByRole("button", { name: "Stop plex", exact: true }).focus();
  await page.keyboard.press("Space");
  expect(dialogs).toBe(1);
  expect(
    await page.evaluate(
      () => (window as unknown as { __serviceCalls: unknown[] }).__serviceCalls
    )
  ).toEqual([]);
});

test("long server detail values stay inside narrow grid cells", async ({ page }) => {
  await page.evaluate(async () => {
    const fixture = window as unknown as {
      mockHass: { states: Record<string, { attributes: Record<string, unknown> }> };
    };
    fixture.mockHass.states["sensor.cube_disk_flash_usage"]!.attributes.fs_used =
      "9".repeat(80) + " GB";
    const card = document.querySelector("#server-card") as HTMLElement & {
      hass: unknown;
      updateComplete: Promise<unknown>;
    };
    card.style.width = "300px";
    card.hass = { ...fixture.mockHass };
    await card.updateComplete;
  });
  const sizes = await page
    .locator("#server-card .detail-item .detail-val")
    .evaluateAll((elements) =>
      elements.map((el) => ({
        text: el.textContent!.trim().slice(0, 20),
        width: el.getBoundingClientRect().width,
        parent: el.parentElement!.clientWidth,
      }))
    );
  expect(sizes.some((row) => row.text.includes("999999"))).toBe(true);
  expect(sizes.filter((row) => row.width > row.parent)).toEqual([]);
});

test("dashboard mounts Docker and UPS panels with forwarded defaults", async ({
  page,
}) => {
  const dashboard = page.locator("#dashboard-card");
  for (const [label, child] of [
    ["Docker", "unraid-docker-card"],
    ["UPS Power", "unraid-ups-card"],
  ]) {
    const tab = dashboard.getByRole("tab", { name: label!, exact: true });
    await tab.focus();
    await page.keyboard.press("Enter");
    await expect(dashboard.locator(child!)).toBeVisible();
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }
});

test("five-share search announces results and opens details by keyboard", async ({
  page,
}) => {
  await page.evaluate(async () => {
    const fixture = window as unknown as {
      mockHass: { states: Record<string, unknown> };
      details: string[];
    };
    fixture.details = [];
    document.addEventListener("hass-more-info", (event) =>
      fixture.details.push((event as CustomEvent).detail.entityId)
    );
    for (let i = 1; i <= 3; i++) {
      const id = `sensor.cube_share_archive${i}_usage`;
      fixture.mockHass.states[id] = {
        entity_id: id,
        state: "10",
        attributes: {
          friendly_name: `Cube Share Archive${i} usage`,
          color: "green-on",
        },
      };
    }
    const card = document.querySelector("#shares-card") as HTMLElement & {
      hass: unknown;
      updateComplete: Promise<unknown>;
    };
    card.hass = { ...fixture.mockHass };
    await card.updateComplete;
  });
  const card = page.locator("#shares-card");
  await expect(card.locator("button.list-row")).toHaveCount(5);
  await card.getByRole("searchbox", { name: "Filter shares" }).fill("Archive");
  await expect(card.locator("button.list-row")).toHaveCount(3);
  await expect(card.getByRole("status")).toHaveText("3 of 5 shares shown");
  await card.locator("button.list-row").first().focus();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(() => (window as unknown as { details: string[] }).details)
  ).toEqual(["sensor.cube_share_archive1_usage"]);
});

test("network details support keyboard and disable rows without a details entity", async ({
  page,
}) => {
  await page.evaluate(() => {
    const fixture = window as unknown as { details: string[] };
    fixture.details = [];
    document.addEventListener("hass-more-info", (event) =>
      fixture.details.push((event as CustomEvent).detail.entityId)
    );
  });
  const row = page.locator("#network-card .network-row");
  await row.focus();
  await page.keyboard.press("Space");
  expect(
    await page.evaluate(() => (window as unknown as { details: string[] }).details)
  ).toEqual(["sensor.cube_network_eth0_ip_address"]);
  await page.evaluate(async () => {
    const fixture = window as unknown as {
      mockHass: { states: Record<string, unknown> };
    };
    for (const id of [
      "sensor.cube_network_eth0_ip_address",
      "sensor.cube_network_eth0_rx_throughput",
      "binary_sensor.cube_network_eth0_link",
    ])
      delete fixture.mockHass.states[id];
    const card = document.querySelector("#network-card") as HTMLElement & {
      hass: unknown;
      updateComplete: Promise<unknown>;
    };
    card.hass = { ...fixture.mockHass };
    await card.updateComplete;
  });
  await expect(row).toBeDisabled();
});

for (const type of ["server", "ups"]) {
  test(`${type} details activate by keyboard and disable when entities are missing`, async ({
    page,
  }) => {
    await page.evaluate(async (cardType) => {
      const fixture = window as unknown as {
        mockHass: { states: Record<string, unknown> };
        details: string[];
      };
      fixture.details = [];
      document.addEventListener("hass-more-info", (event) =>
        fixture.details.push((event as CustomEvent).detail.entityId)
      );
      for (const [suffix, state] of Object.entries({
        notifications_unread_alert: "0",
        ups_status: "online",
        ups_runtime: "30",
        ups_power: "50",
        ups_output_voltage: "230",
        ups_battery_health: "good",
      })) {
        const id = `sensor.cube_${suffix}`;
        fixture.mockHass.states[id] = { entity_id: id, state, attributes: {} };
      }
      const card = document.querySelector(`#${cardType}-card`) as HTMLElement & {
        hass: unknown;
        updateComplete: Promise<unknown>;
      };
      card.hass = { ...fixture.mockHass };
      await card.updateComplete;
    }, type);
    const card = page.locator(`#${type}-card`);
    const buttons = card.locator("button:enabled");
    const count = type === "server" ? 8 : 6;
    await expect(buttons).toHaveCount(count);
    for (const button of await buttons.all()) {
      await button.focus();
      await page.keyboard.press("Enter");
    }
    const details = await page.evaluate(
      () => (window as unknown as { details: string[] }).details
    );
    expect(details).toHaveLength(count);
    expect(details.every(Boolean)).toBe(true);
    await page.evaluate(async (cardType) => {
      const fixture = window as unknown as { mockHass: Record<string, unknown> };
      const card = document.querySelector(`#${cardType}-card`) as HTMLElement & {
        hass: unknown;
        updateComplete: Promise<unknown>;
      };
      card.hass = { ...fixture.mockHass, states: {} };
      await card.updateComplete;
    }, type);
    await expect(card.locator("button:disabled")).toHaveCount(count);
  });
}

test("parity and disk-spin controls keep existing mocked service payloads", async ({
  page,
}) => {
  await page.evaluate(async () => {
    const fixture = window as unknown as {
      mockHass: { states: Record<string, unknown> };
    };
    for (const [id, state] of [
      ["switch.cube_parity_check", "off"],
      ["switch.cube_disk_cache_spin", "on"],
    ])
      fixture.mockHass.states[id!] = { entity_id: id, state, attributes: {} };
    const card = document.querySelector("#storage-card") as HTMLElement & {
      hass: unknown;
      updateComplete: Promise<unknown>;
    };
    card.hass = { ...fixture.mockHass };
    await card.updateComplete;
  });
  const card = page.locator("#storage-card");
  for (const name of ["Check parity now", "Spin down Cache"]) {
    const button = card.getByRole("button", { name, exact: true });
    await button.focus();
    await page.keyboard.press("Space");
  }
  expect(
    await page.evaluate(
      () => (window as unknown as { __serviceCalls: unknown[] }).__serviceCalls
    )
  ).toEqual([
    ["switch", "toggle", { entity_id: "switch.cube_parity_check" }],
    ["switch", "toggle", { entity_id: "switch.cube_disk_cache_spin" }],
  ]);
});
