import { html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { VM_CARD_TAG, VM_EDITOR_TAG } from "./config";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidVmCardEditor } from "./dashboard-cards-editor";
import { iconTemplate, mdiMonitor, mdiPower, mdiRestart } from "./icons";
import { registerDashboardCard } from "./register-dashboard-card";

interface VmItem {
  id: string;
  name: string;
  rawName: string;
  isRunning: boolean;
  isStopped: boolean;
  status: string;
  switchEntityId: string;
  rebootEntityId?: string;
}

function extractEntityVmSlug(entityId: string): string {
  const objectId = entityId.split(".")[1] || "";
  return (
    objectId
      .replace(/^.*?_vm_reboot_/, "")
      .replace(/^vm_reboot_/, "")
      .replace(/^.*?_virtual_machine_status_/, "")
      .replace(/^virtual_machine_status_/, "")
      .replace(/^.*?_virtual_machine_/, "")
      .replace(/^virtual_machine_/, "")
      .replace(/_status$/, "")
      .replace(/_virtual_machine$/, "") || objectId
  );
}

export class UnraidVmCard extends BaseUnraidCard {
  static override editorTag = VM_EDITOR_TAG;

  static override properties = {
    ...BaseUnraidCard.properties,
    _filter: { state: true },
  };

  declare _filter: "all" | "running" | "stopped";

  constructor() {
    super();
    this._filter = "all";
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("config")) {
      const previous = changedProperties.get("config") as
        { default_filter?: string } | undefined;
      if (previous?.default_filter !== this.config.default_filter) {
        const filter = this.config.default_filter;
        this._filter = filter === "running" || filter === "stopped" ? filter : "all";
      }
    }
  }

  private handleToggle(entityId: string, isRunning: boolean, name: string): void {
    if (isRunning) {
      if (!confirm(`Are you sure you want to shut down virtual machine "${name}"?`)) {
        return;
      }
    }
    this.toggleEntity(entityId);
  }

  private getVms(): VmItem[] {
    const switches = this.getEntities("virtual_machine", "switch");
    const statuses = this.getEntities("virtual_machine_status", "sensor");
    const reboots = this.getEntities("vm_reboot", "button");

    const list: VmItem[] = [];

    for (const sw of switches) {
      const slug = extractEntityVmSlug(sw.entity_id);
      const label = this.getWorkloadLabel(sw, "vm_name", slug, this.config.vm_labels);
      const isRunning = sw.state === "on";
      const isStopped = sw.state === "off";

      const statusEntity = statuses.find(
        (s) => extractEntityVmSlug(s.entity_id) === slug
      );
      const status = statusEntity
        ? this.formatState(statusEntity)
        : isRunning
          ? "Running"
          : isStopped
            ? "Stopped"
            : this.formatState(sw);
      const reboot = reboots.find((r) => extractEntityVmSlug(r.entity_id) === slug);

      list.push({
        id: slug,
        ...label,
        isRunning,
        isStopped,
        status,
        switchEntityId: sw.entity_id,
        rebootEntityId: reboot?.entity_id,
      });
    }

    return list.sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  protected override render(): TemplateResult {
    const vms = this.getVms();
    const runningCount = vms.filter((v) => v.isRunning).length;
    const stoppedCount = vms.filter((v) => v.isStopped).length;
    const filtered = vms.filter((vm) =>
      this._filter === "running"
        ? vm.isRunning
        : this._filter === "stopped"
          ? vm.isStopped
          : true
    );

    const badge = html`
      <span class="badge ${runningCount > 0 ? "badge-online" : "badge-standby"}">
        ${runningCount} Running
      </span>
    `;

    return html`
      <ha-card>
        ${this.renderHeader(
          this.config.title || "Virtual Machines",
          `${runningCount} running of ${vms.length} VMs`,
          mdiMonitor,
          badge
        )}

        <div class="tab-strip" role="group" aria-label="Virtual machine status filter">
          <button
            type="button"
            class="tab-btn ${this._filter === "all" ? "active" : ""}"
            aria-pressed=${this._filter === "all"}
            @click=${() => (this._filter = "all")}
          >
            All (${vms.length})
          </button>
          <button
            type="button"
            class="tab-btn ${this._filter === "running" ? "active" : ""}"
            aria-pressed=${this._filter === "running"}
            @click=${() => (this._filter = "running")}
          >
            Running (${runningCount})
          </button>
          <button
            type="button"
            class="tab-btn ${this._filter === "stopped" ? "active" : ""}"
            aria-pressed=${this._filter === "stopped"}
            @click=${() => (this._filter = "stopped")}
          >
            Stopped (${stoppedCount})
          </button>
        </div>

        <div class="item-list">
          ${
            filtered.length > 0
              ? filtered.map(
                  (v) => html`
                    <div class="list-row">
                      <div class="row-left">
                        <button
                          type="button"
                          class="workload-name-button"
                          title="${v.rawName}"
                          aria-label="Show details for ${v.name}, ${v.status}"
                          @click=${() => this.openMoreInfo(v.switchEntityId)}
                        >
                          <span
                            aria-hidden="true"
                            class="status-dot ${v.isRunning ? "online" : "offline"}"
                          ></span>
                          <span class="workload-label">
                            <span class="vm-name" title="${v.rawName}">${v.name}</span>
                            <span class="workload-status">${v.status}</span>
                          </span>
                        </button>
                      </div>
                      <div class="row-right">
                        ${
                          v.rebootEntityId
                            ? html`
                                <button
                                  type="button"
                                  class="btn"
                                  style="padding: 3px 8px;"
                                  title="Reboot ${v.name}"
                                  aria-label="Reboot ${v.name}"
                                  ?disabled=${!v.isRunning}
                                  @click=${() => this.pressButton(v.rebootEntityId!)}
                                >
                                  ${iconTemplate(mdiRestart, 13)}
                                  <span>Reboot</span>
                                </button>
                              `
                            : nothing
                        }
                        <button
                          type="button"
                          class="btn ${v.isRunning ? "btn" : "btn-primary"}"
                          style="padding: 3px 8px;"
                          aria-label="${v.isRunning ? "Stop" : "Start"} ${v.name}"
                          ?disabled=${!v.isRunning && !v.isStopped}
                          @click=${() => this.handleToggle(v.switchEntityId, v.isRunning, v.name)}
                        >
                          ${iconTemplate(mdiPower, 13)}
                          <span>${v.isRunning ? "Stop" : "Start"}</span>
                        </button>
                      </div>
                    </div>
                  `
                )
              : html`<div class="empty-state" role="status">
                  ${vms.length === 0 ? "No virtual machines configured" : `No ${this._filter} virtual machines`}
                </div>`
          }
        </div>
      </ha-card>
    `;
  }
}

registerDashboardCard({
  tag: VM_CARD_TAG,
  editorTag: VM_EDITOR_TAG,
  card: UnraidVmCard,
  editor: UnraidVmCardEditor,
  name: "Unraid Virtual Machines Card",
  description: "Monitor and manage Unraid virtual machines.",
});
