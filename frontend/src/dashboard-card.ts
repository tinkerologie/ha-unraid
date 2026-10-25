import { html, nothing, type TemplateResult } from "lit";
import { DASHBOARD_CARD_TAG, DASHBOARD_EDITOR_TAG } from "./config";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidDashboardCardEditor } from "./dashboard-cards-editor";
import {
  iconTemplate,
  mdiDocker,
  mdiFlash,
  mdiFolder,
  mdiHarddisk,
  mdiLanConnect,
  mdiMonitor,
  mdiServer,
} from "./icons";
import { registerDashboardCard } from "./register-dashboard-card";

import "./server-card";
import "./storage-card";
import "./shares-card";
import "./network-card";
import "./docker-card";
import "./ups-card";
import "./vm-card";

const dashboardTabs = [
  { id: "overview", label: "Overview", icon: mdiServer },
  { id: "storage", label: "Storage & Disks", icon: mdiHarddisk },
  { id: "shares", label: "Shares", icon: mdiFolder },
  { id: "network", label: "Network", icon: mdiLanConnect },
  { id: "docker", label: "Docker", icon: mdiDocker },
  { id: "ups", label: "UPS Power", icon: mdiFlash },
  { id: "vms", label: "VMs", icon: mdiMonitor },
] as const;
type ActiveTab = (typeof dashboardTabs)[number]["id"];

export class UnraidDashboardCard extends BaseUnraidCard {
  static override editorTag = DASHBOARD_EDITOR_TAG;

  static override properties = {
    ...BaseUnraidCard.properties,
    _activeTab: { state: true },
  };

  declare _activeTab: ActiveTab;

  constructor() {
    super();
    this._activeTab = "overview";
  }

  private renderActivePanel(): TemplateResult | typeof nothing {
    const config = { ...this.config, embedded: true };
    switch (this._activeTab) {
      case "overview":
        return html`<unraid-server-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-server-card" }}
        ></unraid-server-card>`;
      case "storage":
        return html`<unraid-storage-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-storage-card" }}
        ></unraid-storage-card>`;
      case "shares":
        return html`<unraid-shares-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-shares-card" }}
        ></unraid-shares-card>`;
      case "network":
        return html`<unraid-network-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-network-card" }}
        ></unraid-network-card>`;
      case "docker":
        return html`<unraid-docker-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-docker-card" }}
        ></unraid-docker-card>`;
      case "ups":
        return html`<unraid-ups-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-ups-card" }}
        ></unraid-ups-card>`;
      case "vms":
        return html`<unraid-vm-card
          .hass=${this.hass}
          .config=${{ ...config, type: "custom:unraid-vm-card" }}
        ></unraid-vm-card>`;
    }
  }

  protected override render(): TemplateResult {
    const device = this.getActiveDevice();
    const serverName =
      this.config.title || device?.name_by_user || device?.name || "Unraid Server";
    return html`
      <ha-card>
        <div class="header">
          <div class="header-main">
            <div class="header-icon">${iconTemplate(mdiServer, 22)}</div>
            <div class="header-titles">
              <h2 class="header-title">${serverName} Dashboard</h2>
              <span class="header-subtitle">Unified Unraid Control Center</span>
            </div>
          </div>
        </div>
        <div
          class="tab-strip"
          role="tablist"
          aria-label="Unraid sections"
          @keydown=${this.handleTabKeydown}
        >
          ${dashboardTabs.map(
            (tab) =>
              html` <button
                type="button"
                role="tab"
                id="tab-${tab.id}"
                class="tab-btn ${this._activeTab === tab.id ? "active" : ""}"
                aria-selected=${this._activeTab === tab.id}
                aria-controls="panel-${tab.id}"
                .tabIndex=${this._activeTab === tab.id ? 0 : -1}
                @click=${(event: Event) => {
                  this._activeTab = tab.id;
                  for (const button of this.renderRoot.querySelectorAll<HTMLButtonElement>(
                    'button[role="tab"]'
                  ))
                    button.tabIndex = button === event.currentTarget ? 0 : -1;
                  (event.currentTarget as HTMLElement).scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  });
                }}
              >
                ${iconTemplate(tab.icon, 20)} ${tab.label}
              </button>`
          )}
        </div>
        ${dashboardTabs.map(
          (tab) =>
            html` <div
              role="tabpanel"
              id="panel-${tab.id}"
              aria-labelledby="tab-${tab.id}"
              tabindex="0"
              ?hidden=${this._activeTab !== tab.id}
            >
              ${this._activeTab === tab.id ? this.renderActivePanel() : nothing}
            </div>`
        )}
      </ha-card>
    `;
  }
}

registerDashboardCard({
  tag: DASHBOARD_CARD_TAG,
  editorTag: DASHBOARD_EDITOR_TAG,
  card: UnraidDashboardCard,
  editor: UnraidDashboardCardEditor,
  name: "Unraid Unified Dashboard Card",
  description:
    "All-in-one Unraid master card with tabbed overview, storage, docker, UPS, and VM monitoring.",
});
