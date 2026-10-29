import { LitElement, css, html, type TemplateResult } from "lit";
import { type CardConfig } from "./config";
import { fireEvent, type HomeAssistant } from "./ha-types";

interface CardFields {
  systemInfo?: boolean;
  viewMode?: boolean;
  filter?: boolean;
  /** Docker workloads can also be paused or have an update. */
  updates?: boolean;
}

const fieldsByType: Record<string, CardFields> = {
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

/** One field of Home Assistant's `ha-form` schema. */
export interface FormSchema {
  name: string;
  selector: Record<string, unknown>;
}

const LABELS: Record<string, string> = {
  server: "Unraid server",
  title: "Title",
  view_mode: "Default view",
  default_filter: "Default filter",
  show_system_info: "Show system details",
};

const HELPERS: Record<string, string> = {
  server: "Leave empty to use the first Unraid server.",
  title: "Leave empty for the default title.",
};

// The card shows these until the user picks something else.
const DEFAULTS: Partial<CardConfig> = {
  view_mode: "grid",
  default_filter: "all",
  show_system_info: true,
};

// Home Assistant device registry IDs.
const DEVICE_ID = /^[0-9a-f]{32}$/;

function filterOptions(fields: CardFields): string[] {
  return fields.updates
    ? ["all", "running", "paused", "stopped", "updates"]
    : ["all", "running", "stopped"];
}

const FILTER_LABELS: Record<string, string> = {
  all: "All",
  running: "Running",
  paused: "Paused",
  stopped: "Stopped",
  updates: "Updates",
};

/** Return the form schema for a card type, with only the fields it uses. */
export function cardFormSchema(type: string): FormSchema[] {
  const fields = fieldsByType[type] ?? {};
  const schema: FormSchema[] = [
    { name: "server", selector: { device: { filter: { integration: "unraid" } } } },
    { name: "title", selector: { text: {} } },
  ];
  if (fields.viewMode) {
    schema.push({
      name: "view_mode",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "grid", label: "Grid (icons and status)" },
            { value: "list", label: "List (detailed table)" },
          ],
        },
      },
    });
  }
  if (fields.filter) {
    schema.push({
      name: "default_filter",
      selector: {
        select: {
          mode: "dropdown",
          options: filterOptions(fields).map((value) => ({
            value,
            label: FILTER_LABELS[value],
          })),
        },
      },
    });
  }
  if (fields.systemInfo) {
    schema.push({ name: "show_system_info", selector: { boolean: {} } });
  }
  return schema;
}

/**
 * Throw when the form cannot show a config faithfully.
 *
 * Home Assistant then switches to the YAML editor instead of letting the form
 * drop or rewrite the value: a server given by name (YAML accepts names, the
 * device picker only IDs), or an option value this card doesn't offer.
 */
export function assertCardConfig(config: CardConfig): void {
  const fields = fieldsByType[config.type] ?? {};
  const { server, title, view_mode, default_filter, show_system_info } = config;
  if (server !== undefined && (typeof server !== "string" || !DEVICE_ID.test(server))) {
    throw new Error("'server' names the server; edit this card in YAML.");
  }
  if (title !== undefined && typeof title !== "string") {
    throw new Error("'title' must be text.");
  }
  // Options this card's form doesn't show are kept as they are.
  if (fields.viewMode && view_mode !== undefined && !["grid", "list"].includes(view_mode)) {
    throw new Error(`'view_mode: ${String(view_mode)}' is not supported here.`);
  }
  if (
    fields.filter &&
    default_filter !== undefined &&
    !filterOptions(fields).includes(default_filter)
  ) {
    throw new Error(`'default_filter: ${String(default_filter)}' is not supported here.`);
  }
  if (
    fields.systemInfo &&
    show_system_info !== undefined &&
    typeof show_system_info !== "boolean"
  ) {
    throw new Error("'show_system_info' must be true or false.");
  }
}

let haFormLoading: Promise<void> | undefined;


/**
 * Make sure Home Assistant's `ha-form` is defined.
 *
 * Home Assistant loads it lazily. The always-loaded button card's editor
 * imports it, so asking for that editor loads it (the approach community
 * cards such as Mushroom use).
 */
export async function loadHaForm(): Promise<boolean> {
  if (customElements.get("ha-form")) return true;
  haFormLoading ??= (async () => {
    const buttonCard = customElements.get("hui-button-card") as
      | (CustomElementConstructor & { getConfigElement?: () => Promise<unknown> })
      | undefined;
    await buttonCard?.getConfigElement?.();
  })()
    .catch(() => undefined)
    .finally(() => {
      // A failed attempt (e.g. a dropped connection) is retried next time.
      if (!customElements.get("ha-form")) haFormLoading = undefined;
    });
  await haFormLoading;
  return Boolean(customElements.get("ha-form"));
}

export class UnraidCardEditor extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
    _formState: { state: true },
  };

  declare hass?: HomeAssistant;
  declare _config?: CardConfig;
  declare _formState: "loading" | "ready" | "failed";
  /** What the form showed: the config plus the defaults the card applies. */
  private _shown: Record<string, unknown> = {};

  static override styles = css`
    .unavailable {
      margin: 0;
      color: var(--secondary-text-color);
    }
  `;

  constructor() {
    super();
    this._formState = customElements.get("ha-form") ? "ready" : "loading";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this._formState !== "ready") {
      this._formState = "loading";
      void loadHaForm().then((loaded) => {
        this._formState = loaded ? "ready" : "failed";
      });
    }
  }

  setConfig(config: CardConfig): void {
    assertCardConfig(config);
    this._config = { ...config };
  }

  private _valueChanged(ev: CustomEvent<{ value: Record<string, unknown> }>): void {
    ev.stopPropagation();
    if (!this._config) return;
    const config: Record<string, unknown> = { ...this._config };
    // ha-form reports all its data; keep only what the user changed, so the
    // defaults it was shown never end up in the card's YAML.
    for (const [key, value] of Object.entries(ev.detail.value)) {
      if (value === this._shown[key]) continue;
      if (value === "" || value === null || value === undefined) {
        delete config[key]; // an emptied field goes back to the card's default
      } else {
        config[key] = value;
      }
    }
    this._config = config as unknown as CardConfig;
    fireEvent(this, "config-changed", { config: this._config });
  }

  private readonly _computeLabel = (schema: FormSchema): string =>
    LABELS[schema.name] ?? schema.name;

  private readonly _computeHelper = (schema: FormSchema): string | undefined =>
    HELPERS[schema.name];

  protected override render(): TemplateResult {
    if (!this._config) return html``;
    if (this._formState !== "ready") {
      return html`<p class="unavailable">
        ${this._formState === "loading"
          ? "Loading the editor…"
          : "The visual editor could not load. Use the code editor, or reopen this card's editor to try again."}
      </p>`;
    }
    const schema = cardFormSchema(this._config.type);
    const data: Record<string, unknown> = { ...this._config };
    for (const { name } of schema) {
      if (data[name] === undefined && name in DEFAULTS) {
        data[name] = DEFAULTS[name];
      }
    }
    this._shown = data;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
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
