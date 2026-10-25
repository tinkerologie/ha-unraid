import { html, nothing, type TemplateResult } from "lit";
import { SERVER_CARD_TAG, SERVER_EDITOR_TAG } from "./config";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidServerCardEditor } from "./dashboard-cards-editor";
import { iconTemplate, mdiAlertCircle, mdiServer } from "./icons";
import { registerDashboardCard } from "./register-dashboard-card";

export class UnraidServerCard extends BaseUnraidCard {
  static override editorTag = SERVER_EDITOR_TAG;

  private formatUptime(secondsOrIso: string | undefined): string {
    if (!secondsOrIso) return "Unknown";
    const trimmed = secondsOrIso.trim();
    let totalSec = 0;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      totalSec = Math.floor(Number(trimmed));
    } else {
      const date = new Date(secondsOrIso);
      if (!isNaN(date.getTime())) {
        totalSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
      } else {
        return secondsOrIso;
      }
    }

    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  protected override render(): TemplateResult {
    const device = this.getActiveDevice();
    const serverName =
      this.config.title || device?.name_by_user || device?.name || "Unraid Server";

    // Entities
    const cpuState = this.getEntity("cpu_usage");
    const ramState = this.getEntity("ram_usage");
    const arrayUsage = this.getEntity("array_usage");
    const arrayState = this.getEntity("array_state");
    const tempState =
      this.getEntity("system_temperature") || this.getEntity("temperature_average");
    const powerState = this.getEntity("cpu_power");
    const uptimeState = this.getEntity("uptime");
    const alertsState = this.getEntity("notifications_unread_alert");
    const ipState = this.getEntity("network_interface_ip");

    const cpuPct = this.percentValue(cpuState);
    const ramPct = this.percentValue(ramState);
    const arrayPct = this.percentValue(arrayUsage);

    const isArrayStarted =
      arrayState?.state?.toLowerCase() === "started" || arrayState?.state === "Normal";
    const rawAlertCount = alertsState?.state.trim() ? Number(alertsState.state) : NaN;
    const alertCount =
      Number.isFinite(rawAlertCount) && rawAlertCount >= 0 ? rawAlertCount : null;

    const cpuModel =
      (cpuState?.attributes?.cpu_model as string) ||
      (device?.model ?? "Multi-Core CPU");
    const ramUsed = this.getEntity("ram_used");
    const ramUsedStr =
      ramUsed && Number(ramUsed.state) >= 0
        ? this.numericStateText(ramUsed)
        : undefined;
    // Legacy totals use ambiguous GB labels; keep the native HA unit on used RAM.
    const arrayUsedStr = this.attributeText(arrayUsage, ["used", "capacity_used"]);
    const arrayTotalStr = this.attributeText(arrayUsage, ["total", "capacity_total"]);

    // Network interfaces and primary interface
    const ifaces = this.getNetworkInterfaces();
    const primaryIface = ifaces.length > 0 ? ifaces[0] : undefined;
    const speedRaw =
      primaryIface?.speed?.state ||
      (primaryIface?.link?.attributes?.speed_mbps as string | number | undefined);
    const netSpeedNum = speedRaw != null ? Number(speedRaw) : undefined;
    const netSpeedText = netSpeedNum
      ? netSpeedNum >= 1000
        ? `${netSpeedNum / 1000} Gbps`
        : `${netSpeedNum} Mbps`
      : "";

    const rxText = this.rateText(primaryIface?.rx);
    const txText = this.rateText(primaryIface?.tx);
    const netTrafficText =
      rxText && txText ? `↓ ${rxText} • ↑ ${txText}` : netSpeedText || "Active";

    // Boot / Flash device
    const bootDisk = this.getBootDiskEntity();
    const bootAttrs = bootDisk?.attributes;
    const bootUsed = (bootAttrs?.used || bootAttrs?.fs_used) as string | undefined;
    const bootTotal = (bootAttrs?.total || bootAttrs?.fs_size) as string | undefined;
    const bootDevice = bootAttrs?.device as string | undefined;
    const bootText =
      bootUsed && bootTotal
        ? `Flash (${bootUsed} / ${bootTotal})`
        : bootDevice
          ? `Flash (${bootDevice})`
          : "Flash (USB)";
    const bootTooltip = bootAttrs?.filesystem
      ? `Device: ${bootDevice || "USB"} • FS: ${bootAttrs.filesystem}`
      : "USB Flash Boot Drive";

    const badge = html`
      <span class="badge ${isArrayStarted ? "badge-online" : "badge-standby"}">
        <span class="pulse-dot"></span>
        <span>Array ${this.formatState(arrayState)}</span>
      </span>
      ${
        alertCount !== null && alertCount > 0
          ? html`
              <span class="badge badge-error">
                ${iconTemplate(mdiAlertCircle, 13)}
                <span>${alertCount}</span>
              </span>
            `
          : nothing
      }
    `;

    return html`
      <ha-card>
        ${this.renderHeader(
          serverName,
          `${device?.model || "Unraid OS"} • Up ${this.formatUptime(uptimeState?.state)}`,
          mdiServer,
          badge
        )}
        <div class="rings-grid">
          <button
            type="button"
            class="ring-card"
            ?disabled=${!cpuState}
            style="${cpuState ? "cursor: pointer;" : ""}"
            @click=${() => cpuState && this.openMoreInfo(cpuState.entity_id)}
            title="Click to view CPU details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${cpuPct ?? 0}; --ring-color: ${cpuPct === null ? "var(--unraid-border)" : cpuPct > 80 ? "var(--unraid-error)" : cpuPct > 50 ? "var(--unraid-warning)" : "var(--unraid-online)"}"
            >
              <span class="ring-content">${cpuPct !== null ? `${cpuPct}%` : "—"}</span>
            </span>
            <span class="ring-label">CPU Load</span>
            <span class="ring-subtext">
              ${tempState?.state ? `${tempState.state}°C` : ""}${powerState?.state ? ` • ${powerState.state}W` : ""}
            </span>
          </button>
          <button
            type="button"
            class="ring-card"
            ?disabled=${!ramState}
            style="${ramState ? "cursor: pointer;" : ""}"
            @click=${() => ramState && this.openMoreInfo(ramState.entity_id)}
            title="Click to view Memory details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${ramPct ?? 0}; --ring-color: ${ramPct === null ? "var(--unraid-border)" : ramPct > 85 ? "var(--unraid-error)" : "var(--unraid-info)"}"
            >
              <span class="ring-content">${ramPct !== null ? `${ramPct}%` : "—"}</span>
            </span>
            <span class="ring-label">Memory</span>
            <span class="ring-subtext"
              >${ramUsedStr !== undefined ? `${ramUsedStr} used` : ramPct !== null ? `${ramPct}% used` : "No data"}</span
            >
          </button>
          <button
            type="button"
            class="ring-card"
            ?disabled=${!arrayUsage}
            style="${arrayUsage ? "cursor: pointer;" : ""}"
            @click=${() => arrayUsage && this.openMoreInfo(arrayUsage.entity_id)}
            title="Click to view Array storage details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${arrayPct ?? 0}; --ring-color: var(--unraid-accent)"
            >
              <span class="ring-content"
                >${arrayPct !== null ? `${arrayPct}%` : "—"}</span
              >
            </span>
            <span class="ring-label">Array Storage</span>
            <span class="ring-subtext"
              >${arrayUsedStr && arrayTotalStr ? `${arrayUsedStr} / ${arrayTotalStr}` : arrayPct !== null ? `${arrayPct}% used` : "No data"}</span
            >
          </button>
        </div>

        ${
          this.config.show_system_info !== false
            ? html`
                <div class="divider"></div>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Processor</span>
                    <span class="detail-val" title="${cpuModel}">${cpuModel}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">OS Version</span>
                    <span class="detail-val">${device?.sw_version || "Unraid OS"}</span>
                  </div>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!uptimeState}
                    style="${uptimeState ? "cursor: pointer;" : ""}"
                    @click=${() => uptimeState && this.openMoreInfo(uptimeState.entity_id)}
                    title="Click to view Uptime details"
                  >
                    <span class="detail-label">System Uptime</span>
                    <span class="detail-val"
                      >${this.formatUptime(uptimeState?.state)}</span
                    >
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!(primaryIface?.rx || ipState)}
                    style="${primaryIface?.rx || ipState ? "cursor: pointer;" : ""}"
                    @click=${() => (primaryIface?.rx ? this.openMoreInfo(primaryIface.rx.entity_id) : ipState && this.openMoreInfo(ipState.entity_id))}
                    title="Click to view Network details"
                  >
                    <span class="detail-label">Primary Network</span>
                    <span
                      class="detail-val"
                      title="${primaryIface ? `${primaryIface.name} • ${netSpeedText}` : "Connected"}"
                    >
                      ${primaryIface ? `${primaryIface.name}: ` : ""}${primaryIface?.ip?.state || ipState?.state || "Connected"}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!(primaryIface?.rx || primaryIface?.speed)}
                    style="${primaryIface?.rx || primaryIface?.speed ? "cursor: pointer;" : ""}"
                    @click=${() => (primaryIface?.rx ? this.openMoreInfo(primaryIface.rx.entity_id) : primaryIface?.speed && this.openMoreInfo(primaryIface.speed.entity_id))}
                    title="Click to view Network traffic details"
                  >
                    <span class="detail-label">Network Traffic</span>
                    <span
                      class="detail-val"
                      title="${netSpeedText ? `Link Speed: ${netSpeedText}` : "Network Speed"}"
                      >${netTrafficText}</span
                    >
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!bootDisk}
                    style="${bootDisk ? "cursor: pointer;" : ""}"
                    @click=${() => bootDisk && this.openMoreInfo(bootDisk.entity_id)}
                    title="Click to view Boot device details"
                  >
                    <span class="detail-label">Boot Device</span>
                    <span class="detail-val" title="${bootTooltip}">${bootText}</span>
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!alertsState}
                    style="${alertsState ? "cursor: pointer;" : ""}"
                    @click=${() => alertsState && this.openMoreInfo(alertsState.entity_id)}
                    title="Click to view Notifications"
                  >
                    <span class="detail-label">System Health</span>
                    <span class="detail-val">
                      ${alertCount === null ? (alertsState && ["unknown", "unavailable"].includes(alertsState.state) ? this.formatState(alertsState) : "No data") : alertCount === 0 ? "Normal • Healthy" : `${alertCount} Active Alerts`}
                    </span>
                  </button>
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }
}

registerDashboardCard({
  tag: SERVER_CARD_TAG,
  editorTag: SERVER_EDITOR_TAG,
  card: UnraidServerCard,
  editor: UnraidServerCardEditor,
  name: "Unraid Server Overview Card",
  description: "Server metrics, CPU/RAM ring gauges, and hardware health.",
});
