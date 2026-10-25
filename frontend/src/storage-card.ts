import { html, nothing, type TemplateResult } from "lit";
import { STORAGE_CARD_TAG, STORAGE_EDITOR_TAG } from "./config";
import type { HassEntity } from "./ha-types";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidStorageCardEditor } from "./dashboard-cards-editor";
import {
  iconTemplate,
  mdiAlertCircle,
  mdiCheckCircle,
  mdiHarddisk,
  mdiPause,
  mdiPlay,
  mdiShieldAlert,
  mdiShieldCheck,
  mdiUsbFlashDrive,
} from "./icons";
import { registerDashboardCard } from "./register-dashboard-card";

export type DiskHealthLevel = "healthy" | "warning" | "error";

export interface DiskItem {
  id: string;
  name: string;
  isParity: boolean;
  isCache: boolean;
  isBoot: boolean;
  usagePct: number | null;
  temp: string;
  tempNum?: number;
  errors: number;
  health: DiskHealthLevel;
  statusText?: string;
  isSpinning: boolean;
  spinEntityId?: string;
  freeSpace?: string;
  totalSpace?: string;
}

export function formatDiskName(rawName: string, id: string): string {
  const name = rawName
    .trim()
    .replace(/_(usage|temperature|temp|errors|health|spin)(?:_\d+)?$/i, "");
  const match = name.match(
    /^(?:.*?\s+)?(?:Disk\s+)?([a-zA-Z0-9_-]+)(?:\s+(?:usage|health|temperature|temp|spin|errors))?$/i
  );
  if (match && match[1]) {
    const token = match[1];
    const diskNum = token.match(/^disk[_\s]?(\d+)$/i);
    if (diskNum) return `Disk ${diskNum[1]}`;
    if (/^\d+$/.test(token)) return `Disk ${token}`;
    if (token.toLowerCase() === "parity") return "Parity";
    const parityNum = token.match(/^parity[_\s]?(\d+)$/i);
    if (parityNum) return `Parity ${parityNum[1]}`;
    if (token.toLowerCase() === "cache") return "Cache";
    if (token.toLowerCase().startsWith("cache_"))
      return `Cache (${token.slice(6).toUpperCase()})`;
    if (token.toLowerCase() === "boot" || token.toLowerCase() === "flash")
      return "Flash (Boot)";
    return token.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name || id;
}

function extractDiskToken(entityId: string): string {
  const objectId = entityId.split(".")[1] || "";
  const token = objectId
    .replace(/^.*?_disk_/, "")
    .replace(/_(usage|temperature|temp|errors|health|spin)(?:_\d+)?$/i, "")
    .toLowerCase()
    .replace(/_/g, "");
  const numMatch = token.match(/^(?:disk)?(\d+)$/);
  if (numMatch) return `disk${numMatch[1]}`;
  return token;
}

export class UnraidStorageCard extends BaseUnraidCard {
  static override editorTag = STORAGE_EDITOR_TAG;

  private getDisks(): DiskItem[] {
    const usageEntities = this.getEntities("disk_usage");
    const healthEntities = this.getEntities("disk_health", "binary_sensor").filter(
      (entity) => {
        const key = this.hass?.entities?.[entity.entity_id]?.translation_key;
        if (key === "parity_status" || key === "parity_valid") return false;
        if (key === "disk_health") return true;
        const objectId = entity.entity_id.split(".")[1] ?? "";
        const physical = [
          "device",
          "smart_status",
          "filesystem",
          "spinning",
          "standby",
        ].some((attribute) => {
          const value = entity.attributes[attribute];
          return (
            value !== undefined &&
            value !== null &&
            (typeof value !== "string" || Boolean(value.trim()))
          );
        });
        return (
          objectId.includes("_disk_") ||
          !/(?:^|_)parity_health(?:_\d+)?$/.test(objectId) ||
          physical
        );
      }
    );
    const tempEntities = this.getEntities("disk_temperature");
    const errorEntities = this.getEntities("disk_error_count");
    const spinEntities = this.getEntities("disk_spin", "switch");

    const diskMap = new Map<string, DiskItem>();
    const deviceName = (entity: HassEntity): string | undefined => {
      const value = entity.attributes.device;
      return typeof value === "string" && value.trim()
        ? value.trim().toLowerCase()
        : undefined;
    };
    const deviceRows = new Map<string, string>();
    const ambiguousDevices = new Set<string>();
    for (const family of [usageEntities, healthEntities]) {
      const familyTokens = new Map<string, string>();
      for (const entity of family) {
        const device = deviceName(entity);
        if (!device) continue;
        const token = extractDiskToken(entity.entity_id);
        const previous = familyTokens.get(device);
        if (previous !== undefined && previous !== token) ambiguousDevices.add(device);
        familyTokens.set(device, token);
        if (!deviceRows.has(device)) deviceRows.set(device, token);
      }
    }
    // Device identities distinguish physical disks even when their ID tokens collide.
    const deviceKey = (entity: HassEntity): string | undefined => {
      const device = deviceName(entity);
      return device && deviceRows.has(device) && !ambiguousDevices.has(device)
        ? `device:${device}`
        : undefined;
    };
    const tokenRows = new Map<string, Set<string>>();
    for (const entity of [...usageEntities, ...healthEntities]) {
      const key = deviceKey(entity);
      if (!key) continue;
      const token = extractDiskToken(entity.entity_id);
      const keys = tokenRows.get(token) ?? new Set<string>();
      keys.add(key);
      tokenRows.set(token, keys);
    }
    const rowKey = (entity: HassEntity): string => {
      const owned = deviceKey(entity);
      if (owned) return owned;
      const token = extractDiskToken(entity.entity_id);
      // A shared device or alias must never attach data to an arbitrary disk.
      const device = deviceName(entity);
      const aliases = tokenRows.get(token);
      if (!device && aliases?.size === 1) return aliases.values().next().value!;
      return `token:${token}`;
    };
    const selectedUsage = new Map<string, HassEntity>();
    for (const entity of usageEntities) {
      const key = rowKey(entity);
      const previous = selectedUsage.get(key);
      if (
        !previous ||
        (this.percentValue(previous) === null && this.percentValue(entity) !== null)
      )
        selectedUsage.set(key, entity);
    }

    // 1. Process usage entities (Data and Cache disks)
    for (const u of selectedUsage.values()) {
      const diskKey = rowKey(u);
      const cleanName = formatDiskName(
        (u.attributes.friendly_name as string) || extractDiskToken(u.entity_id),
        extractDiskToken(u.entity_id)
      );
      const isParity = cleanName.toLowerCase().includes("parity");
      const isCache =
        cleanName.toLowerCase().includes("cache") ||
        cleanName.toLowerCase().includes("pool");
      const isBoot =
        cleanName.toLowerCase().includes("boot") ||
        cleanName.toLowerCase().includes("flash");

      const attrSpin =
        u.attributes.spin_state === "active" || u.attributes.spinning === true;
      const attrTemp = u.attributes.temperature_celsius ?? u.attributes.temperature;
      const attrErrors = Number(u.attributes.num_errors ?? 0);
      const attrStatus = (u.attributes.status as string) || "DISK_OK";

      diskMap.set(diskKey, {
        id: diskKey,
        name: cleanName,
        isParity,
        isCache,
        isBoot,
        usagePct: this.percentValue(u),
        temp: attrTemp !== undefined && attrTemp !== null ? `${attrTemp}°C` : "*",
        tempNum: typeof attrTemp === "number" ? attrTemp : undefined,
        errors: attrErrors,
        health: "healthy",
        statusText: attrStatus,
        isSpinning: attrSpin,
        freeSpace: this.attributeText(u, ["free"]),
        totalSpace: this.attributeText(u, ["total"]),
      });
    }

    // 2. Add any disks from healthEntities not yet in diskMap (e.g. Parity disk)
    for (const h of healthEntities) {
      const diskKey = rowKey(h);
      if (diskMap.has(diskKey)) continue;
      const token = extractDiskToken(h.entity_id);
      if (
        token.includes("disabled") ||
        token.includes("missing") ||
        token.includes("invalid") ||
        (!deviceKey(h) && (tokenRows.get(token)?.size ?? 0) > 1)
      )
        continue;

      const cleanName = formatDiskName(
        (h.attributes.friendly_name as string) || extractDiskToken(h.entity_id),
        extractDiskToken(h.entity_id)
      );
      const isParity = cleanName.toLowerCase().includes("parity");
      const isCache = cleanName.toLowerCase().includes("cache");
      const isBoot = cleanName.toLowerCase().includes("boot");
      const attrSpin =
        h.attributes.spinning === true ||
        (h.attributes.standby !== undefined ? !h.attributes.standby : false);
      const attrTemp = h.attributes.temperature;
      const attrStatus = (h.attributes.status as string) || "DISK_OK";

      diskMap.set(diskKey, {
        id: diskKey,
        name: cleanName,
        isParity,
        isCache,
        isBoot,
        usagePct: null,
        temp: attrTemp !== undefined && attrTemp !== null ? `${attrTemp}°C` : "*",
        tempNum: typeof attrTemp === "number" ? attrTemp : undefined,
        errors: 0,
        health: h.state === "on" ? "error" : "healthy",
        statusText: attrStatus,
        isSpinning: attrSpin,
      });
    }

    // 3. Match dedicated temperature entities
    for (const t of tempEntities) {
      const key = rowKey(t);
      const disk = diskMap.get(key);
      if (disk && t.state !== "unavailable" && t.state !== "unknown") {
        disk.temp = `${t.state}°C`;
        disk.tempNum = parseFloat(t.state);
      }
    }

    // 4. Match error sensors
    for (const e of errorEntities) {
      const key = rowKey(e);
      const disk = diskMap.get(key);
      if (disk) {
        const val = Number(e.state);
        if (!isNaN(val)) disk.errors = val;
      }
    }

    // 5. Match spin switches
    for (const s of spinEntities) {
      const key = rowKey(s);
      const disk = diskMap.get(key);
      if (disk) {
        disk.isSpinning = s.state === "on";
        disk.spinEntityId = s.entity_id;
      }
    }

    // 6. Match health binary sensors & resolve health level
    for (const h of healthEntities) {
      const key = rowKey(h);
      const disk = diskMap.get(key);
      if (disk) {
        if (h.attributes.status) {
          disk.statusText = h.attributes.status as string;
        }
        if (h.attributes.spinning !== undefined) {
          disk.isSpinning = Boolean(h.attributes.spinning);
        } else if (h.attributes.standby !== undefined) {
          disk.isSpinning = !h.attributes.standby;
        }
        if (h.attributes.temperature !== undefined && disk.temp === "*") {
          disk.temp = `${h.attributes.temperature}°C`;
          disk.tempNum = Number(h.attributes.temperature);
        }
        if (h.state === "on") {
          disk.health = "error";
        }
      }
    }

    // 7. Calculate overall health level
    for (const disk of diskMap.values()) {
      const status = (disk.statusText || "").toUpperCase();
      const hasStatusError =
        status.includes("ERR") ||
        status.includes("WRONG") ||
        status.includes("INVALID") ||
        status.includes("DSBL") ||
        status.includes("FAIL");

      if (disk.health === "error" || hasStatusError || disk.errors >= 10) {
        disk.health = "error";
      } else if (disk.errors > 0 || (disk.tempNum !== undefined && disk.tempNum > 45)) {
        disk.health = "warning";
      } else {
        disk.health = "healthy";
      }
    }

    return Array.from(diskMap.values()).sort((a, b) => {
      if (a.isParity !== b.isParity) {
        return a.isParity ? -1 : 1;
      }
      if (a.isBoot !== b.isBoot) {
        return a.isBoot ? 1 : -1;
      }
      if (a.isCache !== b.isCache) {
        return a.isCache ? 1 : -1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }

  private isUsable(entity?: { state?: string } | null): boolean {
    if (!entity || !entity.state) return false;
    const s = entity.state.toLowerCase().trim();
    return s !== "unavailable" && s !== "unknown" && s !== "none" && s !== "--";
  }

  private getParityViewState(): {
    validity: "valid" | "invalid" | "unknown";
    activity: "idle" | "running" | "paused" | "unknown";
    progressPct: number;
  } {
    const parityValid = this.getEntity("parity_valid", "binary_sensor");
    const parityRunning = this.getEntity("parity_check_running", "binary_sensor");
    const legacyParityStatus =
      this.getEntity("parity_status", "binary_sensor") ??
      this.getEntity("parity_status");
    const parityProgress = this.getEntity("parity_progress");

    // Validity: binary_sensor.parity_valid has device_class problem (off = valid, on = invalid)
    let validity: "valid" | "invalid" | "unknown" = "unknown";
    if (this.isUsable(parityValid)) {
      const s = parityValid!.state.toLowerCase().trim();
      if (s === "off") {
        validity = "valid";
      } else if (s === "on") {
        validity = "invalid";
      }
    } else if (this.isUsable(legacyParityStatus)) {
      const s = legacyParityStatus!.state.toLowerCase().trim();
      if (s === "off") {
        validity = "valid";
      } else if (s === "on") {
        const st = String(legacyParityStatus!.attributes?.status ?? "")
          .toLowerCase()
          .trim();
        if (st !== "running" && st !== "paused") {
          validity = "invalid";
        }
      }
    }

    // Activity: binary_sensor.parity_check_running has device_class running (on = active, off = idle)
    let activity: "idle" | "running" | "paused" | "unknown" = "unknown";
    if (this.isUsable(parityRunning)) {
      const s = parityRunning!.state.toLowerCase().trim();
      if (s === "off") {
        activity = "idle";
      } else if (s === "on") {
        const st = String(parityRunning!.attributes?.status ?? "")
          .toLowerCase()
          .trim();
        activity = st === "paused" ? "paused" : "running";
      }
    } else if (this.isUsable(legacyParityStatus)) {
      const st = String(legacyParityStatus!.attributes?.status ?? "")
        .toLowerCase()
        .trim();
      if (st === "running") {
        activity = "running";
      } else if (st === "paused") {
        activity = "paused";
      } else if (legacyParityStatus!.state.toLowerCase().trim() === "off") {
        activity = "idle";
      }
    }

    // Progress: only used for display percentage when numeric
    let progressPct = 0;
    if (this.isUsable(parityProgress)) {
      const val = Number(parityProgress!.state);
      if (!isNaN(val)) {
        progressPct = Math.round(val);
      }
    }

    return { validity, activity, progressPct };
  }

  protected override render(): TemplateResult {
    const arrayUsage = this.getEntity("array_usage");
    const paritySwitch = this.getEntity("parity_check", "switch");
    const lastCheckDate = this.getEntity("last_parity_check_date");
    const lastCheckErrors = this.getEntity("last_parity_check_errors");

    const arrayPct = this.percentValue(arrayUsage);
    const usedStr = this.attributeText(arrayUsage, ["used", "capacity_used"]);
    const totalStr = this.attributeText(arrayUsage, ["total", "capacity_total"]);
    const freeStr = this.attributeText(arrayUsage, ["free", "capacity_free"]);

    const { validity, activity, progressPct } = this.getParityViewState();
    const isChecking = activity === "running" || activity === "paused";

    let badgeClass = "badge-standby";
    let badgeText = "Parity Status Unknown";
    let badgeIcon = mdiShieldAlert;
    if (validity === "valid") {
      badgeClass = "badge-online";
      badgeText = "Parity Valid";
      badgeIcon = mdiShieldCheck;
    } else if (validity === "invalid") {
      badgeClass = "badge-warning";
      badgeText = "Parity Check Needed";
      badgeIcon = mdiShieldAlert;
    }

    const disks = this.getDisks();

    const badge = html`
      <span class="badge ${badgeClass}">
        ${iconTemplate(badgeIcon, 13)}
        <span>${badgeText}</span>
      </span>
    `;

    let parityTitle: string;
    if (activity === "running") {
      parityTitle = `Parity Check In Progress (${progressPct}%)`;
    } else if (activity === "paused") {
      parityTitle = `Parity Check Paused (${progressPct}%)`;
    } else if (validity === "valid") {
      parityTitle = "Parity Status: Valid";
    } else if (validity === "invalid") {
      parityTitle = "Parity Status: Check Needed";
    } else {
      parityTitle = "Parity Status: Unknown";
    }

    const rowIcon =
      validity === "valid" || isChecking ? mdiCheckCircle : mdiAlertCircle;
    const rowColor =
      validity === "valid" || isChecking
        ? "var(--unraid-online)"
        : "var(--unraid-warning)";

    const hasLastCheckDate = this.isUsable(lastCheckDate);
    const numErrors = Number(lastCheckErrors?.state);
    const hasErrors =
      this.isUsable(lastCheckErrors) && !isNaN(numErrors) && numErrors > 0;

    let historyText = "";
    if (hasLastCheckDate) {
      historyText = `Last check: ${lastCheckDate!.state}`;
    } else if (validity === "valid") {
      historyText = "Parity healthy";
    }
    const errorsText = hasErrors ? ` • ${lastCheckErrors!.state} errors` : "";
    const showHistoryLine = Boolean(historyText || errorsText);

    return html`
      <ha-card>
        ${this.renderHeader(
          this.config.title || "Storage Array & Disks",
          `${usedStr ?? (arrayPct !== null ? `${arrayPct}%` : "—")} used of ${totalStr ?? "Array"}${freeStr ? ` (${freeStr} Free)` : ""}`,
          mdiHarddisk,
          badge
        )}
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div
            style="display: flex; justify-content: space-between; font-size: var(--ha-font-size-s, 12px); font-weight: var(--ha-font-weight-medium, 500);"
          >
            <span>Array Capacity</span>
            <span>${arrayPct !== null ? `${arrayPct}%` : "—"}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${arrayPct ?? 0}%;"></div>
          </div>
        </div>
        <div
          class="list-row"
          style="background: color-mix(in srgb, var(--unraid-text) 5%, transparent);"
        >
          <div class="row-left">
            <div style="color: ${rowColor}">${iconTemplate(rowIcon, 18)}</div>
            <div style="display: flex; flex-direction: column; min-width: 0;">
              <span
                style="font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-s, 12px);"
              >
                ${parityTitle}
              </span>
              ${
                showHistoryLine
                  ? html`
                      <span
                        style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                      >
                        ${historyText}${errorsText}
                      </span>
                    `
                  : nothing
              }
            </div>
          </div>
          <div class="row-right">
            ${
              paritySwitch
                ? html`
                    <button
                      type="button"
                      class="btn ${isChecking ? "btn" : "btn-primary"}"
                      aria-label="${isChecking ? "Cancel parity check" : "Check parity now"}"
                      @click=${() => this.toggleEntity(paritySwitch.entity_id)}
                    >
                      ${iconTemplate(isChecking ? mdiPause : mdiPlay, 20)}
                      <span>${isChecking ? "Cancel" : "Check Now"}</span>
                    </button>
                  `
                : nothing
            }
          </div>
        </div>
        <div class="item-list">
          ${
            disks.length > 0
              ? disks.map((disk) => {
                  const tempNum = disk.tempNum ?? parseFloat(disk.temp);
                  const hasValidTemp =
                    disk.isSpinning &&
                    !isNaN(tempNum) &&
                    disk.temp !== "*" &&
                    disk.temp !== "unavailable";
                  const tempColor = hasValidTemp
                    ? tempNum > 45
                      ? "var(--unraid-error)"
                      : tempNum > 36
                        ? "var(--unraid-warning)"
                        : "var(--unraid-online)"
                    : "var(--unraid-standby)";

                  const tempDisplay = hasValidTemp ? `${Math.round(tempNum)}°C` : "--";

                  const healthBadge =
                    disk.health === "healthy"
                      ? html`
                          <span
                            class="badge badge-online"
                            style="font-size: var(--ha-font-size-s, 12px); gap: 4px;"
                          >
                            ${iconTemplate(mdiCheckCircle, 11)}
                            <span>Healthy</span>
                          </span>
                        `
                      : disk.health === "warning"
                        ? html`
                            <span
                              class="badge badge-warning"
                              style="font-size: var(--ha-font-size-s, 12px); gap: 4px;"
                            >
                              ${iconTemplate(mdiAlertCircle, 11)}
                              <span
                                >Warning${disk.errors > 0 ? ` (${disk.errors})` : ""}</span
                              >
                            </span>
                          `
                        : html`
                            <span
                              class="badge badge-error"
                              style="font-size: var(--ha-font-size-s, 12px); gap: 4px;"
                            >
                              ${iconTemplate(mdiAlertCircle, 11)}
                              <span
                                >Error${disk.errors > 0 ? ` (${disk.errors})` : ""}</span
                              >
                            </span>
                          `;

                  return html`
                    <div class="list-row">
                      <div class="row-left">
                        ${
                          disk.isBoot
                            ? html`
                                <span
                                  class="badge badge-online"
                                  style="font-size: var(--ha-font-size-s, 12px); gap: 4px; min-width: 60px; justify-content: center;"
                                  title="USB Flash Boot Drive"
                                >
                                  ${iconTemplate(mdiUsbFlashDrive, 11)}
                                  <span>Flash</span>
                                </span>
                              `
                            : disk.spinEntityId
                              ? html`
                                  <button
                                    type="button"
                                    class="badge ${disk.isSpinning ? "badge-online" : "badge-standby"}"
                                    style="cursor: pointer; border: none;"
                                    title="Spin ${disk.isSpinning ? "down" : "up"} ${disk.name}"
                                    aria-label="Spin ${disk.isSpinning ? "down" : "up"} ${disk.name}"
                                    @click=${() => this.toggleEntity(disk.spinEntityId!)}
                                  >
                                    <span
                                      class="status-dot ${disk.isSpinning ? "online" : "offline"}"
                                    ></span>
                                    <span
                                      >${disk.isSpinning ? "Active" : "Standby"}</span
                                    >
                                  </button>
                                `
                              : html`
                                  <span
                                    class="badge ${disk.isSpinning ? "badge-online" : "badge-standby"}"
                                  >
                                    <span
                                      >${disk.isSpinning ? "Active" : "Standby"}</span
                                    >
                                  </span>
                                `
                        }

                        <span
                          style="font-weight: var(--ha-font-weight-medium, 500); min-width: 75px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                        >
                          ${disk.name}
                        </span>
                      </div>

                      <div class="row-right">
                        <span
                          class="badge"
                          style="color: var(--unraid-text); background: color-mix(in srgb, ${disk.isBoot ? "var(--unraid-subtext)" : tempColor} 12%, transparent); min-width: 44px; justify-content: center;"
                          title="${disk.isBoot ? "USB Flash Drive" : disk.isSpinning ? `Temperature: ${tempDisplay}` : "Disk is in standby"}"
                        >
                          ${disk.isBoot ? "--" : tempDisplay}
                        </span>
                        ${healthBadge}
                        <div
                          style="display: flex; align-items: center; gap: 6px; width: 85px;"
                        >
                          ${
                            disk.isParity
                              ? html`
                                  <span
                                    style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-text); font-weight: 500; font-family: var(--ha-font-family-code, monospace);"
                                  >
                                    Parity
                                  </span>
                                `
                              : html`
                                  <div
                                    class="progress-bar"
                                    style="height: 4px; flex: 1;"
                                  >
                                    <div
                                      class="progress-fill"
                                      style="width: ${disk.usagePct ?? 0}%; background: ${disk.isBoot ? "var(--unraid-warning)" : disk.isCache ? "var(--unraid-info)" : "var(--unraid-accent)"};"
                                    ></div>
                                  </div>
                                  <span
                                    style="font-size: var(--ha-font-size-s, 12px); font-family: var(--ha-font-family-code, monospace); color: var(--unraid-subtext);"
                                  >
                                    ${disk.usagePct !== null ? `${disk.usagePct}%` : "—"}
                                  </span>
                                `
                          }
                        </div>
                      </div>
                    </div>
                  `;
                })
              : html`<div
                  style="text-align: center; color: var(--unraid-subtext); font-size: var(--ha-font-size-m, 14px); padding: 12px;"
                >
                  No disk devices found
                </div>`
          }
        </div>
      </ha-card>
    `;
  }
}

registerDashboardCard({
  tag: STORAGE_CARD_TAG,
  editorTag: STORAGE_EDITOR_TAG,
  card: UnraidStorageCard,
  editor: UnraidStorageCardEditor,
  name: "Unraid Storage & Disks Card",
  description:
    "Array capacity, parity checks, and interactive disk tray with spin state controls.",
});
