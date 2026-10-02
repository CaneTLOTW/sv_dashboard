import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { textFor } from "./i18n.js?v=0.6.0-beta.39";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-vehicle-diagnostics-card";
const MAX_COPY_EVENTS = 80;
const MAX_COPY_LENGTH = 24000;
const WINDOWS = [1800, 7200, 21600, 86400];

const statusCandidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([entityId, state]) => {
  const attributes = state?.attributes || {};
  return entityId.startsWith("sensor.") &&
    attributes.integration_domain === STATUS_DOMAIN &&
    typeof attributes.entity_mapping === "object" &&
    (!entryId || attributes.entry_id === entryId);
});

const formatWindow = (seconds, text) => {
  const key = ({ 1800: "window30m", 7200: "window2h", 21600: "window6h", 86400: "window24h" })[seconds];
  return text[key] || text.window2h;
};

class SvDashboardVehicleDiagnosticsCard extends LitElement {
  static properties = {
    _hass: { state: true },
    _config: { state: true },
    _duration: { state: true },
    _running: { state: true },
    _loaded: { state: true },
    _report: { state: true },
    _error: { state: true },
    _copied: { state: true },
  };

  static styles = css`
    :host { display:block; }
    .content { padding:14px 16px 16px; }
    .hint,.meta { color:var(--secondary-text-color); font-size:13px; line-height:1.45; }
    .hint { margin:0 0 12px; }
    .actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:0 0 12px; }
    select { min-height:40px; max-width:100%; border:1px solid var(--divider-color); border-radius:8px; padding:0 10px; color:var(--primary-text-color); background:var(--card-background-color); font:inherit; }
    ha-button { min-width:0; }
    .meta { margin:8px 0; overflow-wrap:anywhere; }
    .error { color:var(--error-color); overflow-wrap:anywhere; }
    .timeline { display:grid; gap:7px; margin-top:10px; }
    .event { min-width:0; border:1px solid var(--divider-color); border-radius:9px; padding:0 10px; }
    .event summary { display:grid; grid-template-columns:82px minmax(0,1fr) auto 16px; align-items:center; gap:9px; min-height:42px; cursor:pointer; list-style:none; }
    .event summary::-webkit-details-marker { display:none; }
    .time { color:var(--secondary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
    .signal { min-width:0; overflow-wrap:anywhere; font-weight:600; }
    .value { max-width:48vw; overflow-wrap:anywhere; text-align:right; }
    .detail { display:grid; gap:4px; padding:0 0 9px 91px; color:var(--secondary-text-color); font-size:12px; overflow-wrap:anywhere; }
    .evidence { color:var(--secondary-text-color); font-size:11px; }
    .expand { color:var(--secondary-text-color); font-size:16px; text-align:center; }
    @media (max-width:520px) {
      .content { padding:12px; }
      .actions { align-items:stretch; }
      .actions select { flex:1 1 100%; }
      .event summary { grid-template-columns:62px minmax(0,1fr); gap:5px 8px; padding:7px 0; }
      .value { grid-column:2; max-width:none; text-align:left; }
      .expand { grid-column:1; grid-row:2; }
      .detail { padding-left:70px; }
    }
  `;

  constructor() {
    super();
    this._hass = undefined;
    this._config = {};
    this._duration = 7200;
    this._running = false;
    this._loaded = false;
    this._report = null;
    this._error = null;
    this._copied = false;
    this._initialLoadQueued = false;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    if (!this._report) this._loaded = false;
    this._scheduleInitialLoad();
  }
  set hass(hass) {
    this._hass = hass;
    this.requestUpdate();
    this._scheduleInitialLoad();
  }
  get hass() { return this._hass; }
  getCardSize() { return 6; }

  _scheduleInitialLoad() {
    if (this._loaded || this._running || this._initialLoadQueued || !this._hass) return;
    this._initialLoadQueued = true;
    queueMicrotask(() => {
      this._initialLoadQueued = false;
      if (!this._loaded) this._load();
    });
  }

  _text() { return textFor(this._hass || {}, "vehicleDiagnostics"); }
  _dashboardText() { return textFor(this._hass || {}, "dashboard"); }

  _selected() {
    const candidates = statusCandidates(this._hass, this._config.entry_id);
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  async _load() {
    if (this._running || !this._hass) return;
    const selected = this._selected();
    const entryId = selected?.[1]?.attributes?.entry_id;
    if (!entryId) {
      this._loaded = true;
      this.requestUpdate();
      return;
    }
    this._running = true;
    this._error = null;
    this._copied = false;
    try {
      this._report = await this._hass.callWS({
        type: `${STATUS_DOMAIN}/vehicle_diagnostics`,
        entry_id: entryId,
        duration_seconds: this._duration,
      });
    } catch (error) {
      this._report = null;
      this._error = String(error?.message || error);
    } finally {
      this._running = false;
      this._loaded = true;
      this.requestUpdate();
    }
  }

  _onWindowChange(event) {
    const value = Number(event.currentTarget.value);
    if (WINDOWS.includes(value)) this._duration = value;
  }

  _signalLabel(signal) {
    const dashboard = this._dashboardText();
    const text = this._text();
    return ({
      refresh_interval: dashboard.refreshInterval,
      preconditioning: dashboard.climate,
      temperature: dashboard.temperature,
      command_status: dashboard.commandStatus,
      remote_availability: dashboard.remote,
      charging: dashboard.chargeStatus,
      battery: dashboard.battery,
      vehicle_data: text.vehicleData,
    })[signal] || text.vehicleData;
  }

  _time(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
  }

  _markdown() {
    if (!this._report) return "";
    const report = this._report;
    const text = this._text();
    const events = Array.isArray(report.events) ? report.events : [];
    const selected = events.slice(-MAX_COPY_EVENTS);
    const lines = [
      `## ${text.exportTitle}`,
      "",
      `- ${text.version}: ${report.package_version || "—"}`,
      `- ${text.selectedWindow}: ${formatWindow(report.duration_seconds, text)}`,
      `- ${text.currentRefresh}: ${report.current_refresh_interval ? `${report.current_refresh_interval.value} ${report.current_refresh_interval.unit}` : "—"}`,
      `- ${text.rawResultCode}: ${text.rawCodeNotRecorded}`,
      "",
      `### ${text.timeline}`,
      "",
    ];
    for (const event of selected) {
      const value = [event.value, event.unit].filter(Boolean).join(" ") || "—";
      const source = event.source_time
        ? ` · ${text.sourceTimestamp}: ${event.source_time}`
        : ` · ${text.haTimestamp}: ${event.event_time}`;
      const evidence = event.vehicle_data_evidence ? ` · ${text.telemetryEvidence}` : "";
      lines.push(`- ${event.event_time} · ${this._signalLabel(event.signal)}: ${value}${source}${evidence}`);
    }
    if (report.truncated || events.length > MAX_COPY_EVENTS) lines.push(`\n${text.truncated}`);
    lines.push(`\n${text.rawCodeNotRecorded}`);
    return lines.join("\n").slice(0, MAX_COPY_LENGTH);
  }

  async _writeClipboard(value) {
    if (typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard unavailable");
  }

  async _copy() {
    const value = this._markdown();
    if (!value) return;
    try {
      await this._writeClipboard(value);
      this._copied = true;
      this._error = null;
    } catch (error) {
      this._error = String(error?.message || error);
    }
    this.requestUpdate();
    window.setTimeout(() => { this._copied = false; this.requestUpdate(); }, 2500);
  }

  render() {
    const text = this._text();
    if (!this._hass) return nothing;
    const selected = this._selected();
    if (!selected) return html`<ha-card .header=${text.title}><div class="content"><p class="hint">${text.noSignals}</p></div></ha-card>`;

    const report = this._report;
    const events = Array.isArray(report?.events) ? report.events : [];
    const refresh = report?.current_refresh_interval;
    return html`<ha-card .header=${text.title}><div class="content">
      <p class="hint">${text.hint}</p>
      <div class="actions">
        <select aria-label=${text.timeWindow} .value=${String(this._duration)} @change=${this._onWindowChange}>
          ${WINDOWS.map(seconds => html`<option value=${seconds} ?selected=${this._duration === seconds}>${formatWindow(seconds, text)}</option>`)}
        </select>
        <ha-button @click=${this._load} .disabled=${this._running}>${this._running ? text.loading : text.reload}</ha-button>
        <ha-button @click=${this._copy} .disabled=${!report || this._running}>${this._copied ? text.copied : text.copy}</ha-button>
      </div>
      ${refresh ? html`<div class="meta">${text.currentRefresh}: ${refresh.value} ${refresh.unit}</div>` : nothing}
      ${this._error ? html`<div class="error">${text.error}: ${this._error}</div>` : nothing}
      ${this._running && !report ? html`<div class="meta" role="status">${text.loading}</div>` : nothing}
      ${!this._running && !this._error && this._loaded && report && events.length === 0 ? html`<div class="meta">${report.available_signals?.length ? text.empty : text.noSignals}</div>` : nothing}
      ${report?.truncated ? html`<div class="meta">${text.truncated}</div>` : nothing}
      ${report ? html`<div class="meta">${text.rawCodeNotRecorded}</div>` : nothing}
      <div class="timeline">
        ${events.map(event => html`<details class="event">
          <summary>
            <span class="time">${this._time(event.event_time)}</span>
            <span class="signal">${this._signalLabel(event.signal)}${event.vehicle_data_evidence ? html`<span class="evidence"> · ${text.telemetryEvidence}</span>` : nothing}</span>
            <span class="value">${event.value || "—"}${event.unit ? ` ${event.unit}` : ""}</span>
            <span class="expand" aria-hidden="true">⌄</span>
          </summary>
          <div class="detail">
            <span>${text.details}: ${event.event_time || "—"}</span>
            <span>${event.timestamp_source === "upstream_attribute" && event.source_time ? `${text.sourceTimestamp}: ${event.source_time}` : `${text.haTimestamp}: ${event.event_time || "—"}`}</span>
          </div>
        </details>`)}
      </div>
    </div></ha-card>`;
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, SvDashboardVehicleDiagnosticsCard);
}
