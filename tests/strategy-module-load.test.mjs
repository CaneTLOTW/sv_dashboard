import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import test from "node:test";

class TestHTMLElement {}
const registry = new Map();

globalThis.HTMLElement = TestHTMLElement;
globalThis.customElements = {
  get(name) {
    return registry.get(name);
  },
  define(name, ctor) {
    if (registry.has(name)) throw new Error(`duplicate custom element: ${name}`);
    registry.set(name, ctor);
  },
};
globalThis.window = { customStrategies: [] };
globalThis.document = {
  createElement() {
    return {};
  },
};

test("dashboard strategy module parses and registers its Home Assistant custom element", async () => {
  const moduleUrl = pathToFileURL(
    resolve("custom_components/sv_dashboard/static/sv_dashboard.js"),
  );
  moduleUrl.searchParams.set("test", `${Date.now()}`);

  await import(moduleUrl.href);

  assert.equal(
    typeof customElements.get("ll-strategy-dashboard-sv-dashboard"),
    "function",
  );
  assert.equal(
    typeof customElements.get("sv-dashboard-strategy-editor"),
    "function",
  );
  assert.ok(
    window.customStrategies.some(
      (strategy) => strategy.type === "sv-dashboard" && strategy.strategyType === "dashboard",
    ),
  );
});
