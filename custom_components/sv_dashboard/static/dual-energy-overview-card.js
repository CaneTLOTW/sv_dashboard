import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { localeFor, textFor } from "./i18n.js?v=0.6.0-beta.15";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-dual-energy-overview-card";
const EDITOR_TAG = "sv-dashboard-dual-energy-overview-card-editor";
const CLIMATE_COMMAND_GUARD_MS = 90 * 1000;
const FRESH_VEHICLE_DATA_MS = 15 * 60 * 1000;

const statusCandidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([entityId, state]) => {
  const attributes = state?.attributes || {};
  return entityId.startsWith("sensor.") && attributes.integration_domain === STATUS_DOMAIN && typeof attributes.entity_mapping === "object" && (!entryId || attributes.entry_id === entryId);
});

const candidateLabel = (hass, candidate, fallback) => {
  const [, state] = candidate || [];
  const attributes = state?.attributes || {};
  const vehicleEntity = attributes.entity_mapping?.vehicle;
  const vehicle = vehicleEntity ? hass?.states?.[vehicleEntity] : undefined;
  return String(vehicle?.attributes?.friendly_name || attributes.vehicle_slug || fallback);
};

const metricEntity = (hass, attributes, key) => attributes?.metric_entities?.[key] || Object.entries(hass?.states || {}).find(([, state]) => {
  const a = state?.attributes || {};
  return a.integration_domain === STATUS_DOMAIN && a.entry_id === attributes?.entry_id && a.metric_key === key;
})?.[0];

const dashboardPath = (attributes, override) => {
  if (override) return override;
  const path = String(attributes?.dashboard_url_path || "").trim().replace(/^\/+|\/+$/g, "");
  return path ? `/${path}/vehicle` : undefined;
};

const isOn = (state) => ["on", "true", "inprogress", "running"].includes(String(state ?? "").toLowerCase());
const usable = (state) => state && !["unknown", "unavailable", "none", ""].includes(String(state.state ?? "").toLowerCase());
const numeric = (state) => usable(state) && Number.isFinite(Number(state.state)) ? Number(state.state) : null;
const clampPercent = (value) => value === null ? null : Math.max(0, Math.min(100, value));
const timestamp = (state) => {
  const value = Date.parse(state?.last_updated || state?.last_changed || "");
  return Number.isFinite(value) ? value : null;
};
const sourceTimestamp = (state) => {
  const attributes = state?.attributes || {};
  for (const raw of [attributes["Last updated"], attributes.last_updated, attributes.updatedAt, attributes.updated_at]) {
    const value = Date.parse(raw || "");
    if (Number.isFinite(value)) return value;
  }
  return timestamp(state);
};

class SvDashboardDualEnergyOverviewCard extends LitElement {
  static properties = {
    _hass: { state: true },
    _config: { state: true },
    _climatePendingUntil: { state: true },
    _climatePendingAction: { state: true },
  };

  static styles = css`
    :host { display: block; }
    ha-card { container-type: inline-size; overflow: hidden; border-radius: var(--ha-card-border-radius, 16px); }
    .hero {
      position: relative;
      display: grid;
      grid-template-columns: 1fr;
      grid-template-areas: "vehicle" "battery" "fuel";
      gap: 10px;
      padding: 18px 30px 24px;
      background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--primary-color) 5%, transparent), transparent 43%), var(--ha-card-background, var(--card-background-color));
    }
    .vehicle { grid-area: vehicle; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .picture { width: 100%; min-height: 285px; display: grid; place-items: center; overflow: visible; }
    .picture-button { width: 100%; min-height: inherit; display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; overflow: visible; }
    .picture-button:focus-visible, .metric-button:focus-visible, .top-control:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 3px; }
    .picture img { display: block; width: min(100%, 760px); max-height: 315px; object-fit: contain; transform: translateX(10px) scale(1.5); transform-origin: center; filter: drop-shadow(0 10px 14px rgba(0,0,0,.18)); pointer-events: none; }
    .picture .placeholder { color: var(--secondary-text-color); pointer-events: none; }
    .top-control { position: absolute; z-index: 5; top: 18px; }
    .climate-control {
      left: 18px; width: 48px; height: 48px; border: 1px solid var(--divider-color); border-radius: 50%;
      background: color-mix(in srgb, var(--card-background-color) 92%, transparent); color: var(--primary-text-color);
      display: grid; place-items: center; padding: 0; cursor: pointer; box-shadow: 0 2px 9px rgba(0,0,0,.10);
    }
    .climate-control ha-icon { --mdc-icon-size: 24px; color: var(--secondary-text-color); }
    .climate-control.active { background: color-mix(in srgb, var(--primary-color) 13%, var(--card-background-color)); border-color: color-mix(in srgb, var(--primary-color) 32%, var(--divider-color)); }
    .climate-control.active ha-icon { color: var(--primary-color); }
    .climate-control.pending-start { background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); border-color: color-mix(in srgb, var(--primary-color) 22%, var(--divider-color)); }
    .climate-control.pending-start ha-icon { color: var(--primary-color); animation: svHeroClimatePending 1.2s ease-in-out infinite; }
    .climate-control.pending-stop { background: color-mix(in srgb, var(--error-color) 10%, var(--card-background-color)); border-color: color-mix(in srgb, var(--error-color) 38%, var(--divider-color)); }
    .climate-control.pending-stop ha-icon { color: var(--error-color); animation: svHeroClimatePending 1.2s ease-in-out infinite; }
    .climate-control:disabled { cursor: default; }
    .temperature-badge {
      right: 18px; min-height: 36px; padding: 0 12px; border: 1px solid var(--divider-color); border-radius: 13px;
      background: color-mix(in srgb, var(--card-background-color) 92%, transparent); color: var(--primary-text-color);
      display: inline-flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 9px rgba(0,0,0,.07); font-size: 14px; font-weight: 600;
    }
    .temperature-badge ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
    .temperature-badge.fresh { border-color: color-mix(in srgb, var(--primary-color) 36%, var(--divider-color)); background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); }
    .temperature-badge.fresh ha-icon { color: var(--primary-color); }
    .status { min-height: 8px; margin-top: -4px; display: flex; justify-content: center; align-items: center; }
    .status:not(:empty) { min-height: 34px; margin-bottom: 3px; }
    .status-pill { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 32px; padding: 0 15px; border-radius: 999px; background: color-mix(in srgb, var(--primary-color) 9%, var(--card-background-color)); box-shadow: 0 2px 8px rgba(0,0,0,.07); color: var(--primary-text-color); font-size: 13px; font-weight: 600; white-space: nowrap; }
    .status-pill ha-icon { color: var(--primary-color); --mdc-icon-size: 18px; }
    .energy {
      width: min(100%, 680px); box-sizing: border-box; justify-self: center; display: grid;
      grid-template-columns: 46px minmax(0, 1fr) minmax(125px, .75fr);
      grid-template-areas: "icon label detailLabel" "icon level detailValue" "fill fill fill" "secondary secondary secondary";
      align-items: center; column-gap: 12px; padding: 8px 8px 4px; text-align: left;
    }
    .energy.battery { grid-area: battery; --accent: var(--success-color, #2eaf5d); }
    .energy.battery.active { --accent: var(--primary-color, #2196f3); }
    .energy.fuel { grid-area: fuel; --accent: var(--warning-color, #ef8b00); }
    .icon { grid-area: icon; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 11%, transparent); color: var(--accent); }
    .icon ha-icon { --mdc-icon-size: 25px; }
    .label { grid-area: label; color: var(--primary-text-color); font-size: 15px; font-weight: 650; }
    .metric-button { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; line-height: inherit; text-align: inherit; cursor: pointer; border-radius: 8px; }
    .metric-button:hover { background: color-mix(in srgb, var(--primary-color) 7%, transparent); }
    .level { grid-area: level; margin-top: 2px; color: var(--accent); font-size: clamp(30px, 5cqw, 46px); font-weight: 650; letter-spacing: -.02em; line-height: 1.04; }
    .level small { font-size: .58em; font-weight: 500; }
    .fill { grid-area: fill; width: 100%; height: 7px; margin: 8px 0 2px; overflow: visible; border-radius: 999px; background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent); }
    .fill-value { height: 100%; border-radius: inherit; background: var(--accent); transition: width .2s ease; }
    .fill.unavailable .fill-value { width: 0 !important; }
    .battery.charging .fill-value { animation: svHeroChargePulse 1.5s ease-in-out infinite; }
    .detail-label { grid-area: detailLabel; text-align: right; color: var(--secondary-text-color); font-size: 13px; }
    .detail-value { grid-area: detailValue; text-align: right; color: var(--primary-text-color); font-size: 21px; font-weight: 650; margin-top: 2px; white-space: nowrap; }
    .detail-value small { font-size: .6em; font-weight: 500; }
    .secondary { grid-area: secondary; min-height: 18px; margin-top: 5px; text-align: right; color: var(--secondary-text-color); font-size: 12px; }
    .secondary .metric-button { color: var(--primary-text-color); font-weight: 600; margin-left: 5px; }
    .message { padding: 16px; color: var(--secondary-text-color); }
    @keyframes svHeroChargePulse { 0%, 100% { filter: brightness(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color) 12%, transparent); } 50% { filter: brightness(1.18); box-shadow: 0 0 15px 4px color-mix(in srgb, var(--primary-color) 52%, transparent); } }
    @keyframes svHeroClimatePending { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    @container (max-width: 760px) {
      .hero { padding: 14px 16px 18px; gap: 7px; }
      .picture { min-height: 250px; }
      .picture img { width: min(108%, 640px); max-height: 270px; transform: translateX(14px) scale(1.65); }
      .top-control { top: 12px; }
      .climate-control { left: 12px; width: 44px; height: 44px; }
      .temperature-badge { right: 12px; min-height: 34px; padding: 0 10px; }
      .energy { grid-template-columns: 40px minmax(0, 1fr) minmax(105px, .8fr); column-gap: 10px; padding: 7px 4px 3px; }
      .icon { width: 40px; height: 40px; }
      .level { font-size: 30px; }
      .detail-value { font-size: 19px; }
    }
    @container (max-width: 430px) {
      .picture { min-height: 175px; }
      .picture img { max-height: 205px; transform: scale(1.22); }
      .energy { grid-template-columns: 40px minmax(0, 1fr) minmax(96px, .8fr); }
      .level { font-size: 27px; }
      .detail-value { font-size: 18px; }
    }
  `;

  constructor() {
    super();
    this._hass = undefined;
    this._config = {};
    this._climatePendingUntil = 0;
    this._climatePendingAction = undefined;
    this._climatePendingTimer = undefined;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._climatePendingTimer) clearTimeout(this._climatePendingTimer);
  }

  setConfig(config) { this._config = { ...(config || {}) }; }

  set hass(hass) {
    this._hass = hass;
    if (this._climatePendingAction) {
      const selected = this._selected();
      const mapped = selected?.[1]?.attributes?.entity_mapping || {};
      const state = mapped.preconditioning ? hass.states?.[mapped.preconditioning] : undefined;
      if (usable(state)) {
        const active = isOn(state.state);
        if ((this._climatePendingAction === "start" && active) || (this._climatePendingAction === "stop" && !active)) {
          this._clearClimatePending();
        }
      }
    }
    this.requestUpdate();
  }

  get hass() { return this._hass; }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return {}; }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, rows: 5, min_columns: 6, min_rows: 4 }; }

  _i18nContext() {
    const explicit = String(this._config?.language || "").trim();
    return explicit ? { language: explicit } : (this._hass || this._config);
  }
  _text() { return textFor(this._i18nContext(), "dualEnergyOverview"); }
  _dashboardText() { return textFor(this._i18nContext(), "dashboard"); }
  _selected() { if (!this._hass) return undefined; const candidates = statusCandidates(this._hass, this._config.entry_id); return candidates.length === 1 ? candidates[0] : undefined; }
  _showMore(entityId) { if (!entityId) return; this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } })); }
  _formatValue(entityId, digits = 0) { const value = numeric(this._hass?.states?.[entityId]); if (value === null) return "—"; return new Intl.NumberFormat(localeFor(this._i18nContext()), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value); }
  _percent(entityId) { return clampPercent(numeric(this._hass?.states?.[entityId])); }

  _navigate(path) {
    if (!path || typeof window === "undefined") return;
    const target = new URL(path, window.location.origin);
    window.history.pushState(null, "", `${target.pathname}${target.search}${target.hash}`);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }

  _mode(attributes, mapped) {
    const state = (id) => this._hass?.states?.[id];
    const charging = isOn(state(mapped.battery_charging)?.state);
    const driving = isOn(state(mapped.engine)?.state);
    const plugged = isOn(state(mapped.battery_plugged)?.state);
    return {
      name: charging ? "charging" : driving ? "driving" : plugged ? "plugged" : "idle",
      charging,
      driving,
      plugged,
      chargePower: metricEntity(this._hass, attributes, "current_charge_power"),
    };
  }

  _status(mode) {
    const text = this._text();
    if (mode.charging) return { icon: "mdi:battery-charging", label: text.charging };
    if (mode.driving) return { icon: "mdi:car", label: text.driving };
    if (mode.plugged) return { icon: "mdi:ev-plug-type2", label: text.plugged };
    return null;
  }

  _fuelConsumptionEntity(mapped, mode) {
    if (!mode.driving || !mapped.fuel_consumption_instant) return null;
    const fuelState = this._hass?.states?.[mapped.fuel_consumption_instant];
    const engineState = this._hass?.states?.[mapped.engine];
    if (numeric(fuelState) === null) return null;
    const updated = sourceTimestamp(fuelState);
    const started = timestamp({ last_updated: engineState?.last_changed, last_changed: engineState?.last_changed });
    if (started !== null && (updated === null || updated < started)) return null;
    if (updated !== null && Date.now() - updated > 30 * 60 * 1000) return null;
    return mapped.fuel_consumption_instant;
  }

  _temperatureFresh(mapped) {
    const state = this._hass?.states?.[mapped.temperature];
    if (numeric(state) === null) return false;
    const updated = sourceTimestamp(state);
    if (updated === null) return false;
    const age = Date.now() - updated;
    return age >= -5 * 60 * 1000 && age <= FRESH_VEHICLE_DATA_MS;
  }

  _clearClimatePending() {
    this._climatePendingUntil = 0;
    this._climatePendingAction = undefined;
    if (this._climatePendingTimer) clearTimeout(this._climatePendingTimer);
    this._climatePendingTimer = undefined;
    this.requestUpdate();
  }

  _sendClimate(mapped) {
    if (Date.now() < this._climatePendingUntil || !this._hass?.callService) return;
    const activeState = this._hass?.states?.[mapped.preconditioning];
    const active = isOn(activeState?.state);
    const action = active ? "stop" : "start";
    const entityId = active ? mapped.preconditioning_stop : mapped.preconditioning_start;
    if (!entityId) return;

    this._climatePendingAction = action;
    this._climatePendingUntil = Date.now() + CLIMATE_COMMAND_GUARD_MS;
    if (this._climatePendingTimer) clearTimeout(this._climatePendingTimer);
    this._climatePendingTimer = setTimeout(() => this._clearClimatePending(), CLIMATE_COMMAND_GUARD_MS);
    this.requestUpdate();

    const result = this._hass.callService("button", "press", { entity_id: entityId });
    if (result?.catch) result.catch(() => this._clearClimatePending());
  }

  render() {
    const text = this._text();
    const dashboardText = this._dashboardText();
    if (!this._hass) return nothing;
    const selected = this._selected();
    if (!selected) {
      const all = statusCandidates(this._hass);
      const message = all.length > 1 && !this._config.entry_id ? text.multipleVehicles : this._config.entry_id ? text.unavailable : text.noInstance;
      return html`<ha-card><div class="message">${message}</div></ha-card>`;
    }

    const [, status] = selected;
    const attributes = status.attributes || {};
    const mapped = attributes.entity_mapping || {};
    const tracker = attributes.vehicle_tracker;
    const picture = tracker ? this._hass.states?.[tracker]?.attributes?.entity_picture : undefined;
    const vehicleDashboardPath = dashboardPath(attributes, this._config.navigation_path);
    const mode = this._mode(attributes, mapped);
    const statusLine = this._status(mode);

    const battery = this._formatValue(mapped.battery, 0);
    const electricRange = this._formatValue(mapped.autonomy, 0);
    const fuel = this._formatValue(mapped.fuel, 0);
    const fuelRange = this._formatValue(mapped.fuel_autonomy, 0);
    const batteryPercent = this._percent(mapped.battery);
    const fuelPercent = this._percent(mapped.fuel);
    const chargePower = mode.charging ? this._formatValue(mode.chargePower, 1) : "—";
    const fuelConsumptionEntity = this._fuelConsumptionEntity(mapped, mode);
    const fuelConsumption = fuelConsumptionEntity ? this._formatValue(fuelConsumptionEntity, 1) : "—";

    const temperature = this._formatValue(mapped.temperature, 0);
    const temperatureState = this._hass.states?.[mapped.temperature];
    const temperatureUnit = temperatureState?.attributes?.unit_of_measurement || "°C";
    const temperatureFresh = this._temperatureFresh(mapped);
    const climateState = this._hass.states?.[mapped.preconditioning];
    const climateActive = isOn(climateState?.state);
    const climatePending = Date.now() < this._climatePendingUntil && Boolean(this._climatePendingAction);
    const climateAction = climateActive ? "stop" : "start";
    const climateActionEntity = climateActive ? mapped.preconditioning_stop : mapped.preconditioning_start;
    const temperatureNumber = numeric(temperatureState);
    const climateIcon = climateActive && temperatureNumber !== null && temperatureNumber <= 20 ? "mdi:radiator" : "mdi:air-conditioner";
    const climateLabel = climateActive ? dashboardText.stopClimate : dashboardText.startClimate;

    const pictureContent = picture
      ? html`<img src=${picture} alt="" />`
      : html`<ha-icon class="placeholder" icon="mdi:car" style="--mdc-icon-size:110px"></ha-icon>`;

    return html`
      <ha-card>
        <div class="hero">
${(mapped.preconditioning_start || mapped.preconditioning_stop) ? html`
  <button class="top-control climate-control ${climateActive ? "active" : ""} ${climatePending ? `pending-${this._climatePendingAction}` : ""}" type="button"
    ?disabled=${climatePending || !climateActionEntity} aria-label=${climateLabel} title=${climateLabel}
    data-action=${climateAction} @click=${(event) => { event.stopPropagation(); this._sendClimate(mapped); }}>
    <ha-icon icon=${climateIcon}></ha-icon>
  </button>` : nothing}
${mapped.temperature ? html`
  <button class="top-control temperature-badge ${temperatureFresh ? "fresh" : ""}" type="button" @click=${(event) => { event.stopPropagation(); this._showMore(mapped.temperature); }}>
    <ha-icon icon="mdi:thermometer"></ha-icon><span>${temperature}${temperature === "—" ? "" : ` ${temperatureUnit}`}</span>
  </button>` : nothing}

<div class="vehicle">
  <div class="picture">
    ${vehicleDashboardPath
      ? html`<button class="picture-button" type="button" aria-label=${text.vehicle} title=${text.vehicle} @click=${(event) => { event.stopPropagation(); this._navigate(vehicleDashboardPath); }}>${pictureContent}</button>`
      : pictureContent}
  </div>
  <div class="status">${statusLine ? html`<div class="status-pill"><ha-icon icon=${statusLine.icon}></ha-icon><span>${statusLine.label}</span></div>` : nothing}</div>
</div>

<div class="energy battery ${mode.charging || mode.driving ? "active" : ""} ${mode.charging ? "charging" : ""}">
  <div class="icon"><ha-icon icon="mdi:lightning-bolt"></ha-icon></div>
  <div class="label">${text.battery}</div>
  <button class="metric-button level" type="button" @click=${() => this._showMore(mapped.battery)}>${battery}<small>${battery === "—" ? "" : " %"}</small></button>
  <div class="fill ${batteryPercent === null ? "unavailable" : ""}" aria-hidden="true"><div class="fill-value" style=${`width:${batteryPercent ?? 0}%`}></div></div>
  <div class="detail-label">${dashboardText.range}</div>
  <button class="metric-button detail-value" type="button" @click=${() => this._showMore(mapped.autonomy)}>${electricRange}<small>${electricRange === "—" ? "" : " km"}</small></button>
  <div class="secondary">${mode.charging && chargePower !== "—" ? html`${text.chargePower}<button class="metric-button" type="button" @click=${() => this._showMore(mode.chargePower)}>${chargePower} kW</button>` : nothing}</div>
</div>

<div class="energy fuel">
  <div class="icon"><ha-icon icon="mdi:gas-station"></ha-icon></div>
  <div class="label">${text.fuel}</div>
  <button class="metric-button level" type="button" @click=${() => this._showMore(mapped.fuel)}>${fuel}<small>${fuel === "—" ? "" : " %"}</small></button>
  <div class="fill ${fuelPercent === null ? "unavailable" : ""}" aria-hidden="true"><div class="fill-value" style=${`width:${fuelPercent ?? 0}%`}></div></div>
  <div class="detail-label">${dashboardText.range}</div>
  <button class="metric-button detail-value" type="button" @click=${() => this._showMore(mapped.fuel_autonomy)}>${fuelRange}<small>${fuelRange === "—" ? "" : " km"}</small></button>
  <div class="secondary">${fuelConsumptionEntity && fuelConsumption !== "—" ? html`${text.fuelConsumption}<button class="metric-button" type="button" @click=${() => this._showMore(fuelConsumptionEntity)}>${fuelConsumption} l/100 km</button>` : nothing}</div>
</div>
        </div>
      </ha-card>`;
  }
}

class SvDashboardDualEnergyOverviewCardEditor extends HTMLElement {
  constructor() { super(); this._config = {}; this._hass = undefined; }
  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  connectedCallback() { this._render(); }
  _i18nContext() { const explicit = String(this._config?.language || "").trim(); return explicit ? { language: explicit } : (this._hass || this._config); }
  _text() { return textFor(this._i18nContext(), "dualEnergyOverview"); }
  _emit(entryId) { const next = { ...this._config }; if (entryId) next.entry_id = entryId; else delete next.entry_id; this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: next } })); }
  _render() {
    if (!this.isConnected || !this._hass) return;
    const text = this._text();
    const candidates = statusCandidates(this._hass);
    const fallback = (index) => `${text.vehicle} ${index + 1}`;
    if (!candidates.length) { this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${text.noInstance}</div>`; return; }
    if (candidates.length === 1) { this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${text.auto.replace("{vehicle}", candidateLabel(this._hass, candidates[0], fallback(0)))}</div>`; return; }
    const options = candidates.map((candidate, index) => { const id = candidate[1]?.attributes?.entry_id || ""; const selected = id === this._config.entry_id ? " selected" : ""; return `<option value="${id}"${selected}>${candidateLabel(this._hass, candidate, fallback(index))}</option>`; }).join("");
    this.innerHTML = `<label style="display:block;padding:8px 0;font-weight:500">${text.vehicle}</label><select id="vehicle" style="box-sizing:border-box;width:100%;min-height:42px;padding:0 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)"><option value="">${text.selectVehicle}</option>${options}</select>`;
    this.querySelector("#vehicle")?.addEventListener("change", (event) => this._emit(event.target.value));
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, SvDashboardDualEnergyOverviewCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, SvDashboardDualEnergyOverviewCardEditor);
window.customCards = window.customCards || [];
const registrationText = textFor({ locale: { language: typeof navigator !== "undefined" ? navigator.language : "en" } }, "dualEnergyOverview");
if (!window.customCards.some((card) => card.type === CARD_TAG)) window.customCards.push({ type: CARD_TAG, name: registrationText.cardName, description: registrationText.cardDescription, preview: true });
