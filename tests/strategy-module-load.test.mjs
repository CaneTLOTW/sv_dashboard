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


test("charge limit controls use explicit domain-safe actions and preserve slider", async () => {
  const { chargeLimitCards } = await import("../custom_components/sv_dashboard/static/sv_dashboard.js");
  const strings = {chargeLimit:"Limit",chargeLimitEnabled:"Enabled"};
  const cards=chargeLimitCards({battery_charging_limit_number:"number.limit",battery_charging_limit_switch:"switch.limit",battery_charging_limit:"switch.limit"},strings,true);
  assert.equal(cards.length,2);
  assert.equal(cards[0].button_type,"slider");
  assert.equal(cards[0].tap_action.action,"more-info");
  assert.equal(cards[0].button_action.tap_action.action,"more-info");
  assert.equal(cards[1].entity,"switch.limit");
  assert.equal(cards[1].button_action.tap_action.action,"toggle");
  assert.deepEqual(chargeLimitCards({battery_charging_limit:"number.limit"},strings,true),[cards[0]]);
  assert.deepEqual(chargeLimitCards({battery_charging_limit:"switch.limit"},strings,true),[cards[1]]);
  assert.deepEqual(chargeLimitCards({battery_charging_limit_number:"switch.bad",battery_charging_limit_switch:"number.bad"},strings,true),[]);
  assert.deepEqual(chargeLimitCards({battery_charging_limit:"number.limit"},strings,false),[]);
});

test("registered Strategy returns a diagnostic setup view after failed card import", async () => {
  const Strategy = registry.get("ll-strategy-dashboard-sv-dashboard");
  assert.equal(typeof Strategy,"function");
  window.__svDashboardPackageReadiness=Promise.resolve(["charge-history-card.js"]);
  try {
    const result=await Strategy.generateDashboard({hass:{language:"en",states:{}},config:{}});
    assert.equal(result.views[0].path,"setup");
    assert.match(JSON.stringify(result),/charge-history-card\.js/);
    assert.match(JSON.stringify(result),/SV modules could not load/);
  } finally { delete window.__svDashboardPackageReadiness; }
});
