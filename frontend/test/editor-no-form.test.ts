import { describe, expect, it } from "vitest";
import { UnraidVmCardEditor, loadHaForm } from "../src/dashboard-cards-editor";

customElements.define("unraid-vm-card-editor", UnraidVmCardEditor);

describe("loading Home Assistant's form outside Home Assistant", () => {
  it("settles without the button card and leaves ha-form undefined", async () => {
    await expect(loadHaForm()).resolves.toBe(false);
    expect(customElements.get("ha-form")).toBeUndefined();
  });

  it("tells the user to use the code editor when the form can't load", async () => {
    const editor = new UnraidVmCardEditor();
    editor.setConfig({ type: "custom:unraid-vm-card" });
    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.shadowRoot!.textContent).toContain("Loading the editor");
    await loadHaForm();
    await editor.updateComplete;
    expect(editor.shadowRoot!.textContent).toContain("Use the code editor");
    editor.remove();
  });

  it("retries after the button card editor fails to load", async () => {
    let attempts = 0;
    customElements.define(
      "hui-button-card",
      class extends HTMLElement {
        static async getConfigElement(): Promise<void> {
          attempts += 1;
          if (attempts === 1) throw new Error("chunk failed");
          customElements.define("ha-form", class extends HTMLElement {});
        }
      }
    );
    await expect(loadHaForm()).resolves.toBe(false);
    await expect(loadHaForm()).resolves.toBe(true);
    expect(attempts).toBe(2);
  });
});
