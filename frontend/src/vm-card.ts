import { html, nothing, type PropertyValues, type TemplateResult } from "lit";
import {
  VM_CARD_TAG,
  VM_EDITOR_TAG,
} from "./config";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidVmCardEditor } from "./dashboard-cards-editor";
import {
  iconTemplate,
  mdiMonitor,
  mdiPower,
  mdiRestart,
} from "./icons";
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
        | { default_filter?: string }
        | undefined;
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
      const label = this.getWorkloadLabel(
        sw, "vm_name", slug, this.config.vm_labels
      );
      const isRunning = sw.state === "on";
      const isStopped = sw.state === "off";

      const status =
        statuses.find((s) => extractEntityVmSlug(s.entity_id) === slug)?.state ||
        (isRunning ? "running" : isStopped ? "shut off" : sw.state);
      const reboot = reboots.find(
        (r) => extractEntityVmSlug(r.entity_id) === slug
      );

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
      this._filter === "running" ? vm.isRunning :
        this._filter === "stopped" ? vm.isStopped : true
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

        <div style="display: flex; gap: 4px; overflow-x: auto;">
          <button
            class="tab-btn ${this._filter === "all" ? "active" : ""}"
            @click=${() => (this._filter = "all")}
          >All (${vms.length})</button>
          <button
            class="tab-btn ${this._filter === "running" ? "active" : ""}"
            @click=${() => (this._filter = "running")}
          >Running (${runningCount})</button>
          <button
            class="tab-btn ${this._filter === "stopped" ? "active" : ""}"
            @click=${() => (this._filter = "stopped")}
          >Stopped (${stoppedCount})</button>
        </div>

        <div class="item-list">
          ${filtered.length > 0
            ? filtered.map(
                (v) => html`
                  <div class="list-row">
                    <div class="row-left">
                      <span class="status-dot ${v.isRunning ? "online" : "offline"}"></span>
                      <div style="display: flex; flex-direction: column; min-width: 0;">
                        <span class="vm-name" title="${v.rawName}">${v.name}</span>
                        <span style="font-size: 0.7rem; color: var(--unraid-subtext); text-transform: capitalize;">
                          ${v.status}
                        </span>
                      </div>
                    </div>
                    <div class="row-right">
                      ${v.rebootEntityId
                        ? html`
                            <button
                              class="btn"
                              style="padding: 3px 8px;"
                              title="Reboot VM"
                              @click=${() => this.pressButton(v.rebootEntityId!)}
                            >
                              ${iconTemplate(mdiRestart, 13)}
                              <span>Reboot</span>
                            </button>
                          `
                        : nothing}
                      <button
                        class="btn ${v.isRunning ? "btn" : "btn-primary"}"
                        style="padding: 3px 8px;"
                        @click=${() => this.handleToggle(v.switchEntityId, v.isRunning, v.name)}
                      >
                        ${iconTemplate(mdiPower, 13)}
                        <span>${v.isRunning ? "Stop" : "Start"}</span>
                      </button>
                    </div>
                  </div>
                `
              )
            : html`<div style="text-align: center; color: var(--unraid-subtext); font-size: 0.8rem; padding: 12px;">${vms.length === 0 ? "No virtual machines configured" : `No ${this._filter} virtual machines`}</div>`}
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
