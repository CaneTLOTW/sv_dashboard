import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const overview = fs.readFileSync("custom_components/sv_dashboard/static/vehicle-overview-card.js", "utf8");
const frontend = fs.readFileSync("custom_components/sv_dashboard/static/frontend.js", "utf8");
const strategy = fs.readFileSync("custom_components/sv_dashboard/static/sv_dashboard.js", "utf8");
const harness = fs.readFileSync("dev/owner_test_harness/owner-test-harness-card.js", "utf8");
const installer = fs.readFileSync("dev/owner_test_harness/install.py", "utf8");

test("normal EV Hero keeps the production 15 minute temperature freshness contract", () => {
  assert.match(overview, /FRESH_VEHICLE_DATA_MS = 15 \* 60 \* 1000/);
  assert.match(overview, /attributes\["Last updated"\]/);
  assert.match(overview, /attributes\.updatedAt/);
  assert.match(overview, /age <=/);
  assert.match(overview, /color-mix\(in srgb, var\(--primary-color\) 14%/);
});

test("owner fixture stays outside production frontend and Strategy", () => {
  assert.doesNotMatch(frontend, /owner-test-harness|sv_owner_fixture|OwnerHarness/);
  assert.doesNotMatch(strategy, /owner-test-harness|sv_owner_fixture|OwnerHarness/);
});

test("owner fixture provides whole-dashboard Dual-Energy capability and synthetic metrics", () => {
  assert.match(harness, /const CONTEXT_TAG = "sv-dashboard-owner-test-context-card"/);
  assert.match(harness, /function fixtureHass\(/);
  assert.match(harness, /powertrain: "hybrid"/);
  assert.match(harness, /electric_energy: true/);
  assert.match(harness, /electric_trip_metrics: true/);
  assert.match(harness, /fuel: true/);
  assert.match(harness, /fuel_metrics: true/);
  assert.match(harness, /remaining_fuel_liters/);
  assert.match(harness, /trailing_fuel_consumption_500km/);
  assert.match(harness, /owner_test_fixture: profile/);
});

test("owner fixture provides Hybrid Trip History and Fuel History dummy data", () => {
  assert.match(harness, /owner-fixture-mixed/);
  assert.match(harness, /owner-fixture-electric/);
  assert.match(harness, /fuel_consumption_l_100km: 5\.0/);
  assert.match(harness, /energy_per_100_km: 12\.9/);
  assert.match(harness, /trip_columns: tripColumns/);
  assert.match(harness, /trip_rows: trips\.map/);
  assert.match(harness, /fuel_history/);
  assert.match(harness, /fuelHistoryFixture\(\)/);
  assert.match(harness, /fuel_before_percent/);
});

test("owner harness exposes deterministic fresh, stale, idle, driving and charging profiles", () => {
  for (const profile of ["phev-fresh", "phev-idle", "phev-driving", "phev-charging", "phev-stale"]) {
    assert.match(harness, new RegExp(profile));
  }
  assert.match(harness, /forceFresh = profile === "phev-fresh"/);
  assert.match(harness, /stale \? agoIso\(60\) : nowIso\(\)/);
  assert.match(harness, /withSourceTimestamp\(hass\.states\[entityId\], stamp\)/);
  assert.match(installer, /"phev-fresh"/);
  assert.match(installer, /\?sv_owner_fixture=\{profile\}/);
});

test("whole-dashboard context is injected in the active Strategy generate path and card runtime", () => {
  assert.match(installer, /static async generate\(config, hass\)/);
  assert.match(installer, /ownerHarness\.fixtureHass\(hass, config\?\.entry_id, ownerProfile\)/);
  assert.match(installer, /ownerHarness\.decorateDashboard\(dashboard, config\?\.entry_id, ownerProfile\)/);
  assert.match(harness, /new Set\(\["vehicle", "charging", "statistics", "trips"\]\)/);
  assert.match(harness, /if \(!hybridVisualViews\.has\(view\?\.path\)\) continue/);
  assert.match(harness, /view\.cards = view\.cards\.map/);
  assert.match(harness, /section\.cards = section\.cards\.map/);
  assert.match(harness, /helpers\.createCardElement\(this\._config\.card\)/);
  assert.match(harness, /inner\.hass = fixtureHass/);
});

test("standard selector removes fixture parameter and keeps real dashboard context", () => {
  assert.match(harness, /Standard · echtes Fahrzeug/);
  assert.match(harness, /url\.searchParams\.set\(PROFILE_PARAM, profile\)/);
  assert.match(harness, /url\.searchParams\.delete\(PROFILE_PARAM\)/);
  assert.match(harness, /if \(!profile\) return dashboard/);
});

test("owner installer resets canonical product files and refuses mixed versions", () => {
  assert.match(installer, /_reset_product_static/);
  assert.match(installer, /repo_version != installed_version/);
  assert.match(installer, /Install the exact product candidate before applying the owner harness/);
  assert.match(installer, /shutil\.copy2\(source_static \/ name, target \/ name\)/);
  assert.match(installer, /root \/ "custom_components" \/ "sv_dashboard" \/ "const\.py"/);
  assert.match(installer, /target\.parent \/ "const\.py"/);
});

test("owner harness import is fail-open and outside the critical packageModules gate", () => {
  assert.match(installer, /OWNER-HARNESS-IMPORT-BEGIN/);
  assert.match(installer, /window\.__svDashboardOwnerHarnessReady = import/);
  assert.match(installer, /\.then\(\(\) => true\)/);
  assert.match(installer, /\.catch\(\(error\) =>/);
  assert.match(installer, /return false/);
  assert.match(installer, /local module failed to load/);
});

test("owner installer cache-busts the locally patched Strategy module", () => {
  assert.match(installer, /strategy_import_pattern = re\.compile/);
  assert.match(installer, /sv_dashboard\\\.js\\\?v=/);
  assert.match(installer, /replacement = f'await import\("\.\/sv_dashboard\.js\?v=owner-\{token\}"\);'/);
  assert.match(installer, /if count != 1/);
});


test("owner installer cache-busts the top-level Lovelace frontend resource", () => {
  assert.match(installer, /def _patch_frontend_resource_version/);
  assert.match(installer, /owner_version = f"\{product_version\}-owner-\{token\}"/);
  assert.match(installer, /FRONTEND_VERSION = "\{owner_version\}"/);
  assert.match(installer, /Owner frontend resource version:/);
  assert.match(installer, /Full Home Assistant restart required so Lovelace registers/);
  assert.match(installer, /the owner-specific frontend resource URL/);
});

test("owner harness installer is valid Python", () => {
  const result = spawnSync(
    "python3",
    ["-m", "py_compile", "dev/owner_test_harness/install.py"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});


test("owner selector uses the proven direct Strategy insertion path", () => {
  assert.match(installer, /SELECTOR_DECL_ANCHOR/);
  assert.match(installer, /const ownerTestSelector = \{/);
  assert.match(installer, /SELECTOR_CARD_ANCHOR/);
  assert.match(installer, /ownerTestSelector,\\n        hero/);
});

test("owner cache token changes when installer behavior changes", () => {
  assert.match(installer, /def _owner_token\(source: Path\)/);
  assert.match(installer, /digest\.update\(source\.read_bytes\(\)\)/);
  assert.match(installer, /digest\.update\(Path\(__file__\)\.read_bytes\(\)\)/);
});

test("owner installer runs end-to-end against a temporary beta.33 runtime", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sv-owner-install-"));
  const integrationRoot = path.join(tempRoot, "sv_dashboard");
  const staticRoot = path.join(integrationRoot, "static");
  fs.mkdirSync(staticRoot, { recursive: true });
  for (const file of ["manifest.json", "const.py"]) {
    fs.copyFileSync(path.join("custom_components", "sv_dashboard", file), path.join(integrationRoot, file));
  }
  for (const file of ["frontend.js", "sv_dashboard.js"]) {
    fs.copyFileSync(path.join("custom_components", "sv_dashboard", "static", file), path.join(staticRoot, file));
  }

  try {
    const result = spawnSync(
      "python3",
      ["dev/owner_test_harness/install.py", "--target", staticRoot],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const installedFrontend = fs.readFileSync(path.join(staticRoot, "frontend.js"), "utf8");
    const installedStrategy = fs.readFileSync(path.join(staticRoot, "sv_dashboard.js"), "utf8");
    const installedConst = fs.readFileSync(path.join(integrationRoot, "const.py"), "utf8");

    const tokenMatch = result.stdout.match(/module owner-([0-9a-f]{12})/);
    assert.ok(tokenMatch, result.stdout);
    const token = tokenMatch[1];

    assert.match(installedFrontend, new RegExp(`owner-test-harness-card\\.js\\?v=owner-${token}`));
    assert.match(installedFrontend, new RegExp(`sv_dashboard\\.js\\?v=owner-${token}`));
    assert.match(installedConst, new RegExp(`FRONTEND_VERSION = "0\\.6\\.0-beta\\.33-owner-${token}"`));
    assert.match(installedStrategy, /const ownerTestSelector = \{/);
    assert.match(installedStrategy, /ownerTestSelector,\n        hero,/);
    assert.match(installedStrategy, /static async generate\(config, hass\)/);
    assert.match(installedStrategy, /hass = ownerHarness\.fixtureHass\(hass, config\?\.entry_id, ownerProfile\)/);
    assert.match(installedStrategy, /ownerHarness\.decorateDashboard\(/);
    assert.ok(fs.existsSync(path.join(staticRoot, "owner-test-harness-card.js")));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});


test("patched Strategy.generate applies phev-driving fixture before dashboard generation", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sv-owner-runtime-"));
  const integrationRoot = path.join(tempRoot, "sv_dashboard");
  const staticRoot = path.join(integrationRoot, "static");
  fs.mkdirSync(integrationRoot, { recursive: true });
  fs.cpSync("custom_components/sv_dashboard/static", staticRoot, { recursive: true });
  for (const file of ["manifest.json", "const.py"]) {
    fs.copyFileSync(path.join("custom_components", "sv_dashboard", file), path.join(integrationRoot, file));
  }

  const installResult = spawnSync(
    "python3",
    ["dev/owner_test_harness/install.py", "--target", staticRoot],
    { encoding: "utf8" },
  );
  assert.equal(installResult.status, 0, installResult.stderr || installResult.stdout);

  const previous = {
    HTMLElement: globalThis.HTMLElement,
    customElements: globalThis.customElements,
    window: globalThis.window,
    document: globalThis.document,
  };
  const registry = new Map();
  class TestHTMLElement {}
  const dependency = class {};
  for (const tag of ["bubble-card", "button-card", "map-card", "layout-card"]) registry.set(tag, dependency);

  globalThis.HTMLElement = TestHTMLElement;
  globalThis.customElements = {
    get(name) { return registry.get(name); },
    define(name, ctor) {
      if (registry.has(name)) throw new Error(`duplicate custom element: ${name}`);
      registry.set(name, ctor);
    },
    whenDefined(name) {
      return registry.has(name) ? Promise.resolve() : new Promise(() => {});
    },
  };
  const location = new URL("http://localhost/citroen-dashboard/vehicle?sv_owner_fixture=phev-driving");
  globalThis.window = {
    location,
    history: { replaceState() {} },
    customStrategies: [],
    __svDashboardDependencyReadiness: Promise.resolve([]),
  };
  globalThis.document = { createElement() { return {}; } };

  const makeState = (entityId, value, attributes = {}) => ({
    entity_id: entityId,
    state: String(value),
    attributes,
    last_changed: "2026-09-25T12:00:00Z",
    last_updated: "2026-09-25T12:00:00Z",
    context: {},
  });

  const hass = {
    locale: { language: "de" },
    states: {
      "sensor.sv_status": makeState("sensor.sv_status", "ready", {
        integration_domain: "sv_dashboard",
        entry_id: "entry-1",
        upstream_compatibility: { version_supported: true, version: "test" },
        entity_mapping: {
          battery: "sensor.vehicle_battery",
          autonomy: "sensor.vehicle_range",
          temperature: "sensor.vehicle_temperature",
        },
        metric_entities: {},
        control_entities: {},
        server_history_entities: {},
        capabilities: {
          electric_energy: true,
          fuel: false,
          charging: false,
          charge_history: false,
        },
        modules: {
          trips: false,
          charging: false,
          gps: false,
          wakeup: false,
          notifications: false,
        },
        vehicle_tracker: "device_tracker.vehicle",
        powertrain: "electric",
        auto_powertrain: "electric",
      }),
      "sensor.vehicle_battery": makeState("sensor.vehicle_battery", 63, { unit_of_measurement: "%" }),
      "sensor.vehicle_range": makeState("sensor.vehicle_range", 172, { unit_of_measurement: "km" }),
      "sensor.vehicle_temperature": makeState("sensor.vehicle_temperature", 20.5, { unit_of_measurement: "°C" }),
      "device_tracker.vehicle": makeState("device_tracker.vehicle", "home", {
        latitude: 51,
        longitude: 8,
        entity_picture: "/local/car.png",
      }),
    },
  };

  try {
    const harnessUrl = pathToFileURL(path.join(staticRoot, "owner-test-harness-card.js"));
    harnessUrl.searchParams.set("test", String(Date.now()));
    await import(harnessUrl.href);

    const strategyUrl = pathToFileURL(path.join(staticRoot, "sv_dashboard.js"));
    strategyUrl.searchParams.set("test", String(Date.now()));
    await import(strategyUrl.href);

    const Strategy = registry.get("ll-strategy-dashboard-sv-dashboard");
    assert.equal(typeof Strategy, "function");

    const dashboard = await Strategy.generate({ entry_id: "entry-1" }, hass);
    const serialized = JSON.stringify(dashboard);

    assert.match(serialized, /sv-dashboard-owner-test-selector-card/);
    assert.match(serialized, /sv-dashboard-owner-test-context-card/);
    assert.match(serialized, /sv-dashboard-dual-energy-overview-card/);
    assert.doesNotMatch(serialized, /sv-dashboard-vehicle-overview-card/);
  } finally {
    if (previous.HTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previous.HTMLElement;
    if (previous.customElements === undefined) delete globalThis.customElements;
    else globalThis.customElements = previous.customElements;
    if (previous.window === undefined) delete globalThis.window;
    else globalThis.window = previous.window;
    if (previous.document === undefined) delete globalThis.document;
    else globalThis.document = previous.document;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
