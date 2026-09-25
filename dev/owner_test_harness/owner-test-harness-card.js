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
  ["", "Standard · Testmodus aus"],
  ["phev-demo", "PHEV · Demo vollständig"],
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
const futureIso = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();
const round1 = (value) => Math.round(Number(value) * 10) / 10;
const numericState = (hass, entityId) => {
  const value = Number.parseFloat(String(entityId ? hass?.states?.[entityId]?.state ?? "" : "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

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

const syntheticTrips = (currentMileageKm) => {
  const latestMileage = Number.isFinite(currentMileageKm) ? currentMileageKm : 2171;
  const distances = [94.6, 4.2, 34.8, 8.7, 12.4];
  let cursor = Math.max(0, round1(latestMileage - distances.reduce((sum, value) => sum + value, 0)));
  const mileageStart = () => cursor;
  const advance = (distance) => { cursor = round1(cursor + distance); };

  const motorwayStart = mileageStart();
  advance(94.6);
  const shortEvStart = mileageStart();
  advance(4.2);
  const mixedRoadStart = mileageStart();
  advance(34.8);
  const commuteStart = mileageStart();
  advance(8.7);
  const latestMixedStart = mileageStart();

  return [
    {
      server_id: "owner-fixture-motorway",
      start_time: agoIso(4153),
      end_time: agoIso(4080),
      duration_seconds: 73 * 60,
      distance_km: 94.6,
      start_mileage: motorwayStart,
      soc_start: 78,
      soc_end: 54,
      electric_range_start_km: 53,
      electric_range_end_km: 18,
      fuel_level_start: 67,
      fuel_level_end: 58,
      fuel_range_start_km: 520,
      fuel_range_end_km: 458,
      fuel_consumption_l: 4.38,
      fuel_consumption_l_100km: 4.6,
      trip_type: "Hybrid",
      energy_kwh: 2.9,
      energy_per_100_km: 3.1,
      average_speed: 77.8,
      valid_for_statistics: true,
      quality_flags: [],
      speed_source: "server_trip",
    },
    {
      server_id: "owner-fixture-electric-short",
      start_time: agoIso(3369),
      end_time: agoIso(3360),
      duration_seconds: 9 * 60,
      distance_km: 4.2,
      start_mileage: shortEvStart,
      soc_start: 68,
      soc_end: 66,
      electric_range_start_km: 47,
      electric_range_end_km: 43,
      fuel_level_start: 58,
      fuel_level_end: 58,
      fuel_range_start_km: 458,
      fuel_range_end_km: 458,
      fuel_consumption_l: 0,
      fuel_consumption_l_100km: 0,
      trip_type: "Electric",
      energy_kwh: 0.8,
      energy_per_100_km: 19.0,
      average_speed: 28.0,
      valid_for_statistics: true,
      quality_flags: [],
      speed_source: "server_trip",
    },
    {
      server_id: "owner-fixture-mixed-road",
      start_time: agoIso(2076),
      end_time: agoIso(2040),
      duration_seconds: 36 * 60,
      distance_km: 34.8,
      start_mileage: mixedRoadStart,
      soc_start: 81,
      soc_end: 70,
      electric_range_start_km: 55,
      electric_range_end_km: 42,
      fuel_level_start: 58,
      fuel_level_end: 56,
      fuel_range_start_km: 458,
      fuel_range_end_km: 442,
      fuel_consumption_l: 1.57,
      fuel_consumption_l_100km: 4.5,
      trip_type: "Hybrid",
      energy_kwh: 2.8,
      energy_per_100_km: 8.0,
      average_speed: 58.0,
      valid_for_statistics: true,
      quality_flags: [],
      speed_source: "server_trip",
    },
    {
      server_id: "owner-fixture-electric-commute",
      start_time: agoIso(1494),
      end_time: agoIso(1480),
      duration_seconds: 14 * 60,
      distance_km: 8.7,
      start_mileage: commuteStart,
      soc_start: 82,
      soc_end: 79,
      electric_range_start_km: 52,
      electric_range_end_km: 47,
      fuel_level_start: 56,
      fuel_level_end: 56,
      fuel_range_start_km: 442,
      fuel_range_end_km: 442,
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
      server_id: "owner-fixture-mixed-latest",
      start_time: agoIso(93),
      end_time: agoIso(75),
      duration_seconds: 18 * 60,
      distance_km: 12.4,
      start_mileage: latestMixedStart,
      soc_start: 78,
      soc_end: 74,
      electric_range_start_km: 46,
      electric_range_end_km: 39,
      fuel_level_start: 56,
      fuel_level_end: 55,
      fuel_range_start_km: 442,
      fuel_range_end_km: 435,
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

const fuelHistoryFixture = (currentMileageKm) => {
  const latestMileage = Number.isFinite(currentMileageKm) ? currentMileageKm : 2171;
  return {
    summary: {
      source_time: agoIso(3 * 24 * 60),
      odometer_km: Math.max(0, round1(latestMileage - 154.7)),
      distance_km: 154.7,
      driving_time_seconds: 9000,
      average_speed_kmh: 61.9,
      fuel_consumption_l_100km: 4.2,
      trip_count: 5,
      fuel_coverage_complete: true,
    },
    events: [
      {
        source_time: agoIso(3 * 24 * 60),
        liters: 25.0,
        liters_estimated: false,
        odometer_km: Math.max(0, round1(latestMileage - 154.7)),
        fuel_before_percent: 18,
        fuel_after_percent: 68,
      },
      {
        source_time: agoIso(19 * 24 * 60),
        liters: 26.0,
        liters_estimated: true,
        odometer_km: Math.max(0, round1(latestMileage - 486.2)),
        fuel_before_percent: 24,
        fuel_after_percent: 76,
      },
      {
        source_time: agoIso(45 * 24 * 60),
        liters: 36.0,
        liters_estimated: false,
        odometer_km: Math.max(0, round1(latestMileage - 1024.6)),
        fuel_before_percent: 14,
        fuel_after_percent: 86,
      },
    ],
  };
};

function fixtureHass(hass, entryId, profile = activeProfile()) {
  if (!profile || !VALID_PROFILES.has(profile)) return hass;
  const selected = candidates(hass, entryId);
  if (selected.length !== 1) return hass;

  const [statusId, originalStatus] = selected[0];
  const originalAttributes = originalStatus.attributes || {};
  const originalMapped = originalAttributes.entity_mapping || {};
  const originalMetrics = originalAttributes.metric_entities || {};
  const originalServer = originalAttributes.server_history_entities || {};
  const mileageEntity = originalMetrics.canonical_mileage || originalMapped.mileage;
  const currentMileageKm = numericState(hass, mileageEntity) ?? 2171;
  const stale = profile === "phev-stale";
  const forceFresh = profile === "phev-fresh";
  const fullySynthetic = new Set(["phev-demo", "phev-idle", "phev-driving", "phev-charging"]).has(profile);
  const stamp = stale ? agoIso(60) : nowIso();
  const effectiveEntryId = originalAttributes.entry_id || entryId || "owner";

  const ids = {
    battery: SYNTH_PREFIX + "battery",
    autonomy: SYNTH_PREFIX + "autonomy",
    temperature: SYNTH_PREFIX + "temperature",
    fuel: SYNTH_PREFIX + "fuel",
    fuelAutonomy: SYNTH_PREFIX + "fuel_autonomy",
    fuelConsumption: SYNTH_PREFIX + "fuel_consumption",
    remainingFuel: SYNTH_PREFIX + "remaining_fuel_liters",
    trailingFuel: SYNTH_PREFIX + "trailing_fuel_consumption_500km",
    remainingBattery: SYNTH_PREFIX + "remaining_battery_energy_kwh",
    trailingElectric: SYNTH_PREFIX + "trailing_consumption_500km",
    currentChargePower: SYNTH_PREFIX + "current_charge_power",
    chargingType: SYNTH_PREFIX + "charging_type",
    chargingEnd: SYNTH_PREFIX + "charging_end",
  };

  const synthetic = {
    [ids.fuel]: state(ids.fuel, 55, {
      unit_of_measurement: "%",
      friendly_name: "Owner fixture fuel",
      "Last updated": stamp,
    }, stamp),
    [ids.fuelAutonomy]: state(ids.fuelAutonomy, 435, {
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
      27.5,
      "L",
      { estimated: true },
    ),
    [ids.trailingFuel]: metricState(
      ids.trailingFuel,
      effectiveEntryId,
      "trailing_fuel_consumption_500km",
      4.5,
      "L/100 km",
      { distance_km: 500, trip_count: 23, complete: true },
    ),
    [ids.remainingBattery]: metricState(
      ids.remainingBattery,
      effectiveEntryId,
      "remaining_battery_energy_kwh",
      10.8,
      "kWh",
      { estimated: true },
    ),
    [ids.trailingElectric]: metricState(
      ids.trailingElectric,
      effectiveEntryId,
      "trailing_consumption_500km",
      17.6,
      "kWh/100 km",
      { distance_km: 500, trip_count: 24, complete: true },
    ),
  };

  const mapped = {
    ...originalMapped,
    fuel: ids.fuel,
    fuel_autonomy: ids.fuelAutonomy,
    fuel_consumption_instant: ids.fuelConsumption,
  };

  if (fullySynthetic) {
    const batteryPercent = profile === "phev-charging" ? 56 : profile === "phev-driving" ? 64 : 72;
    const electricRangeKm = profile === "phev-charging" ? 36 : profile === "phev-driving" ? 42 : 51;
    const temperatureC = profile === "phev-driving" ? 22.0 : profile === "phev-charging" ? 20.0 : 21.0;
    synthetic[ids.battery] = state(ids.battery, batteryPercent, {
      unit_of_measurement: "%",
      friendly_name: "Owner fixture battery",
      "Last updated": stamp,
    }, stamp);
    synthetic[ids.autonomy] = state(ids.autonomy, electricRangeKm, {
      unit_of_measurement: "km",
      friendly_name: "Owner fixture electric range",
      "Last updated": stamp,
    }, stamp);
    synthetic[ids.temperature] = state(ids.temperature, temperatureC, {
      unit_of_measurement: "°C",
      friendly_name: "Owner fixture temperature",
      "Last updated": stamp,
    }, stamp);
    mapped.battery = ids.battery;
    mapped.autonomy = ids.autonomy;
    mapped.temperature = ids.temperature;
  }

  if (profile === "phev-demo" || profile === "phev-idle" || stale || forceFresh) {
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
    synthetic[ids.chargingType] = state(ids.chargingType, "AC", { friendly_name: "Owner fixture charging type", "Last updated": stamp }, stamp);
    synthetic[ids.chargingEnd] = state(ids.chargingEnd, futureIso(95), { friendly_name: "Owner fixture charging end", "Last updated": stamp }, stamp);
    synthetic[ids.currentChargePower] = metricState(
      ids.currentChargePower,
      effectiveEntryId,
      "current_charge_power",
      7.4,
      "kW",
      { estimated: false, owner_test_fixture: true },
    );
    mapped.engine = engine;
    mapped.battery_charging = charging;
    mapped.battery_plugged = plugged;
    mapped.battery_charging_type = ids.chargingType;
    mapped.battery_charging_end = ids.chargingEnd;
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
    const trips = syntheticTrips(currentMileageKm);
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
        remaining_battery_energy_kwh: fullySynthetic ? ids.remainingBattery : usableMetric("remaining_battery_energy_kwh", ids.remainingBattery),
        trailing_consumption_500km: fullySynthetic ? ids.trailingElectric : usableMetric("trailing_consumption_500km", ids.trailingElectric),
        remaining_fuel_liters: ids.remainingFuel,
        trailing_fuel_consumption_500km: ids.trailingFuel,
        ...(profile === "phev-charging" ? { current_charge_power: ids.currentChargePower } : {}),
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
        return Promise.resolve(fuelHistoryFixture(currentMileageKm));
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
    const badgeClass = active ? "active" : "off";
    const badgeText = active ? "AKTIV" : "AUS";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { padding:10px 14px; border-radius:var(--ha-card-border-radius,12px); background:var(--ha-card-background,var(--card-background-color)); }
        .row { display:grid; grid-template-columns:auto minmax(180px,320px); align-items:center; gap:12px; }
        .label { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--primary-text-color); }
        .badge { font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px; }
        .badge.active { color:var(--warning-color,#ff9800); background:color-mix(in srgb,var(--warning-color,#ff9800) 14%,transparent); }
        .badge.off { color:var(--secondary-text-color); background:color-mix(in srgb,var(--secondary-text-color) 10%,transparent); }
        select { width:100%; min-height:36px; padding:6px 10px; border:1px solid var(--divider-color); border-radius:8px; color:var(--primary-text-color); background:var(--secondary-background-color); font:inherit; }
        @media (max-width:620px) { .row { grid-template-columns:1fr; } }
      </style>
      <ha-card><div class="row"><div class="label"><span>Owner-Testmodus</span><span class="badge ${badgeClass}">${badgeText}</span></div><select aria-label="Owner-Testprofil">${options}</select></div></ha-card>
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
