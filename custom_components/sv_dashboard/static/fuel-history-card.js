import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { localeFor, textFor } from "./i18n.js?v=0.6.0-beta.15";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-fuel-history-card";
const EDITOR_TAG = "sv-dashboard-fuel-history-card-editor";

const statusCandidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([entityId, state]) => {
  const attributes = state?.attributes || {};
  return entityId.startsWith("sensor.") && attributes.integration_domain === STATUS_DOMAIN && typeof attributes.entity_mapping === "object" && (!entryId || attributes.entry_id === entryId);
});
const candidateLabel = (hass, candidate, index = 0) => {
  const attributes = candidate?.[1]?.attributes || {};
  const vehicle = attributes.entity_mapping?.vehicle ? hass?.states?.[attributes.entity_mapping.vehicle] : undefined;
  const overviewText = textFor(hass || {}, "vehicleOverview");
  const fallback = String(overviewText.vehicleFallback || "{number}").replace("{number}", String(index + 1));
  return String(vehicle?.attributes?.friendly_name || attributes.vehicle_slug || fallback);
};
const numeric = (value) => { const parsed = Number.parseFloat(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; };

class SvDashboardFuelHistoryCard extends LitElement {
  static properties = {
    _hass: { state: true }, _config: { state: true }, _events: { state: true },
    _summary: { state: true }, _loading: { state: true }, _error: { state: true }, _loadKey: { state: false },
  };

  static styles = css`
    :host { display:block; }
    ha-card { overflow:hidden; }
    .content { padding:14px 16px 16px; }
    .hint { color:var(--secondary-text-color); font-size:12px; line-height:1.4; margin:0 0 12px; }
    .summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:0 0 14px; }
    .summary-item { border:1px solid var(--divider-color); border-radius:12px; padding:9px 10px; background:color-mix(in srgb,var(--primary-color) 4%,var(--card-background-color)); min-width:0; }
    .summary-label { color:var(--secondary-text-color); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .summary-value { color:var(--primary-text-color); font-size:18px; font-weight:650; margin-top:2px; white-space:nowrap; }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; color:var(--secondary-text-color); font-size:12px; font-weight:500; padding:0 10px 8px 0; white-space:nowrap; }
    td { border-top:1px solid var(--divider-color); padding:10px 10px 10px 0; white-space:nowrap; }
    td:first-child { white-space:normal; }
    .liters { color:var(--warning-color,#ef6c00); font-weight:600; }
    .muted { color:var(--secondary-text-color); }
    .error { color:var(--error-color); }
    .scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    @container (max-width:520px) { .summary { grid-template-columns:1fr; } }
  `;

  constructor() {
    super();
    this._hass = undefined;
    this._config = {};
    this._events = [];
    this._summary = null;
    this._loading = false;
    this._error = null;
    this._loadKey = "";
  }

  setConfig(config) { this._config = { max_events: 50, ...(config || {}) }; this._loadKey = ""; this._maybeLoad(); }
  set hass(hass) { this._hass = hass; this._maybeLoad(); this.requestUpdate(); }
  get hass() { return this._hass; }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return {}; }
  getCardSize() { return 4; }
  _text() { return textFor(this._hass || {}, "fuelHistory"); }
  _tripText() { return textFor(this._hass || {}, "tripHistory"); }
  _dashboardText() { return textFor(this._hass || {}, "dashboard"); }
  _selected() { if (!this._hass) return undefined; const candidates = statusCandidates(this._hass, this._config.entry_id); return candidates.length === 1 ? candidates[0] : undefined; }

  async _maybeLoad() {
    if (!this._hass || !this._config || this._loading) return;
    const selected = this._selected();
    if (!selected) return;
    const attributes = selected[1]?.attributes || {};
    const mapped = attributes.entity_mapping || {};
    const fuelChanged = mapped.fuel ? this._hass.states?.[mapped.fuel]?.last_changed : "";
    const mileageChanged = mapped.mileage ? this._hass.states?.[mapped.mileage]?.last_changed : "";
    const key = [attributes.entry_id, fuelChanged, mileageChanged].join("|");
    if (!attributes.entry_id || key === this._loadKey) return;
    this._loadKey = key;
    this._loading = true;
    this._error = null;
    try {
      const response = await this._hass.callWS({ type: `${STATUS_DOMAIN}/fuel_history`, entry_id: attributes.entry_id });
      const events = Array.isArray(response?.events) ? response.events : [];
      const maxEvents = Math.max(0, Number(this._config.max_events) || 50);
      this._events = events.slice(0, maxEvents);
      this._summary = response?.summary || null;
    } catch (error) {
      this._events = [];
      this._summary = null;
      this._error = String(error?.message || error);
    } finally {
      this._loading = false;
      this.requestUpdate();
    }
  }

  _date(value) { const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) return "—"; return new Intl.DateTimeFormat(localeFor(this._hass), { dateStyle:"medium", timeStyle:"short" }).format(parsed); }
  _num(value, digits = 0) { const parsed = numeric(value); return parsed === null ? "—" : new Intl.NumberFormat(localeFor(this._hass), { minimumFractionDigits:digits, maximumFractionDigits:digits }).format(parsed); }
  _duration(seconds) { const parsed = numeric(seconds); if (parsed === null || parsed < 0) return "—"; const hours = Math.floor(parsed / 3600); const minutes = Math.floor((parsed % 3600) / 60); return `${hours}:${String(minutes).padStart(2, "0")} h`; }
  _liters(event) { if (event?.liters === null || event?.liters === undefined) return "—"; const prefix = event.liters_estimated ? "≈ " : ""; return `${prefix}${this._num(event.liters, 1)} l`; }

  render() {
    const text = this._text();
    const tripText = this._tripText();
    const dashboardText = this._dashboardText();
    if (!this._hass) return nothing;
    const selected = this._selected();
    if (!selected) {
      const all = statusCandidates(this._hass);
      const message = all.length > 1 && !this._config.entry_id ? text.multipleVehicles : this._config.entry_id ? text.unavailable : text.noInstance;
      return html`<ha-card><div class="content muted">${message}</div></ha-card>`;
    }
    const summary = this._summary;
    return html`<ha-card .header=${this._config.title || text.title}><div class="content">
      <p class="hint">${text.hint}</p>
      ${summary ? html`<div class="summary">
        <div class="summary-item"><div class="summary-label">${tripText.distance}</div><div class="summary-value">${summary.distance_km === null || summary.distance_km === undefined ? "—" : `${this._num(summary.distance_km,1)} km`}</div></div>
        <div class="summary-item"><div class="summary-label">${tripText.duration}</div><div class="summary-value">${this._duration(summary.driving_time_seconds)}</div></div>
        <div class="summary-item"><div class="summary-label">${tripText.average}</div><div class="summary-value">${summary.average_speed_kmh === null || summary.average_speed_kmh === undefined ? "—" : `${this._num(summary.average_speed_kmh,1)} km/h`}</div></div>
        <div class="summary-item"><div class="summary-label">${dashboardText.fuelConsumption}</div><div class="summary-value">${summary.fuel_consumption_l_100km === null || summary.fuel_consumption_l_100km === undefined ? "—" : `${this._num(summary.fuel_consumption_l_100km,1)} l/100 km`}</div></div>
      </div>` : nothing}
      ${this._loading && !this._events.length ? html`<span class="muted">${text.loading}</span>` : nothing}
      ${this._error ? html`<span class="error">${text.error} ${this._error}</span>` : nothing}
      ${!this._loading && !this._error && !this._events.length ? html`<span class="muted">${text.empty}</span>` : nothing}
      ${this._events.length ? html`<div class="scroll"><table><thead><tr><th>${text.date}</th><th>${text.liters}</th><th>${dashboardText.mileage}</th><th>${text.level}</th></tr></thead><tbody>
        ${this._events.map((event) => html`<tr>
          <td>${this._date(event.source_time)}</td>
          <td class="liters">${this._liters(event)}</td>
          <td>${event.odometer_km === null || event.odometer_km === undefined ? "—" : `${this._num(event.odometer_km,1)} km`}</td>
          <td>${this._num(event.fuel_before_percent,0)} % → ${this._num(event.fuel_after_percent,0)} %</td>
        </tr>`)}
      </tbody></table></div>` : nothing}
    </div></ha-card>`;
  }
}

class SvDashboardFuelHistoryCardEditor extends HTMLElement {
  constructor() { super(); this._config = {}; this._hass = undefined; }
  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  connectedCallback() { this._render(); }
  _text() { return textFor(this._hass || {}, "fuelHistory"); }
  _emit(entryId) { const next={...this._config}; if(entryId) next.entry_id=entryId; else delete next.entry_id; this.dispatchEvent(new CustomEvent("config-changed",{bubbles:true,composed:true,detail:{config:next}})); }
  _render() {
    if (!this.isConnected || !this._hass) return;
    const text=this._text(); const candidates=statusCandidates(this._hass);
    if (!candidates.length) { this.innerHTML=`<div style="padding:12px 0;color:var(--secondary-text-color)">${text.noInstance}</div>`; return; }
    if (candidates.length===1) { this.innerHTML=`<div style="padding:12px 0;color:var(--secondary-text-color)">${text.auto.replace("{vehicle}",candidateLabel(this._hass,candidates[0],0))}</div>`; return; }
    const options=candidates.map((candidate,index)=>{const id=candidate[1]?.attributes?.entry_id||"";return `<option value="${id}"${id===this._config.entry_id?" selected":""}>${candidateLabel(this._hass,candidate,index)}</option>`;}).join("");
    this.innerHTML=`<label style="display:block;padding:8px 0;font-weight:500">${text.vehicle}</label><select id="vehicle" style="box-sizing:border-box;width:100%;min-height:42px;padding:0 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)"><option value="">${text.selectVehicle}</option>${options}</select>`;
    this.querySelector("#vehicle")?.addEventListener("change",event=>this._emit(event.target.value));
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG,SvDashboardFuelHistoryCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG,SvDashboardFuelHistoryCardEditor);
window.customCards=window.customCards||[];
const registrationText=textFor({locale:{language:typeof navigator!=="undefined"?navigator.language:"en"}},"fuelHistory");
if(!window.customCards.some(card=>card.type===CARD_TAG)) window.customCards.push({type:CARD_TAG,name:registrationText.cardName,description:registrationText.cardDescription,preview:true});
