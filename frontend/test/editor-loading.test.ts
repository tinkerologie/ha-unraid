import { afterEach, describe, expect, it } from "vitest";
import { UnraidServerCardEditor, loadHaForm } from "../src/dashboard-cards-editor";

// Its own file, so ha-form starts undefined as it does in Home Assistant.
customElements.define("unraid-server-card-editor", UnraidServerCardEditor);
describe("loading Home Assistant's form", () => {
  afterEach(() => document.body.replaceChildren());

  it("waits for ha-form, which the button card editor defines", async () => {
    const editor = new UnraidServerCardEditor();
    editor.setConfig({ type: "custom:unraid-server-card" });

    let release!: () => void;
    const ready = new Promise<void>((resolve) => (release = resolve));
    customElements.define(
      "hui-button-card",
      class extends HTMLElement {
        static async getConfigElement(): Promise<void> {
          await ready;
          customElements.define("ha-form", class extends HTMLElement {});
        }
      }
    );

    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.shadowRoot!.textContent).toContain("Loading the editor");

    release();
    await loadHaForm();
    await editor.updateComplete;
    expect(editor.shadowRoot!.querySelector("ha-form")).not.toBeNull();

    // Once defined, later editors render the form straight away.
    await expect(loadHaForm()).resolves.toBe(true);
    const next = new UnraidServerCardEditor();
    next.setConfig({ type: "custom:unraid-server-card" });
    document.body.append(next);
    await next.updateComplete;
    expect(next.shadowRoot!.querySelector("ha-form")).not.toBeNull();
  });
});
