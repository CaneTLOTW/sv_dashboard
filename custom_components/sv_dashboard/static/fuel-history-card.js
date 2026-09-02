import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.6";
import { localeFor, textFor } from "./i18n.js?v=0.6.0-beta.6";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-fuel-history-card";
const EDITOR_TAG = "sv-dashboard-fuel-history-card-editor";

const statusCandidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([entityId, state]) => {
  const attributes = state?.attributes || {};
  return entityId.startsWith("sensor.") && attributes.integration_domain === STATUS_DOMAIN && typeof attributes.entity_mapping === "object" && (!entryId || attributes.entry_id === entryId);
});
const candidateLabel = (hass, candidate, index = 0) => { const a = candidate?.[1]?.attributes || {}; const vehicle = a.entity_mapping?.vehicle ? hass?.states?.[a.entity_mapping.vehicle] : undefined; return String(vehicle?.attributes?.friendly_name || a.vehicle_slug || `Vehicle ${index + 1}`); };
const numberValue = (raw) => { const value = Number.parseFloat(String(raw ?? "").replace(",", ".")); return Number.isFinite(value) ? value : null; };

class SvDashboardFuelHistoryCard extends LitElement {
  static properties = { _hass: { state: true }, _config: { state: true }, _events: { state: true }, _loading: { state: true }, _error: { state: true }, _loadKey: { state: false } };
  static styles = css`
    :host { display:block; }
    ha-card { overflow:hidden; }
    .content { padding: 14px 16px 16px; }
    .hint { color:var(--secondary-text-color); font-size:12px; line-height:1.4; margin:0 0 12px; }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; color:var(--secondary-text-color); font-size:12px; font-weight:500; padding:0 10px 8px 0; white-space:nowrap; }
    td { border-top:1px solid var(--divider-color); padding:10px 10px 10px 0; white-space:nowrap; }
    td:first-child { white-space:normal; }
    .liters { color:var(--warning-color, #ef6c00); font-weight:600; }
    .muted { color:var(--secondary-text-color); }
    .error { color:var(--error-color); }
    .scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  `;
  constructor() { super(); this._hass = undefined; this._config = {}; this._events = []; this._loading = false; this._error = null; this._loadKey = ""; }
  setConfig(config) { this._config = { hours_to_show: 2160, max_events: 50, minimum_increase: 5, ...(config || {}) }; this._loadKey = ""; this._maybeLoad(); }
  set hass(hass) { this._hass = hass; this._maybeLoad(); this.requestUpdate(); }
  get hass() { return this._hass; }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return {}; }
  getCardSize() { return 4; }
  _text() { return textFor(this._hass || {}, "fuelHistory"); }
  _selected() { if (!this._hass) return undefined; const candidates = statusCandidates(this._hass, this._config.entry_id); return candidates.length === 1 ? candidates[0] : undefined; }
  _entities() { const selected = this._selected(); const mapped = selected?.[1]?.attributes?.entity_mapping || {}; return { fuel: this._config.fuel_entity || mapped.fuel, refill: this._config.refill_entity || mapped.fuel_refill_amount || mapped.refill_amount }; }
  _normalize(raw) { return { state: raw?.state ?? raw?.s, attributes: raw?.attributes ?? raw?.a ?? {}, last_updated: raw?.last_updated ?? raw?.last_changed ?? (Number.isFinite(raw?.lu) ? new Date(raw.lu * 1000).toISOString() : undefined) }; }
  _statesFor(response, entityIds, entityId) { if (Array.isArray(response)) return Array.isArray(response[0]) ? (response[entityIds.indexOf(entityId)] ?? []) : response; return response?.[entityId] ?? []; }
  _nearestAmount(states, timestamp) { if (!states?.length || !Number.isFinite(timestamp)) return null; return states.map((state) => ({ value: numberValue(state.state), delta: Math.abs(Date.parse(state.last_updated || "") - timestamp) })).filter((item) => item.value !== null && Number.isFinite(item.delta) && item.delta <= 30 * 60 * 1000).sort((a,b) => a.delta - b.delta)[0]?.value ?? null; }
  _median(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  _detect(levelStates, refillStates) {
    const minimum = Math.max(1, Number(this._config.minimum_increase) || 5);
    const samples = levelStates.map((raw) => this._normalize(raw)).map((state) => ({ ...state, value: numberValue(state.state) })).filter((state) => state.value !== null && Number.isFinite(Date.parse(state.last_updated || ""))).sort((a,b) => Date.parse(a.last_updated) - Date.parse(b.last_updated));
    const refill = refillStates.map((raw) => this._normalize(raw)).filter((state) => Number.isFinite(Date.parse(state.last_updated || "")));
    const events = [];
    for (let index = 1; index < samples.length; index += 1) {
      const after = samples[index];
      const confirmation = samples[index + 1];
      if (!confirmation) continue;
      const baseline = this._median(samples.slice(Math.max(0, index - 3), index).map((state) => state.value));
      if (baseline === null) continue;
      const increase = after.value - baseline;
      if (increase < minimum) continue;
      // A real refuel must survive the next vehicle report. This rejects the
      // common one-sample fuel-level bounce without deriving tank volume.
      const sustainedFloor = baseline + Math.max(1, minimum * 0.6);
      if (confirmation.value < sustainedFloor) continue;
      const timestamp = Date.parse(after.last_updated);
      const confirmedAfter = Math.max(after.value, confirmation.value);
      const last = events.at(-1);
      const amount = this._nearestAmount(refill, timestamp);
      if (last && timestamp - Date.parse(last.time) <= 60 * 60 * 1000) {
        last.before = Math.min(last.before, baseline);
        last.after = Math.max(last.after, confirmedAfter);
        last.time = after.last_updated;
        if (amount !== null) last.liters = amount;
        continue;
      }
      events.push({ time: after.last_updated, before: baseline, after: confirmedAfter, liters: amount });
    }
    return events.reverse().slice(0, Math.max(0, Number(this._config.max_events) || 50));
  }
  async _maybeLoad() {
    if (!this._hass || !this._config || this._loading) return;
    const { fuel, refill } = this._entities();
    const key = [fuel, refill, this._config.hours_to_show, this._hass.states?.[fuel]?.last_changed, refill ? this._hass.states?.[refill]?.last_changed : ""].join("|");
    if (!fuel) { this._events = []; this._error = null; this._loadKey = key; return; }
    if (key === this._loadKey) return;
    this._loadKey = key; this._loading = true; this._error = null;
    try {
      const entityIds = [fuel, refill].filter(Boolean);
      const response = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - Math.max(24, Number(this._config.hours_to_show) || 2160) * 3600000).toISOString(), end_time: new Date().toISOString(), entity_ids: entityIds, minimal_response: false, no_attributes: false, significant_changes_only: true });
      this._events = this._detect(this._statesFor(response, entityIds, fuel), refill ? this._statesFor(response, entityIds, refill) : []);
    } catch (error) { this._error = String(error?.message || error); }
    finally { this._loading = false; }
  }
  _date(value) { const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) return "—"; return new Intl.DateTimeFormat(localeFor(this._hass), { dateStyle: "medium", timeStyle: "short" }).format(parsed); }
  _num(value, digits = 0) { return new Intl.NumberFormat(localeFor(this._hass), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value); }
  render() {
    const text = this._text();
    if (!this._hass) return nothing;
    const selected = this._selected();
    if (!selected) { const all = statusCandidates(this._hass); const message = all.length > 1 && !this._config.entry_id ? text.multipleVehicles : this._config.entry_id ? text.unavailable : text.noInstance; return html`<ha-card><div class="content muted">${message}</div></ha-card>`; }
    return html`<ha-card .header=${this._config.title || text.title}><div class="content"><p class="hint">${text.hint}</p>${this._loading && !this._events.length ? html`<span class="muted">${text.loading}</span>` : nothing}${this._error ? html`<span class="error">${text.error} ${this._error}</span>` : nothing}${!this._loading && !this._error && !this._events.length ? html`<span class="muted">${text.empty}</span>` : nothing}${this._events.length ? html`<div class="scroll"><table><thead><tr><th>${text.date}</th><th>${text.liters}</th><th>${text.level}</th></tr></thead><tbody>${this._events.map((event) => html`<tr><td>${this._date(event.time)}</td><td class="liters">${event.liters === null ? "—" : `${this._num(event.liters, 1)} l`}</td><td>${this._num(event.before, 0)} % → ${this._num(event.after, 0)} %</td></tr>`)}</tbody></table></div>` : nothing}</div></ha-card>`;
  }
}

class SvDashboardFuelHistoryCardEditor extends HTMLElement {
  constructor() { super(); this._config = {}; this._hass = undefined; }
  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  connectedCallback() { this._render(); }
  _text() { return textFor(this._hass || {}, "fuelHistory"); }
  _emit(entryId) { const next = { ...this._config }; if (entryId) next.entry_id = entryId; else delete next.entry_id; this.dispatchEvent(new CustomEvent("config-changed", { bubbles:true, composed:true, detail:{ config:next } })); }
  _render() { if (!this.isConnected || !this._hass) return; const text = this._text(); const candidates = statusCandidates(this._hass); if (!candidates.length) { this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${text.noInstance}</div>`; return; } if (candidates.length === 1) { this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${text.auto.replace("{vehicle}", candidateLabel(this._hass, candidates[0], 0))}</div>`; return; } const options = candidates.map((candidate,index) => { const id=candidate[1]?.attributes?.entry_id||""; return `<option value="${id}"${id===this._config.entry_id?" selected":""}>${candidateLabel(this._hass,candidate,index)}</option>`; }).join(""); this.innerHTML=`<label style="display:block;padding:8px 0;font-weight:500">${text.vehicle}</label><select id="vehicle" style="box-sizing:border-box;width:100%;min-height:42px;padding:0 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)"><option value="">${text.selectVehicle}</option>${options}</select>`; this.querySelector("#vehicle")?.addEventListener("change",(event)=>this._emit(event.target.value)); }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, SvDashboardFuelHistoryCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, SvDashboardFuelHistoryCardEditor);
window.customCards = window.customCards || [];
const registrationText = textFor({ locale: { language: typeof navigator !== "undefined" ? navigator.language : "en" } }, "fuelHistory");
if (!window.customCards.some((card) => card.type === CARD_TAG)) window.customCards.push({ type: CARD_TAG, name: registrationText.cardName, description: registrationText.cardDescription, preview: true });
