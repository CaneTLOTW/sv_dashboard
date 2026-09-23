/*
 * OWNER-ONLY local test harness.
 *
 * This file is versioned for reproducibility but is NOT imported by the
 * production package. dev/owner_test_harness/install.py copies it into a local
 * HA installation and patches the local frontend entry/Strategy only.
 */
const CARD_TAG = "sv-dashboard-owner-test-harness-card";
const STATUS_DOMAIN = "sv_dashboard";
const SYNTH_PREFIX = "sensor.sv_owner_fixture_";

const nowIso = () => new Date().toISOString();
const state = (entityId, value, attributes = {}, updated = nowIso()) => ({
  entity_id: entityId,
  state: String(value),
  attributes,
  last_changed: updated,
  last_updated: updated,
  context: {},
});

const profileFromUrl = () => {
  const raw = new URLSearchParams(window.location.search).get("sv_owner_fixture") || "phev";
  return ["phev", "phev-idle", "phev-driving", "phev-charging", "phev-stale"].includes(raw) ? raw : "phev";
};

const candidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([id, item]) => {
  const a = item?.attributes || {};
  return id.startsWith("sensor.") && a.integration_domain === STATUS_DOMAIN &&
    typeof a.entity_mapping === "object" && (!entryId || a.entry_id === entryId);
});

function fixtureHass(hass, entryId, profile) {
  const selected = candidates(hass, entryId);
  if (selected.length !== 1) return hass;

  const [statusId, originalStatus] = selected[0];
  const originalAttributes = originalStatus.attributes || {};
  const originalMapped = originalAttributes.entity_mapping || {};
  const stamp = profile === "phev-stale"
    ? new Date(Date.now() - 60 * 60 * 1000).toISOString()
    : nowIso();

  const ids = {
    fuel: SYNTH_PREFIX + "fuel",
    fuelAutonomy: SYNTH_PREFIX + "fuel_autonomy",
    fuelConsumption: SYNTH_PREFIX + "fuel_consumption",
    engine: SYNTH_PREFIX + "engine",
    charging: SYNTH_PREFIX + "charging",
    plugged: SYNTH_PREFIX + "plugged",
  };

  const synthetic = {
    [ids.fuel]: state(ids.fuel, 63, { unit_of_measurement: "%", friendly_name: "Owner fixture fuel", "Last updated": stamp }, stamp),
    [ids.fuelAutonomy]: state(ids.fuelAutonomy, 410, { unit_of_measurement: "km", friendly_name: "Owner fixture fuel range", "Last updated": stamp }, stamp),
    [ids.fuelConsumption]: state(ids.fuelConsumption, profile === "phev-driving" ? 5.4 : 0, { unit_of_measurement: "l/100 km", friendly_name: "Owner fixture fuel consumption", "Last updated": stamp }, stamp),
    [ids.engine]: state(ids.engine, profile === "phev-driving" ? "on" : "off", { friendly_name: "Owner fixture engine", "Last updated": stamp }, stamp),
    [ids.charging]: state(ids.charging, profile === "phev-charging" ? "on" : "off", { friendly_name: "Owner fixture charging", "Last updated": stamp }, stamp),
    [ids.plugged]: state(ids.plugged, profile === "phev-charging" ? "on" : "off", { friendly_name: "Owner fixture plugged", "Last updated": stamp }, stamp),
  };

  const mapped = {
    ...originalMapped,
    fuel: ids.fuel,
    fuel_autonomy: ids.fuelAutonomy,
    fuel_consumption_instant: ids.fuelConsumption,
    engine: ids.engine,
    battery_charging: ids.charging,
    battery_plugged: ids.plugged,
  };
  const status = {
    ...originalStatus,
    attributes: {
      ...originalAttributes,
      entity_mapping: mapped,
      capabilities: {
        ...(originalAttributes.capabilities || {}),
        electric_energy: true,
        fuel: true,
      },
      owner_test_fixture: profile,
    },
  };

  return { ...hass, states: { ...hass.states, ...synthetic, [statusId]: status } };
}

class SvDashboardOwnerTestHarnessCard extends HTMLElement {
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
    if (this._inner) this._inner.hass = fixtureHass(hass, this._config.entry_id, profileFromUrl());
    else this._build();
  }
  connectedCallback() { this._build(); }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, rows: 5, min_columns: 6, min_rows: 4 }; }

  async _build() {
    if (!this.isConnected || !this._hass || this._building) return;
    this._building = true;
    try {
      const helpers = await window.loadCardHelpers();
      const inner = helpers.createCardElement({
        type: "custom:sv-dashboard-dual-energy-overview-card",
        entry_id: this._config.entry_id,
        grid_options: { columns: "full", rows: 5 },
      });
      this._inner = inner;
      this.replaceChildren(inner);
      inner.hass = fixtureHass(this._hass, this._config.entry_id, profileFromUrl());
    } finally {
      this._building = false;
    }
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, SvDashboardOwnerTestHarnessCard);
