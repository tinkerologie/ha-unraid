import { html, nothing, type TemplateResult } from "lit";
import { NETWORK_CARD_TAG, NETWORK_EDITOR_TAG } from "./config";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidNetworkCardEditor } from "./dashboard-cards-editor";
import { fireEvent } from "./ha-types";
import {
  iconTemplate,
  mdiDownload,
  mdiEthernet,
  mdiLanConnect,
  mdiUpload,
} from "./icons";
import { registerDashboardCard } from "./register-dashboard-card";

export class UnraidNetworkCard extends BaseUnraidCard {
  static override editorTag = NETWORK_EDITOR_TAG;

  private formatDataRate(valStr?: string, unit = "MB/s"): string {
    if (!valStr) return "--";
    const clean = valStr.toLowerCase().trim();
    if (["unavailable", "unknown", "none", "--"].includes(clean)) return "--";
    const num = parseFloat(valStr);
    if (isNaN(num)) return "--";
    if (num <= 0) return "0 kB/s";
    if (num < 0.1) return `${(num * 1000).toFixed(1)} kB/s`;
    return `${num.toFixed(2)} ${unit}`;
  }

  private isValidIp(s?: string): boolean {
    return (
      Boolean(s) &&
      !["unavailable", "unknown", "none", "--"].includes(s!.toLowerCase().trim())
    );
  }

  private formatSpeed(speedStr?: string): string {
    if (!speedStr) return "";
    const clean = speedStr.toLowerCase().trim();
    if (["unavailable", "unknown", "none", "--"].includes(clean)) return "";
    const num = Number(speedStr);
    if (isNaN(num)) return speedStr;
    if (num >= 1000) return `${num / 1000} Gbps`;
    return `${num} Mbps`;
  }

  private handleMoreInfo(entityId?: string): void {
    if (!entityId) return;
    fireEvent(this, "hass-more-info", { entityId });
  }

  protected override render(): TemplateResult {
    const device = this.getActiveDevice();
    const serverName =
      this.config.title || device?.name_by_user || device?.name || "Unraid Server";

    const ifaces = this.getNetworkInterfaces();
    const networkAccess = this.getEntity("network_access");
    const accessAttrs = networkAccess?.attributes;
    const lanUrl =
      (accessAttrs?.LAN_IPv4_ipv4 as string) ||
      (networkAccess?.state?.startsWith("http") ? networkAccess.state : undefined);
    const fqdnUrl = accessAttrs?.FQDN_LAN_ipv4 as string | undefined;

    const connectedCount = ifaces.filter(
      (i) => i.link?.state === "on" || this.isValidIp(i.ip?.state)
    ).length;

    const badge = html`
      <span class="badge ${connectedCount > 0 ? "badge-online" : "badge-error"}">
        <span class="pulse-dot"></span>
        <span>${connectedCount} Connected</span>
      </span>
    `;

    return html`
      <ha-card>
        ${this.renderHeader(
          this.config.title || `${serverName} Network`,
          `${device?.model || "Unraid"} • ${ifaces.length} Interface${ifaces.length === 1 ? "" : "s"}`,
          mdiLanConnect,
          badge
        )}
        <div class="item-list">
          ${
            ifaces.length > 0
              ? ifaces.map((iface) => {
                  const isConnected =
                    iface.link?.state === "on" || this.isValidIp(iface.ip?.state);
                  const ipStr = this.isValidIp(iface.ip?.state)
                    ? iface.ip!.state
                    : "--";
                  const macStr =
                    (iface.ip?.attributes?.mac_address as string) ||
                    (iface.link?.attributes?.mac_address as string) ||
                    "";
                  const mtu =
                    (iface.link?.attributes?.mtu as number) ||
                    (iface.ip?.attributes?.mtu as number) ||
                    undefined;
                  const speedVal =
                    iface.speed?.state ||
                    (iface.link?.attributes?.speed_mbps as string | number | undefined);
                  const speedText = this.formatSpeed(
                    speedVal != null ? String(speedVal) : undefined
                  );

                  const rxRate = this.formatDataRate(iface.rx?.state);
                  const txRate = this.formatDataRate(iface.tx?.state);
                  const totalRx =
                    (iface.rx?.attributes?.total_received as string) || "";
                  const totalTx = (iface.tx?.attributes?.total_sent as string) || "";

                  const primaryEntityId =
                    iface.ip?.entity_id || iface.rx?.entity_id || iface.link?.entity_id;

                  return html`
                    <button
                      type="button"
                      class="list-row network-row"
                      title="Show details for ${iface.displayName}"
                      ?disabled=${!primaryEntityId}
                      style="cursor: pointer; flex-direction: column; align-items: stretch; gap: 8px; padding: 12px 14px;"
                      @click=${() => this.handleMoreInfo(primaryEntityId)}
                    >
                      <span
                        style="display: flex; align-items: center; justify-content: space-between;"
                      >
                        <span class="row-left" style="gap: 8px;">
                          <span
                            class="badge ${isConnected ? "badge-online" : "badge-error"}"
                            style="min-width: 50px; justify-content: center;"
                          >
                            ${iconTemplate(mdiEthernet, 13)}
                            <span>${iface.name}</span>
                          </span>
                          <span
                            style="font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-m, 14px);"
                            dir="ltr"
                          >
                            ${ipStr}
                          </span>
                        </span>

                        <span class="row-right" style="gap: 6px;">
                          ${
                            speedText
                              ? html`
                                  <span
                                    class="badge"
                                    style="color: var(--unraid-text); background: color-mix(in srgb, var(--unraid-info) 12%, transparent); font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-s, 12px);"
                                  >
                                    ${speedText}
                                  </span>
                                `
                              : nothing
                          }
                          <span
                            class="badge ${isConnected ? "badge-online" : "badge-standby"}"
                            style="font-size: var(--ha-font-size-s, 12px);"
                          >
                            ${isConnected ? "Up" : "Down"}
                          </span>
                        </span>
                      </span>
                      <span
                        style="display: flex; align-items: center; justify-content: space-between; font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext); border-block-start: 1px solid var(--unraid-border, rgba(255,255,255,0.06)); padding-block-start: 6px;"
                      >
                        <span style="display: flex; align-items: center; gap: 14px;">
                          <span
                            style="display: flex; align-items: center; gap: 4px;"
                            title="${totalRx ? `Total Inbound: ${totalRx}` : "Inbound Transfer Rate"}"
                          >
                            <span style="color: var(--unraid-online);"
                              >${iconTemplate(mdiDownload, 13)}</span
                            >
                            <span
                              style="font-family: var(--ha-font-family-code, monospace); font-weight: 500;"
                              >${rxRate}</span
                            >
                            ${totalRx ? html`<span style="font-size: var(--ha-font-size-s, 12px);">(${totalRx})</span>` : nothing}
                          </span>

                          <span
                            style="display: flex; align-items: center; gap: 4px;"
                            title="${totalTx ? `Total Outbound: ${totalTx}` : "Outbound Transfer Rate"}"
                          >
                            <span style="color: var(--unraid-info);"
                              >${iconTemplate(mdiUpload, 13)}</span
                            >
                            <span
                              style="font-family: var(--ha-font-family-code, monospace); font-weight: 500;"
                              >${txRate}</span
                            >
                            ${totalTx ? html`<span style="font-size: var(--ha-font-size-s, 12px);">(${totalTx})</span>` : nothing}
                          </span>
                        </span>

                        <span
                          style="display: flex; align-items: center; gap: 8px; font-size: var(--ha-font-size-s, 12px);"
                        >
                          ${mtu ? html`<span>MTU ${mtu}</span>` : nothing}
                          ${macStr ? html`<span style="font-family: var(--ha-font-family-code, monospace);"><bdi dir="ltr">${macStr}</bdi></span>` : nothing}
                        </span>
                      </span>
                    </button>
                  `;
                })
              : html`
                  <div class="empty-state">
                    No network interfaces discovered for this server.
                  </div>
                `
          }
        </div>

        ${
          lanUrl || fqdnUrl
            ? html`
                <div class="divider"></div>
                <div class="detail-grid">
                  ${
                    lanUrl
                      ? html`
                          <div class="detail-item">
                            <span class="detail-label">LAN WebGUI</span>
                            <a
                              href="${lanUrl}"
                              aria-label="LAN WebGUI (opens in new tab): ${lanUrl}"
                              dir="ltr"
                              target="_blank"
                              rel="noreferrer"
                              class="detail-val"
                              style="color: var(--unraid-text); text-decoration: underline;"
                            >
                              ${lanUrl}
                            </a>
                          </div>
                        `
                      : nothing
                  }
                  ${
                    fqdnUrl
                      ? html`
                          <div class="detail-item">
                            <span class="detail-label">Remote Access URL</span>
                            <a
                              href="${fqdnUrl}"
                              aria-label="Remote access (opens in new tab): ${fqdnUrl}"
                              dir="ltr"
                              target="_blank"
                              rel="noreferrer"
                              class="detail-val"
                              style="color: var(--unraid-text); text-decoration: underline;"
                            >
                              Connect FQDN
                            </a>
                          </div>
                        `
                      : nothing
                  }
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }
}

registerDashboardCard({
  tag: NETWORK_CARD_TAG,
  editorTag: NETWORK_EDITOR_TAG,
  card: UnraidNetworkCard,
  editor: UnraidNetworkCardEditor,
  name: "Unraid Network Card",
  description: "Network interfaces, link speeds, live throughput, and IP addresses.",
});
