/*
 * OWNER-ONLY local PHEV test harness.
 *
 * This file is versioned for reproducibility but is NOT imported by the
 * production package. dev/owner_test_harness/install.py copies it into a local
 * HA installation and patches only the locally installed frontend/Strategy.
 *
 * Active fixture profiles create a browser-local Dual-Energy context for the
 * whole generated dashboard. Real Home Assistant state is never mutated.
 */
const STATUS_DOMAIN = "sv_dashboard";
const SELECTOR_TAG = "sv-dashboard-owner-test-selector-card";
const CONTEXT_TAG = "sv-dashboard-owner-test-context-card";
const PROFILE_PARAM = "sv_owner_fixture";
const SYNTH_PREFIX = "sensor.sv_owner_fixture_";

const PROFILE_OPTIONS = [
  ["", "Standard · echtes Fahrzeug"],
  ["phev", "PHEV · Live EV + Fuel-Dummy"],
  ["phev-fresh", "PHEV · Freshness aktuell"],
  ["phev-idle", "PHEV · Idle"],
  ["phev-driving", "PHEV · Fahrt"],
  ["phev-charging", "PHEV · Laden"],
  ["phev-stale", "PHEV · Stale/Freshness-Test"],
];

const VALID_PROFILES = new Set(PROFILE_OPTIONS.map(([value]) => value).filter(Boolean));
const nowIso = () => new Date().toISOString();
const agoIso = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

const state = (entityId, value, attributes = {}, updated = nowIso()) => ({
  entity_id: entityId,
  state: String(value),
  attributes,
  last_changed: updated,
  last_updated: updated,
  context: {},
});

const activeProfile = () => {
  const raw = new URLSearchParams(window.location.search).get(PROFILE_PARAM) || "";
  return VALID_PROFILES.has(raw) ? raw : "";
};

const candidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([id, item]) => {
  const a = item?.attributes || {};
  return id.startsWith("sensor.") && a.integration_domain === STATUS_DOMAIN
    && typeof a.entity_mapping === "object"
    && (!entryId || a.entry_id === entryId);
});

const withSourceTimestamp = (item, updated) => {
  if (!item) return item;
  const attributes = { ...(item.attributes || {}) };
  const sourceKeys = ["Last updated", "last_updated", "updatedAt", "updated_at"];
  let hadSourceTimestamp = false;
  for (const key of sourceKeys) {
    if (Object.prototype.hasOwnProperty.call(attributes, key)) {
      attributes[key] = updated;
      hadSourceTimestamp = true;
    }
  }
  if (!hadSourceTimestamp) attributes["Last updated"] = updated;
  return { ...item, attributes, last_changed: updated, last_updated: updated };
};

const metricState = (entityId, entryId, metricKey, value, unit, extra = {}) =>
  state(entityId, value, {
    integration_domain: STATUS_DOMAIN,
    entry_id: entryId,
    metric_key: metricKey,
    unit_of_measurement: unit,
    owner_test_fixture: true,
    ...extra,
  });

const tripColumns = [
  "server_id", "start_time", "end_time", "duration_seconds", "distance_km",
  "start_mileage", "soc_start", "soc_end", "electric_range_start_km",
  "electric_range_end_km", "fuel_level_start", "fuel_level_end",
  "fuel_range_start_km", "fuel_range_end_km", "fuel_consumption_l",
  "fuel_consumption_l_100km", "trip_type", "energy_kwh",
  "energy_per_100_km", "average_speed", "valid_for_statistics",
  "quality_flags", "speed_source",
];

const syntheticTrips = () => {
  const mixedEnd = agoIso(75);
  const mixedStart = agoIso(93);
  const electricEnd = agoIso(24 * 60 + 40);
  const electricStart = agoIso(24 * 60 + 54);
  return [
    {
      server_id: "owner-fixture-electric",
      start_time: electricStart,
      end_time: electricEnd,
      duration_seconds: 14 * 60,
      distance_km: 8.7,
      start_mileage: 12480.4,
      soc_start: 82,
      soc_end: 79,
      electric_range_start_km: 52,
      electric_range_end_km: 47,
      fuel_level_start: 64,
      fuel_level_end: 64,
      fuel_range_start_km: 418,
      fuel_range_end_km: 418,
      fuel_consumption_l: 0,
      fuel_consumption_l_100km: 0,
      trip_type: "Electric",
      energy_kwh: 1.3,
      energy_per_100_km: 14.9,
      average_speed: 37.3,
      valid_for_statistics: true,
      quality_flags: [],
      speed_source: "server_trip",
    },
    {
      server_id: "owner-fixture-mixed",
      start_time: mixedStart,
      end_time: mixedEnd,
      duration_seconds: 18 * 60,
      distance_km: 12.4,
      start_mileage: 12489.1,
      soc_start: 78,
      soc_end: 74,
      electric_range_start_km: 46,
      electric_range_end_km: 39,
      fuel_level_start: 63,
      fuel_level_end: 61,
      fuel_range_start_km: 410,
      fuel_range_end_km: 397,
      fuel_consumption_l: 0.62,
      fuel_consumption_l_100km: 5.0,
      trip_type: "Hybrid",
      energy_kwh: 1.6,
      energy_per_100_km: 12.9,
      average_speed: 41.3,
      valid_for_statistics: true,
      quality_flags: [],
      speed_source: "server_trip",
    },
  ];
};

const fuelHistoryFixture = () => ({
  summary: {
    distance_km: 486.2,
    driving_time_seconds: 52740,
    average_speed_kmh: 33.2,
    fuel_consumption_l_100km: 4.8,
  },
  events: [
    {
      source_time: agoIso(3 * 24 * 60),
      liters: 31.4,
      liters_estimated: true,
      odometer_km: 12374.2,
      fuel_before_percent: 19,
      fuel_after_percent: 82,
    },
    {
      source_time: agoIso(19 * 24 * 60),
      liters: 24.8,
      liters_estimated: true,
      odometer_km: 11932.6,
      fuel_before_percent: 28,
      fuel_after_percent: 78,
    },
  ],
});

function fixtureHass(hass, entryId, profile = activeProfile() || "phev") {
  const selected = candidates(hass, entryId);
  if (selected.length !== 1) return hass;

  const [statusId, originalStatus] = selected[0];
  const originalAttributes = originalStatus.attributes || {};
  const originalMapped = originalAttributes.entity_mapping || {};
  const originalMetrics = originalAttributes.metric_entities || {};
  const originalServer = originalAttributes.server_history_entities || {};
  const stale = profile === "phev-stale";
  const forceFresh = profile === "phev-fresh";
  const stamp = stale ? agoIso(60) : nowIso();
  const effectiveEntryId = originalAttributes.entry_id || entryId || "owner";

  const ids = {
    fuel: SYNTH_PREFIX + "fuel",
    fuelAutonomy: SYNTH_PREFIX + "fuel_autonomy",
    fuelConsumption: SYNTH_PREFIX + "fuel_consumption",
    remainingFuel: SYNTH_PREFIX + "remaining_fuel_liters",
    trailingFuel: SYNTH_PREFIX + "trailing_fuel_consumption_500km",
    remainingBattery: SYNTH_PREFIX + "remaining_battery_energy_kwh",
    trailingElectric: SYNTH_PREFIX + "trailing_consumption_500km",
  };

  const synthetic = {
    [ids.fuel]: state(ids.fuel, 63, {
      unit_of_measurement: "%",
      friendly_name: "Owner fixture fuel",
      "Last updated": stamp,
    }, stamp),
    [ids.fuelAutonomy]: state(ids.fuelAutonomy, 410, {
      unit_of_measurement: "km",
      friendly_name: "Owner fixture fuel range",
      "Last updated": stamp,
    }, stamp),
    [ids.fuelConsumption]: state(
      ids.fuelConsumption,
      profile === "phev-driving" ? 5.4 : 0,
      {
        unit_of_measurement: "l/100 km",
        friendly_name: "Owner fixture live fuel consumption",
        "Last updated": stamp,
      },
      stamp,
    ),
    [ids.remainingFuel]: metricState(
      ids.remainingFuel,
      effectiveEntryId,
      "remaining_fuel_liters",
      31.5,
      "L",
      { estimated: true },
    ),
    [ids.trailingFuel]: metricState(
      ids.trailingFuel,
      effectiveEntryId,
      "trailing_fuel_consumption_500km",
      4.8,
      "L/100 km",
      { distance_km: 486.2, trip_count: 18, complete: true },
    ),
    [ids.remainingBattery]: metricState(
      ids.remainingBattery,
      effectiveEntryId,
      "remaining_battery_energy_kwh",
      31.2,
      "kWh",
      { estimated: true },
    ),
    [ids.trailingElectric]: metricState(
      ids.trailingElectric,
      effectiveEntryId,
      "trailing_consumption_500km",
      16.4,
      "kWh/100 km",
      { distance_km: 472.8, trip_count: 21, complete: true },
    ),
  };

  const mapped = {
    ...originalMapped,
    fuel: ids.fuel,
    fuel_autonomy: ids.fuelAutonomy,
    fuel_consumption_instant: ids.fuelConsumption,
  };

  if (profile === "phev-idle" || stale || forceFresh) {
    const engine = SYNTH_PREFIX + "engine";
    const charging = SYNTH_PREFIX + "charging";
    const plugged = SYNTH_PREFIX + "plugged";
    synthetic[engine] = state(engine, "off", { friendly_name: "Owner fixture engine", "Last updated": stamp }, stamp);
    synthetic[charging] = state(charging, "off", { friendly_name: "Owner fixture charging", "Last updated": stamp }, stamp);
    synthetic[plugged] = state(plugged, "off", { friendly_name: "Owner fixture plugged", "Last updated": stamp }, stamp);
    mapped.engine = engine;
    mapped.battery_charging = charging;
    mapped.battery_plugged = plugged;
  } else if (profile === "phev-driving") {
    const engine = SYNTH_PREFIX + "engine";
    const charging = SYNTH_PREFIX + "charging";
    const plugged = SYNTH_PREFIX + "plugged";
    synthetic[engine] = state(engine, "on", { friendly_name: "Owner fixture engine", "Last updated": stamp }, stamp);
    synthetic[charging] = state(charging, "off", { friendly_name: "Owner fixture charging", "Last updated": stamp }, stamp);
    synthetic[plugged] = state(plugged, "off", { friendly_name: "Owner fixture plugged", "Last updated": stamp }, stamp);
    mapped.engine = engine;
    mapped.battery_charging = charging;
    mapped.battery_plugged = plugged;
  } else if (profile === "phev-charging") {
    const engine = SYNTH_PREFIX + "engine";
    const charging = SYNTH_PREFIX + "charging";
    const plugged = SYNTH_PREFIX + "plugged";
    synthetic[engine] = state(engine, "off", { friendly_name: "Owner fixture engine", "Last updated": stamp }, stamp);
    synthetic[charging] = state(charging, "on", { friendly_name: "Owner fixture charging", "Last updated": stamp }, stamp);
    synthetic[plugged] = state(plugged, "on", { friendly_name: "Owner fixture plugged", "Last updated": stamp }, stamp);
    mapped.engine = engine;
    mapped.battery_charging = charging;
    mapped.battery_plugged = plugged;
  }

  const states = { ...hass.states, ...synthetic };

  if (stale) {
    for (const key of ["battery", "battery_residual", "autonomy", "temperature", "battery_charging_rate"]) {
      const entityId = originalMapped[key];
      if (entityId && hass.states?.[entityId]) states[entityId] = withSourceTimestamp(hass.states[entityId], stamp);
    }
  } else if (forceFresh) {
    const entityId = originalMapped.temperature;
    if (entityId && hass.states?.[entityId]) states[entityId] = withSourceTimestamp(hass.states[entityId], stamp);
  }

  const serverTripEntity = originalServer.server_trip_history;
  if (serverTripEntity && hass.states?.[serverTripEntity]) {
    const trips = syntheticTrips();
    states[serverTripEntity] = {
      ...hass.states[serverTripEntity],
      state: String(trips.length),
      attributes: {
        ...(hass.states[serverTripEntity].attributes || {}),
        server_history_ready: true,
        server_history_source: "owner_fixture",
        trip_columns: tripColumns,
        trip_rows: trips.map((trip) => tripColumns.map((column) => trip[column])),
        trips,
        zero_trip_rows: [],
        zero_distance_events: [],
        owner_test_fixture: true,
      },
      last_changed: stamp,
      last_updated: stamp,
    };
  }

  const usableMetric = (key, fallback) => {
    const entityId = originalMetrics[key];
    const current = entityId ? hass.states?.[entityId] : undefined;
    return current && !["unknown", "unavailable", "none", ""].includes(String(current.state ?? "").toLowerCase())
      ? entityId
      : fallback;
  };

  const status = {
    ...originalStatus,
    attributes: {
      ...originalAttributes,
      powertrain: "hybrid",
      auto_powertrain: "hybrid",
      entity_mapping: mapped,
      metric_entities: {
        ...originalMetrics,
        remaining_battery_energy_kwh: usableMetric("remaining_battery_energy_kwh", ids.remainingBattery),
        trailing_consumption_500km: usableMetric("trailing_consumption_500km", ids.trailingElectric),
        remaining_fuel_liters: ids.remainingFuel,
        trailing_fuel_consumption_500km: ids.trailingFuel,
      },
      capabilities: {
        ...(originalAttributes.capabilities || {}),
        electric_energy: true,
        electric_trip_metrics: true,
        fuel: true,
        fuel_metrics: true,
      },
      owner_test_fixture: profile,
    },
  };
  states[statusId] = status;

  const fixture = { ...hass, states };
  if (typeof hass.callWS === "function") {
    const realCallWS = hass.callWS.bind(hass);
    fixture.callWS = (message) => {
      if (message?.type === `${STATUS_DOMAIN}/fuel_history`) {
        return Promise.resolve(fuelHistoryFixture());
      }
      return realCallWS(message);
    };
  }
  return fixture;
}

const selectorConfig = (entryId) => ({
  type: `custom:${SELECTOR_TAG}`,
  entry_id: entryId,
  grid_options: { columns: "full", rows: 1 },
});

const contextConfig = (card, entryId, profile) => ({
  type: `custom:${CONTEXT_TAG}`,
  entry_id: entryId,
  profile,
  card,
  grid_options: card?.grid_options,
});

function decorateDashboard(dashboard, entryId, profile = activeProfile()) {
  if (!dashboard || !Array.isArray(dashboard.views)) return dashboard;

  const vehicle = dashboard.views.find((view) => view?.path === "vehicle");
  if (vehicle) {
    const selector = selectorConfig(entryId);
    const firstLayout = Array.isArray(vehicle.cards) ? vehicle.cards[0] : null;
    if (Array.isArray(firstLayout?.cards)) {
      if (!firstLayout.cards.some((card) => card?.type === selector.type)) {
        firstLayout.cards.splice(Math.min(1, firstLayout.cards.length), 0, selector);
      }
    } else if (Array.isArray(vehicle.cards) && !vehicle.cards.some((card) => card?.type === selector.type)) {
      vehicle.cards.unshift(selector);
    }
  }

  if (!profile) return dashboard;

  const hybridVisualViews = new Set(["vehicle", "charging", "statistics", "trips"]);
  for (const view of dashboard.views) {
    if (!hybridVisualViews.has(view?.path)) continue;
    if (Array.isArray(view?.cards)) {
      view.cards = view.cards.map((card) =>
        card?.type === `custom:${CONTEXT_TAG}` ? card : contextConfig(card, entryId, profile)
      );
    }
    if (Array.isArray(view?.sections)) {
      for (const section of view.sections) {
        if (!Array.isArray(section?.cards)) continue;
        section.cards = section.cards.map((card) =>
          card?.type === `custom:${CONTEXT_TAG}` ? card : contextConfig(card, entryId, profile)
        );
      }
    }
  }
  return dashboard;
}

class SvDashboardOwnerTestSelectorCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(_hass) {}
  connectedCallback() { this._render(); }
  getCardSize() { return 1; }
  getGridOptions() { return { columns: 12, rows: 1, min_columns: 6, min_rows: 1 }; }

  _setProfile(profile) {
    if (profile === activeProfile()) return;
    const url = new URL(window.location.href);
    if (profile) url.searchParams.set(PROFILE_PARAM, profile);
    else url.searchParams.delete(PROFILE_PARAM);
    window.location.assign(url.toString());
  }

  _render() {
    if (!this.shadowRoot) return;
    const active = activeProfile();
    const options = PROFILE_OPTIONS.map(([value, label]) =>
      `<option value="${value}"${value === active ? " selected" : ""}>${label}</option>`
    ).join("");
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { padding:10px 14px; border-radius:var(--ha-card-border-radius,12px); background:var(--ha-card-background,var(--card-background-color)); }
        .row { display:grid; grid-template-columns:auto minmax(180px,320px); align-items:center; gap:12px; }
        .label { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--primary-text-color); }
        .badge { font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px; color:var(--warning-color,#ff9800); background:color-mix(in srgb,var(--warning-color,#ff9800) 14%,transparent); }
        select { width:100%; min-height:36px; padding:6px 10px; border:1px solid var(--divider-color); border-radius:8px; color:var(--primary-text-color); background:var(--secondary-background-color); font:inherit; }
        @media (max-width:620px) { .row { grid-template-columns:1fr; } }
      </style>
      <ha-card><div class="row"><div class="label"><span>Owner-Testmodus</span><span class="badge">LOKAL</span></div><select aria-label="Owner-Testprofil">${options}</select></div></ha-card>
    `;
    this.shadowRoot.querySelector("select")?.addEventListener("change", (event) => this._setProfile(event.target.value), { once: true });
  }
}

class SvDashboardOwnerTestContextCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = undefined;
    this._inner = undefined;
    this._building = false;
  }

  setConfig(config) { this._config = config || {}; this._build(); }
  set hass(hass) {
    this._hass = hass;
    if (this._inner) this._inner.hass = fixtureHass(hass, this._config.entry_id, this._config.profile);
    else this._build();
  }
  connectedCallback() { this._build(); }
  getCardSize() { return this._inner?.getCardSize?.() ?? 1; }
  getGridOptions() { return this._inner?.getGridOptions?.() ?? this._config?.card?.grid_options ?? { columns: "full" }; }

  async _build() {
    if (!this.isConnected || !this._hass || !this._config?.card || this._building) return;
    this._building = true;
    try {
      const helpers = await window.loadCardHelpers();
      const inner = helpers.createCardElement(this._config.card);
      this._inner = inner;
      this.replaceChildren(inner);
      inner.hass = fixtureHass(this._hass, this._config.entry_id, this._config.profile);
    } finally {
      this._building = false;
    }
  }
}

if (!customElements.get(SELECTOR_TAG)) customElements.define(SELECTOR_TAG, SvDashboardOwnerTestSelectorCard);
if (!customElements.get(CONTEXT_TAG)) customElements.define(CONTEXT_TAG, SvDashboardOwnerTestContextCard);

window.__svDashboardOwnerHarness = {
  activeProfile,
  fixtureHass,
  decorateDashboard,
  selectorTag: SELECTOR_TAG,
  contextTag: CONTEXT_TAG,
};
