import { describe, expect, it } from "vitest";
import { loadHaForm } from "../src/dashboard-cards-editor";

describe("loading Home Assistant's form outside Home Assistant", () => {
  it("settles without the button card and leaves ha-form undefined", async () => {
    await expect(loadHaForm()).resolves.toBeUndefined();
    expect(customElements.get("ha-form")).toBeUndefined();
  });

  it("settles when the button card editor fails to load", async () => {
    customElements.define(
      "hui-button-card",
      class extends HTMLElement {
        static async getConfigElement(): Promise<void> {
          throw new Error("chunk failed");
        }
      }
    );
    await expect(loadHaForm()).resolves.toBeUndefined();
  });
});
