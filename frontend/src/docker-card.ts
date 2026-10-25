import { html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { DOCKER_CARD_TAG, DOCKER_EDITOR_TAG } from "./config";
import { BaseUnraidCard } from "./dashboard-cards-base";
import { UnraidDockerCardEditor } from "./dashboard-cards-editor";
import {
  iconTemplate,
  mdiAlertCircle,
  mdiDocker,
  mdiPause,
  mdiPlay,
  mdiPower,
  mdiRestart,
  mdiViewGrid,
  mdiViewList,
} from "./icons";
import type { HassEntity } from "./ha-types";
import { registerDashboardCard } from "./register-dashboard-card";

interface ContainerItem {
  id: string;
  name: string;
  rawName: string;
  isRunning: boolean;
  isPaused: boolean;
  pause?: HassEntity;
  unpause?: HassEntity;
  isStopped: boolean;
  isAvailable: boolean;
  status: string;
  switchEntityId: string;
  restartEntityId?: string;
  autostartEntityId?: string;
  cpuPct?: number;
  cpuText?: string;
  memoryUsage?: string;
  hasUpdate?: boolean;
  updateEntityId?: string;
}

function extractEntityContainerSlug(entityId: string): string {
  const objectId = entityId.split(".")[1] || "";
  return (
    objectId
      .replace(/^.*?_container_restart_/, "")
      .replace(/^.*?_docker_container_restart_/, "")
      .replace(/^.*?_container_autostart_/, "")
      .replace(/^.*?_docker_container_autostart_/, "")
      .replace(/^.*?_container_update_/, "")
      .replace(/^.*?_docker_container_update_/, "")
      .replace(/^.*?_docker_container_/, "")
      .replace(/^.*?_container_switch_/, "")
      .replace(/^docker_container_/, "")
      .replace(/^container_switch_/, "")
      .replace(/_cpu$/, "")
      .replace(/_memory_usage$/, "")
      .replace(/_memory$/, "")
      .replace(/_docker_container$/, "")
      .replace(/_container_switch$/, "")
      .replace(/^.*?_container_/, "") || objectId
  );
}

export class UnraidDockerCard extends BaseUnraidCard {
  static override editorTag = DOCKER_EDITOR_TAG;

  static override properties = {
    ...BaseUnraidCard.properties,
    _filter: { state: true },
    _viewMode: { state: true },
  };

  declare _filter: "all" | "running" | "paused" | "stopped" | "updates";
  declare _viewMode: "grid" | "list";

  constructor() {
    super();
    this._filter = "all";
    this._viewMode = "grid";
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("config") && this.config.view_mode) {
      const previous = changedProperties.get("config") as
        { view_mode?: "grid" | "list" } | undefined;
      if (previous?.view_mode !== this.config.view_mode) {
        this._viewMode = this.config.view_mode;
      }
    }
    if (changedProperties.has("config")) {
      const previous = changedProperties.get("config") as
        { default_filter?: string } | undefined;
      if (previous?.default_filter !== this.config.default_filter) {
        const filter = this.config.default_filter;
        this._filter =
          filter && ["all", "running", "paused", "stopped", "updates"].includes(filter)
            ? filter
            : "all";
      }
    }
  }

  private handleToggle(entityId: string, isRunning: boolean, name: string): void {
    if (isRunning) {
      if (!confirm(`Are you sure you want to stop container "${name}"?`)) {
        return;
      }
    }
    this.toggleEntity(entityId);
  }

  private renderPauseControl(c: ContainerItem, mode: "grid" | "list") {
    const action = c.isPaused ? c.unpause : c.isRunning ? c.pause : undefined;
    if (!action) return nothing;
    const resume = c.isPaused;
    const label = `${resume ? "Resume" : "Pause"} ${c.name}`;
    return html`
      <button
        type="button"
        class=${mode === "grid" ? "btn-icon" : "btn"}
        title=${label}
        aria-label=${label}
        ?disabled=${!c.isAvailable || action.state === "unavailable"}
        @click=${async (event: Event) => {
          event.stopPropagation();
          if (!resume && !confirm(`Are you sure you want to pause container "${c.name}"?`)) return;
          await this.pressButton(action.entity_id);
        }}
      >
        ${iconTemplate(resume ? mdiPlay : mdiPause, mode === "grid" ? 20 : 13)}
        ${mode === "list" ? html`<span>${resume ? "Resume" : "Pause"}</span>` : nothing}
      </button>
    `;
  }

  private getContainers(): ContainerItem[] {
    const autostarts = this.getEntities("docker_container_autostart", "switch");
    const autostartIds = new Set(autostarts.map((a) => a.entity_id));
    const switches = this.getEntities("docker_container", "switch").filter(
      (s) => !autostartIds.has(s.entity_id)
    );
    const restarts = this.getEntities("docker_container_restart", "button");
    const pauses = this.getEntities("docker_container_pause", "button");
    const unpauses = this.getEntities("docker_container_unpause", "button");
    const cpus = this.getEntities("container_cpu");
    const mems = this.getEntities("container_memory_usage");
    const updates = this.getEntities("docker_container_update", "update");

    const list: ContainerItem[] = [];

    for (const sw of switches) {
      const slug = extractEntityContainerSlug(sw.entity_id);
      const label = this.getWorkloadLabel(
        sw,
        "container_name",
        slug,
        this.config.container_labels
      );
      const isAvailable = sw.state === "on" || sw.state === "off";
      const reported = sw.attributes.status;
      const isPaused = isAvailable && typeof reported === "string" && reported.toLowerCase() === "paused";
      const isRunning = !isPaused && sw.state === "on";
      const isStopped = !isPaused && sw.state === "off";

      const restart = restarts.find(
        (r) => extractEntityContainerSlug(r.entity_id) === slug
      );
      const autostart = autostarts.find(
        (a) => extractEntityContainerSlug(a.entity_id) === slug
      );
      const cpu = cpus.find((c) => extractEntityContainerSlug(c.entity_id) === slug);
      const mem = mems.find((m) => extractEntityContainerSlug(m.entity_id) === slug);
      const update = updates.find(
        (u) => extractEntityContainerSlug(u.entity_id) === slug
      );

      list.push({
        id: slug,
        ...label,
        isRunning,
        isPaused,
        isStopped,
        isAvailable,
        pause: pauses.find((entity) => entity.attributes.container_name === sw.attributes.container_name && typeof sw.attributes.container_name === "string"),
        unpause: unpauses.find((entity) => entity.attributes.container_name === sw.attributes.container_name && typeof sw.attributes.container_name === "string"),
        status: isPaused ? "Paused" : isRunning ? "Running" : isStopped ? "Stopped" : this.formatState(sw),
        switchEntityId: sw.entity_id,
        restartEntityId: restart?.entity_id,
        autostartEntityId: autostart?.entity_id,
        cpuPct:
          cpu?.state && Number.isFinite(parseFloat(cpu.state))
            ? parseFloat(cpu.state)
            : undefined,
        cpuText:
          cpu && Number.isFinite(Number(cpu.state))
            ? (this.hass?.formatEntityState?.(cpu) ?? `${cpu.state}%`)
            : undefined,
        memoryUsage:
          mem && !["unknown", "unavailable"].includes(mem.state)
            ? (this.hass?.formatEntityState?.(mem) ??
              `${mem.state}${mem.attributes.unit_of_measurement ? ` ${mem.attributes.unit_of_measurement}` : ""}`)
            : undefined,
        hasUpdate: update?.state === "on",
        updateEntityId: update?.entity_id,
      });
    }

    return list.sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      if (a.isPaused !== b.isPaused) return a.isPaused ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  protected override render(): TemplateResult {
    const containers = this.getContainers();
    const runningCount = containers.filter((c) => c.isRunning).length;
    const stoppedCount = containers.filter((c) => c.isStopped).length;
    const pausedCount = containers.filter((c) => c.isPaused).length;
    const updateCount = containers.filter((c) => c.hasUpdate).length;

    const checkUpdatesBtn = this.getEntity("check_container_updates", "button");

    const filtered = containers.filter((c) => {
      if (this._filter === "running") return c.isRunning;
      if (this._filter === "stopped") return c.isStopped;
      if (this._filter === "paused") return c.isPaused;
      if (this._filter === "updates") return c.hasUpdate;
      return true;
    });

    const badge = html`
      <span class="badge ${runningCount > 0 ? "badge-online" : "badge-standby"}">
        ${runningCount} Running
      </span>
      ${
        updateCount > 0
          ? html`
              <span class="badge badge-warning">
                ${iconTemplate(mdiAlertCircle, 12)}
                <span>${updateCount} Updates</span>
              </span>
            `
          : nothing
      }
    `;

    return html`
      <ha-card>
        ${this.renderHeader(
          this.config.title || "Docker Containers",
          `${runningCount} running • ${pausedCount} paused • ${stoppedCount} stopped`,
          mdiDocker,
          badge
        )}
        <div
          style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;"
        >
          <div class="tab-strip" role="group" aria-label="Container status filter">
            <button
              type="button"
              class="tab-btn ${this._filter === "all" ? "active" : ""}"
              aria-pressed=${this._filter === "all"}
              @click=${() => (this._filter = "all")}
            >
              All (${containers.length})
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
              class="tab-btn ${this._filter === "paused" ? "active" : ""}"
              aria-pressed=${this._filter === "paused"}
              @click=${() => (this._filter = "paused")}
            >
              Paused (${pausedCount})
            </button>
            <button
              type="button"
              class="tab-btn ${this._filter === "stopped" ? "active" : ""}"
              aria-pressed=${this._filter === "stopped"}
              @click=${() => (this._filter = "stopped")}
            >
              Stopped (${stoppedCount})
            </button>
            ${
              updateCount > 0 || this._filter === "updates"
                ? html`
                    <button
                      type="button"
                      class="tab-btn ${this._filter === "updates" ? "active" : ""}"
                      aria-pressed=${this._filter === "updates"}
                      @click=${() => (this._filter = "updates")}
                    >
                      Updates (${updateCount})
                    </button>
                  `
                : nothing
            }
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${
              checkUpdatesBtn
                ? html`
                    <button
                      type="button"
                      class="btn"
                      title="Check for updates"
                      @click=${() => this.pressButton(checkUpdatesBtn.entity_id)}
                    >
                      Check Updates
                    </button>
                  `
                : nothing
            }
            <button
              type="button"
              class="btn-icon"
              title="Toggle View Mode"
              aria-label="${this._viewMode === "grid" ? "Show list view" : "Show grid view"}"
              @click=${() =>
                (this._viewMode = this._viewMode === "grid" ? "list" : "grid")}
            >
              ${iconTemplate(this._viewMode === "grid" ? mdiViewList : mdiViewGrid, 18)}
            </button>
          </div>
        </div>
        ${
          filtered.length === 0
            ? html`<div class="empty-state" role="status">
                ${
                  containers.length === 0
                    ? "No Docker containers configured"
                    : this._filter === "updates"
                      ? "No container updates available"
                      : `No ${this._filter} containers`
                }
              </div>`
            : nothing
        }
        ${
          this._viewMode === "grid"
            ? html`
                <div class="container-grid">
                  ${filtered.map(
                    (c) => html`
                      <div class="container-tile">
                        <button
                          type="button"
                          class="tile-main"
                          title="${c.rawName}"
                          aria-label="Show details for ${c.name}, ${c.status}"
                          @click=${() => this.openMoreInfo(c.switchEntityId)}
                        >
                          <span
                            aria-hidden="true"
                            class="status-dot ${c.isRunning ? "online" : c.isPaused ? "paused" : "offline"}"
                          ></span>
                          <span class="workload-label">
                            <span class="tile-name" title="${c.rawName}"
                              >${c.name}</span
                            >
                            <span class="workload-status">${c.status}</span>
                          </span>
                        </button>
                        <div style="display: flex; align-items: center; gap: 4px;">
                          ${
                            c.hasUpdate
                              ? html`<span style="color: var(--unraid-warning);"
                                  >${iconTemplate(mdiAlertCircle, 20)}</span
                                >`
                              : nothing
                          }
                          ${this.renderPauseControl(c, "grid")}
                          ${
                            c.restartEntityId
                              ? html`
                                  <button
                                    type="button"
                                    class="btn-icon"
                                    style="padding: 2px;"
                                    title="Restart ${c.name}"
                                    aria-label="Restart ${c.name}"
                                    ?disabled=${!c.isAvailable || c.isPaused}
                                    @click=${(e: Event) => {
                                      e.stopPropagation();
                                      this.pressButton(c.restartEntityId!);
                                    }}
                                  >
                                    ${iconTemplate(mdiRestart, 20)}
                                  </button>
                                `
                              : nothing
                          }
                          <button
                            type="button"
                            class="btn-icon"
                            style="padding: 4px;"
                            title="${c.isRunning || c.isPaused ? "Stop" : "Start"} ${c.name}"
                            aria-label="${c.isRunning || c.isPaused ? "Stop" : "Start"} ${c.name}"
                            ?disabled=${!c.isAvailable}
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              this.handleToggle(c.switchEntityId, c.isRunning || c.isPaused, c.name);
                            }}
                          >
                            ${iconTemplate(mdiPower, 20)}
                          </button>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : html`
                <div class="item-list">
                  ${filtered.map(
                    (c) => html`
                      <div class="list-row">
                        <div class="row-left">
                          <button
                            type="button"
                            class="workload-name-button"
                            title="${c.rawName}"
                            aria-label="Show details for ${c.name}, ${c.status}"
                            @click=${() => this.openMoreInfo(c.switchEntityId)}
                          >
                            <span
                              aria-hidden="true"
                              class="status-dot ${c.isRunning ? "online" : c.isPaused ? "paused" : "offline"}"
                            ></span>
                            <span class="workload-label">
                              <span class="tile-name" title="${c.rawName}"
                                >${c.name}</span
                              >
                              <span class="workload-status">${c.status}</span>
                            </span>
                          </button>
                          ${
                            c.cpuPct !== undefined
                              ? html`<span
                                  style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                                  >${c.cpuText} CPU</span
                                >`
                              : nothing
                          }
                          ${
                            c.memoryUsage
                              ? html`<span
                                  style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                                  >${c.memoryUsage}</span
                                >`
                              : nothing
                          }
                        </div>
                        <div class="row-right">
                          ${
                            c.hasUpdate
                              ? html`
                                  <span class="badge badge-warning"
                                    >Update Available</span
                                  >
                                `
                              : nothing
                          }
                          ${this.renderPauseControl(c, "list")}
                          ${
                            c.restartEntityId
                              ? html`
                                  <button
                                    type="button"
                                    class="btn"
                                    style="padding: 3px 8px;"
                                    aria-label="Restart ${c.name}"
                                    ?disabled=${!c.isAvailable || c.isPaused}
                                    @click=${() => this.pressButton(c.restartEntityId!)}
                                  >
                                    ${iconTemplate(mdiRestart, 13)}
                                    <span>Restart</span>
                                  </button>
                                `
                              : nothing
                          }
                          <button
                            type="button"
                            class="btn ${c.isRunning || c.isPaused ? "btn" : "btn-primary"}"
                            style="padding: 3px 8px;"
                            aria-label="${c.isRunning || c.isPaused ? "Stop" : "Start"} ${c.name}"
                            ?disabled=${!c.isAvailable}
                            @click=${() => this.handleToggle(c.switchEntityId, c.isRunning || c.isPaused, c.name)}
                          >
                            ${iconTemplate(mdiPower, 13)}
                            <span>${c.isRunning || c.isPaused ? "Stop" : "Start"}</span>
                          </button>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
        }
      </ha-card>
    `;
  }
}

registerDashboardCard({
  tag: DOCKER_CARD_TAG,
  editorTag: DOCKER_EDITOR_TAG,
  card: UnraidDockerCard,
  editor: UnraidDockerCardEditor,
  name: "Unraid Docker Containers Card",
  description:
    "Monitor, start, pause, resume, stop, restart, and update Docker containers in grid or list view.",
});
