import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { type CardConfig } from "./config";
import { fireEvent, type HomeAssistant } from "./ha-types";
import { themeTokens } from "./styles";

const fieldsByType: Record<
  string,
  { systemInfo?: boolean; viewMode?: boolean; filter?: boolean; updates?: boolean }
> = {
  "custom:unraid-server-card": { systemInfo: true },
  "custom:unraid-docker-card": { viewMode: true, filter: true, updates: true },
  "custom:unraid-vm-card": { filter: true },
  "custom:unraid-dashboard-card": {
    systemInfo: true,
    viewMode: true,
    filter: true,
    updates: true,
  },
};

export class UnraidCardEditor extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  declare hass?: HomeAssistant;
  declare _config?: CardConfig;

  static override styles = [
    themeTokens,
    css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4, 16px);
        padding: var(--ha-space-2, 8px) 0;
        color: var(--unraid-text);
        font-size: var(--ha-font-size-m, 14px);
      }
      .form-row {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      label {
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--unraid-subtext);
      }
      input[type="text"],
      select {
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        min-block-size: var(--ha-space-14, 56px);
        box-sizing: border-box;
        font-family: var(--ha-font-family-body, inherit);
        border-radius: var(--ha-border-radius-md, 8px);
        border: 1px solid var(--unraid-control-border);
        background: var(--secondary-background-color, var(--unraid-card-bg));
        color: var(--unraid-text);
        font-size: var(--ha-font-size-m, 14px);
      }
      .checkbox-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        min-block-size: var(--ha-space-10, 40px);
        cursor: pointer;
      }
      :where(input, select):focus-visible {
        outline: 2px solid var(--unraid-focus);
        outline-offset: 2px;
      }
      .checkbox-row input {
        width: 20px;
        height: 20px;
        accent-color: var(--unraid-primary);
      }
    `,
  ];

  setConfig(config: CardConfig): void {
    this._config = { ...config };
  }

  private _valueChanged(key: string, value: unknown): void {
    if (!this._config) return;
    this._config = { ...this._config, [key]: value };
    fireEvent(this, "config-changed", { config: this._config });
  }

  protected override render(): TemplateResult {
    if (!this._config) return html``;

    const devices = this.hass?.devices
      ? Object.values(this.hass.devices).filter((d) =>
          d.identifiers?.some(([domain]) => domain === "unraid")
        )
      : [];
    const fields = fieldsByType[this._config.type] ?? {};
    const filter = this._config.default_filter;
    const defaultFilter =
      filter === "running" ||
      filter === "stopped" ||
      (fields.updates && (filter === "updates" || filter === "paused"))
        ? filter
        : "all";

    return html`
      <div class="card-config">
        <div class="form-row">
          <label for="server">Unraid Server</label>
          ${
            devices.length > 0
              ? html`
                  <select
                    id="server"
                    @change=${(e: Event) =>
                      this._valueChanged(
                        "server",
                        (e.target as HTMLSelectElement).value
                      )}
                  >
                    ${(() => {
                      const currentServer = this._config.server || devices[0]?.id || "";
                      return devices.map(
                        (d) => html`
                          <option value=${d.id} ?selected=${d.id === currentServer}>
                            ${d.name_by_user || d.name || d.id}
                          </option>
                        `
                      );
                    })()}
                  </select>
                `
              : html`
                  <input
                    type="text"
                    id="server"
                    placeholder="Auto-detecting server..."
                    .value=${this._config.server || ""}
                    @input=${(e: Event) =>
                      this._valueChanged(
                        "server",
                        (e.target as HTMLInputElement).value
                      )}
                  />
                `
          }
        </div>
        <div class="form-row">
          <label for="title">Custom Title (optional)</label>
          <input
            type="text"
            id="title"
            placeholder="Leave empty for default"
            .value=${this._config.title || ""}
            @input=${(e: Event) =>
              this._valueChanged("title", (e.target as HTMLInputElement).value)}
          />
        </div>
        ${
          fields.viewMode
            ? html`
                <div class="form-row">
                  <label for="view_mode">Default View Mode</label>
                  <select
                    id="view_mode"
                    .value=${this._config.view_mode || "grid"}
                    @change=${(e: Event) =>
                      this._valueChanged(
                        "view_mode",
                        (e.target as HTMLSelectElement).value
                      )}
                  >
                    <option value="grid">Grid View (Icons & Status)</option>
                    <option value="list">List View (Detailed Table)</option>
                  </select>
                </div>
              `
            : ""
        }
        ${
          fields.filter
            ? html`
                <div class="form-row">
                  <label for="default_filter">Default Filter</label>
                  <select
                    id="default_filter"
                    .value=${defaultFilter}
                    @change=${(e: Event) =>
                      this._valueChanged(
                        "default_filter",
                        (e.target as HTMLSelectElement).value
                      )}
                  >
                    <option value="all" ?selected=${defaultFilter === "all"}>
                      All
                    </option>
                    <option value="running" ?selected=${defaultFilter === "running"}>
                      Running
                    </option>
                    ${fields.updates ? html`<option value="paused" ?selected=${defaultFilter === "paused"}>Paused</option>` : nothing}
                    <option value="stopped" ?selected=${defaultFilter === "stopped"}>
                      Stopped
                    </option>
                    ${
                      fields.updates
                        ? html`<option
                            value="updates"
                            ?selected=${defaultFilter === "updates"}
                          >
                            Updates
                          </option>`
                        : ""
                    }
                  </select>
                </div>
              `
            : ""
        }
        ${
          fields.systemInfo
            ? html` <label class="checkbox-row">
                <input
                  type="checkbox"
                  .checked=${this._config.show_system_info !== false}
                  @change=${(e: Event) =>
                    this._valueChanged(
                      "show_system_info",
                      (e.target as HTMLInputElement).checked
                    )}
                />
                <span>Show System Details</span>
              </label>`
            : ""
        }
      </div>
    `;
  }
}

export class UnraidServerCardEditor extends UnraidCardEditor {}
export class UnraidStorageCardEditor extends UnraidCardEditor {}
export class UnraidSharesCardEditor extends UnraidCardEditor {}
export class UnraidNetworkCardEditor extends UnraidCardEditor {}
export class UnraidDockerCardEditor extends UnraidCardEditor {}
export class UnraidUpsCardEditor extends UnraidCardEditor {}
export class UnraidVmCardEditor extends UnraidCardEditor {}
export class UnraidDashboardCardEditor extends UnraidCardEditor {}
