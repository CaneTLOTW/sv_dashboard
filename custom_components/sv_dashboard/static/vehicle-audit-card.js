import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { textFor } from "./i18n.js?v=0.6.0-beta.17";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-vehicle-audit-card";

const statusCandidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([entityId, state]) => {
  const attributes = state?.attributes || {};
  return entityId.startsWith("sensor.") &&
    attributes.integration_domain === STATUS_DOMAIN &&
    typeof attributes.entity_mapping === "object" &&
    (!entryId || attributes.entry_id === entryId);
});

class SvDashboardVehicleAuditCard extends LitElement {
  static properties = {
    _hass: { state: true },
    _config: { state: true },
    _running: { state: true },
    _report: { state: true },
    _error: { state: true },
    _copied: { state: true },
  };

  static styles = css`
    :host { display:block; }
    .content { padding: 14px 16px 16px; }
    .hint { color:var(--secondary-text-color); font-size:13px; line-height:1.45; margin:0 0 12px; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 14px; }
    ha-button, mwc-button { min-width:0; }
    .status { display:grid; gap:6px; margin-top:8px; }
    .row { display:grid; grid-template-columns:minmax(160px,1fr) auto; gap:12px; align-items:center; padding:8px 0; border-top:1px solid var(--divider-color); }
    .name { overflow-wrap:anywhere; }
    .result { font-weight:600; text-transform:uppercase; font-size:12px; }
    .ok { color:var(--success-color,#2e7d32); }
    .unavailable { color:var(--secondary-text-color); }
    .forbidden, .error { color:var(--error-color); }
    .meta { color:var(--secondary-text-color); font-size:12px; line-height:1.45; margin-top:10px; }
    .error-box { color:var(--error-color); margin-top:8px; overflow-wrap:anywhere; }
  `;

  constructor() {
    super();
    this._hass = undefined;
    this._config = {};
    this._running = false;
    this._report = null;
    this._error = null;
    this._copied = false;
  }

  setConfig(config) { this._config = { ...(config || {}) }; }
  set hass(hass) { this._hass = hass; this.requestUpdate(); }
  get hass() { return this._hass; }
  getCardSize() { return 4; }

  _text() { return textFor(this._hass || {}, "vehicleAudit"); }

  _selected() {
    if (!this._hass) return undefined;
    const candidates = statusCandidates(this._hass, this._config.entry_id);
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  async _runAudit() {
    if (this._running || !this._hass) return;
    const selected = this._selected();
    const entryId = selected?.[1]?.attributes?.entry_id;
    if (!entryId) return;
    this._running = true;
    this._error = null;
    this._copied = false;
    try {
      this._report = await this._hass.callWS({
        type: `${STATUS_DOMAIN}/vehicle_audit`,
        entry_id: entryId,
      });
    } catch (error) {
      this._report = null;
      this._error = String(error?.message || error);
    } finally {
      this._running = false;
      this.requestUpdate();
    }
  }

  _download() {
    if (!this._report) return;
    const timestamp = String(this._report.generated_at || new Date().toISOString())
      .replaceAll(":", "-")
      .replaceAll(".", "-");
    const blob = new Blob([JSON.stringify(this._report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sv-dashboard-vehicle-audit-${timestamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  _markdown() {
    if (!this._report) return "";
    const report = this._report;
    const vehicle = report.vehicle_summary || {};
    const environment = report.environment || {};
    const probes = Object.values(report.probe_results || {});
    const probeLines = probes.map((probe) => `| ${probe.name || "—"} | ${probe.status || "—"} |`).join("\n");
    const candidates = Array.isArray(report.unmapped_candidate_fields) ? report.unmapped_candidate_fields : [];
    const candidateLines = candidates.slice(0, 40).map((path) => `- \`${path}\``).join("\n") || "- none";
    return [
      "## SV Dashboard vehicle capability audit",
      "",
      `- Audit ID: \`${report.audit_id || "—"}\``,
      `- Generated: \`${report.generated_at || "—"}\``,
      `- Brand: \`${vehicle.brand || "—"}\``,
      `- Powertrain: \`${vehicle.powertrain || "—"}\``,
      `- Home Assistant: \`${environment.home_assistant_version || "—"}\``,
      `- Stellantis Vehicles: \`${environment.stellantis_vehicles_version || "—"}\``,
      `- SV Dashboard: \`${environment.sv_dashboard_version || "—"}\``,
      "",
      "### Read-only probes",
      "",
      "| Probe | Result |",
      "| --- | --- |",
      probeLines,
      "",
      "### Trip query audit",
      "",
      "```json",
      JSON.stringify(report.trip_query_audit || {}, null, 2),
      "```",
      "",
      "### Unmapped candidate fields",
      "",
      candidateLines,
      "",
      "> This export was generated by the SV Dashboard read-only vehicle audit. VIN, vehicle/account identifiers, tokens and exact GPS coordinates are not exported.",
    ].join("\n");
  }
  async _copyMarkdown() {
    const value = this._markdown();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this._copied = true;
      this.requestUpdate();
      window.setTimeout(() => {
        this._copied = false;
        this.requestUpdate();
      }, 2500);
    } catch (error) {
      this._error = String(error?.message || error);
      this.requestUpdate();
    }
  }

  _statusClass(status) {
    return ["ok", "unavailable", "forbidden", "error"].includes(status) ? status : "unavailable";
  }

  render() {
    const text = this._text();
    if (!this._hass) return nothing;
    const selected = this._selected();
    if (!selected) {
      return html`<ha-card .header=${text.title}><div class="content"><div class="hint">${text.noVehicle}</div></div></ha-card>`;
    }

    const probes = Object.values(this._report?.probe_results || {});
    const redaction = this._report?.privacy_redaction_summary;
    return html`<ha-card .header=${text.title}><div class="content">
      <p class="hint">${text.hint}</p>
      <div class="actions">
        <ha-button @click=${this._runAudit} .disabled=${this._running}>
          ${this._running ? text.running : text.run}
        </ha-button>
        <ha-button @click=${this._download} .disabled=${!this._report || this._running}>
          ${text.download}
        </ha-button>
        <ha-button @click=${this._copyMarkdown} .disabled=${!this._report || this._running}>
          ${this._copied ? text.copied : text.copy}
        </ha-button>
      </div>
      ${this._error ? html`<div class="error-box">${text.error}: ${this._error}</div>` : nothing}
      ${!this._report && !this._running && !this._error ? html`<div class="meta">${text.notRun}</div>` : nothing}
      ${this._report ? html`
        <div class="meta">
          ${text.auditId}: <code>${this._report.audit_id || "—"}</code><br>
          ${text.generated}: ${this._report.generated_at || "—"}
        </div>
        <div class="status">
          ${probes.map((probe) => html`<div class="row">
            <span class="name">${probe.name || "—"}</span>
            <span class="result ${this._statusClass(probe.status)}">${probe.status || "—"}</span>
          </div>`)}
        </div>
        ${redaction ? html`<div class="meta">${text.privacyReady}</div>` : nothing}
      ` : nothing}
    </div></ha-card>`;
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, SvDashboardVehicleAuditCard);
}
