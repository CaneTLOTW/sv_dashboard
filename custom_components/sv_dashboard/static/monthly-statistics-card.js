import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { localeFor, textFor } from "./i18n.js?v=0.7.3-beta.20";
import { finite, monthSeries, chartGeometry } from "./monthly-statistics-core.js?v=0.7.3-beta.20";

const TAG = "sv-dashboard-monthly-statistics-card";
const SOURCE = "https://www.frontera-forum.de/forum/thread/292-verr%C3%BCckte-hypothese-der-44kwh-akku-hat-eine-undokumentierte-akkuheizung/";

class SvDashboardMonthlyStatisticsCard extends LitElement {
  static properties = { _hass: {state:true}, _config: {state:true} };
  static styles = css`
    .content { padding: 0 16px 16px; }
    .legend { display:flex; flex-wrap:wrap; gap:8px 16px; font-size:var(--ha-font-size-s,12px); color:var(--secondary-text-color); margin:4px 0 12px; }
    .legend span { display:inline-flex; align-items:center; gap:6px; }
    .swatch { width:11px; height:11px; background:var(--primary-color); border-radius:2px; }
    .temp-swatch { width:20px; height:0; border-top:2px solid var(--monthly-temp-color,#d68d34); }
    .scroll { overflow-x:auto; scrollbar-width:thin; }
    .chart { display:grid; grid-template-columns:37px minmax(0,1fr) 37px; grid-template-rows:200px auto; padding:10px 0 2px; }
    .axis { display:flex; flex-direction:column; justify-content:space-between; font-size:11px; color:var(--secondary-text-color); padding:0 4px; text-align:right; margin:-6px 0; line-height:12px; }
    .temp-axis { text-align:left; color:var(--monthly-temp-color,#d68d34); }
    .plot { position:relative; height:200px; border-bottom:1px solid var(--divider-color); border-left:1px solid var(--divider-color); }
    .gridlines { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:space-between; pointer-events:none; }
    .gridlines span { border-top:1px solid var(--divider-color); opacity:.8; }
    .columns { position:absolute; inset:0; display:grid; align-items:end; }
    .column { height:100%; display:flex; align-items:flex-end; justify-content:center; position:relative; min-width:0; }
    .bar { width:65%; background:var(--primary-color); border-radius:4px 4px 0 0; opacity:.82; min-height:0; }
    .value { position:absolute; font-size:11px; white-space:nowrap; font-weight:600; color:var(--primary-text-color); transform:translateY(-2px); }
    .temp-line { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible; }
    .temp-line path { stroke:var(--monthly-temp-color,#d68d34); fill:none; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
    .months { grid-column:2; display:grid; text-align:center; gap:0; color:var(--secondary-text-color); font-size:11px; padding-top:8px; }
    .months span { white-space:nowrap; }
    .compact .months { font-size:10px; }
    .compact .value { font-size:9px; }
    @container (max-width:430px) { .compact .value { display:none; } }
    .content { container-type:inline-size; }
    .muted { color:var(--secondary-text-color); font-size:var(--ha-font-size-s,12px); line-height:1.45; margin:12px 0 0; }
    details { margin-top:10px; font-size:var(--ha-font-size-s,12px); }
    summary { cursor:pointer; color:var(--primary-text-color); }
    table { width:100%; border-collapse:collapse; text-align:right; margin:8px 0; white-space:nowrap; }
    th,td { border-bottom:1px solid var(--divider-color); padding:7px 8px; }
    th { font-weight:500; color:var(--secondary-text-color); white-space:normal; }
    td:first-child,th:first-child { text-align:left; }
    .winter { margin-top:16px; padding-top:12px; border-top:1px solid var(--divider-color); font-size:var(--ha-font-size-s,12px); line-height:1.5; }
    .winter p { margin:6px 0; }
    .winter a { color:var(--primary-color); }
    .example { font-variant-numeric:tabular-nums; }
  `;
  setConfig(config) {
    if (!config?.entity) throw new Error("Entity must be specified");
    this._config = {...config};
  }
  set hass(hass) { this._hass = hass; }
  getCardSize() { return 5; }
  _number(value, digits=1) {
    const number = finite(value);
    return number === null ? "—" : new Intl.NumberFormat(localeFor(this._hass),{maximumFractionDigits:digits}).format(number);
  }
  _percent(value) { const n=finite(value); return n===null ? "—" : this._number(n*100,0)+" %"; }
  _month(key, compact=false) {
    return new Intl.DateTimeFormat(localeFor(this._hass),{month:compact?"2-digit":"short",...(compact?{}:{year:"2-digit"}),timeZone:"UTC"}).format(new Date(key+"-01T00:00:00Z"));
  }
  render() {
    if (!this._config || !this._hass) return nothing;
    const text = textFor(this._hass,"dashboard");
    const state = this._hass.states[this._config.entity];
    const parts = new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",timeZone:this._hass.config?.time_zone||"UTC"}).formatToParts(new Date());
    const currentMonth = parts.find(p=>p.type==="year").value+"-"+parts.find(p=>p.type==="month").value;
    const rows = monthSeries(state?.attributes?.server_history_ready ? state.attributes.monthly_consumption : [], currentMonth);
    const {energyMax,energyStep,tempMin,tempStep,line,points} = chartGeometry(rows);
    const columnStyle = "grid-template-columns:repeat("+rows.length+",minmax(0,1fr))";
    const formatMonth = row => this._month(row.month);
    return html`
      <ha-card header="${text.monthlyConsumptionTitle}">
        <div class="content">
          <div class="legend"><span><i class="swatch"></i>kWh/100 km</span><span><i class="temp-swatch"></i>${text.monthlyAmbient} · °C</span></div>
          ${rows.length ? html`
            <div class="scroll">
              <div class="chart ${rows.length>6?"compact":""}" style="min-width:275px">
                <div class="axis">${[4,3,2,1,0].map(n=>html`<span>${this._number(n*energyStep,0)}</span>`)}</div>
                <div class="plot" role="img" aria-label="${text.monthlyConsumptionTitle} · kWh/100 km / °C">
                  <div class="gridlines" aria-hidden="true">${[0,1,2,3,4].map(()=>html`<span></span>`)}</div>
                  <div class="columns" style="${columnStyle}">
                    ${rows.map(row=>{
                      const value=finite(row.consumption_kwh_100km);
                      const percent=value===null?0:Math.max(0, Math.min(100,100*value/energyMax));
                      const tooltip=formatMonth(row)+": "+this._number(value)+" kWh/100 km · "+this._number(row.ambient_temperature_c)+" °C";
                      return html`<div class="column" title="${tooltip}">
                        ${value===null?nothing:html`<div class="bar" style="height:${percent}%"></div><span class="value" style="bottom:${percent}%">${this._number(value)}</span>`}
                      </div>`;
                    })}
                  </div>
                  <svg class="temp-line" viewBox="0 0 ${rows.length*100} 200" preserveAspectRatio="none" aria-hidden="true">
                    <path d="${line}" stroke-width="2.2"></path>
                    <path d="${points}" stroke-width="7"></path>
                  </svg>
                </div>
                <div class="axis temp-axis">${[4,3,2,1,0].map(n=>html`<span>${this._number(tempMin+n*tempStep,0)}°</span>`)}</div>
                <div class="months" style="${columnStyle}">${rows.map(row=>html`<span title="${formatMonth(row)}">${this._month(row.month,rows.length>6)}${rows.length>6&&row.month.endsWith("-01")?html`<small> ${row.month.slice(2,4)}</small>`:nothing}</span>`)}</div>
              </div>
            </div>
            <details>
              <summary>${text.monthlyDetails}</summary>
              <div class="scroll"><table>
                <thead><tr><th></th><th>kWh/100 km</th><th>°C</th><th>${text.monthlyEnergyCoverage}</th><th>${text.monthlyTemperatureCoverage}</th><th>${text.monthlyEstimatedShare}</th></tr></thead>
                <tbody>${rows.map(row=>html`<tr><td>${formatMonth(row)}</td><td>${this._number(row.consumption_kwh_100km)}</td><td>${this._number(row.ambient_temperature_c)}</td><td>${this._percent(row.energy_coverage)}</td><td>${this._percent(row.temperature_coverage)}</td><td>${this._percent(row.estimated_energy_share)}</td></tr>`)}</tbody>
              </table></div>
            </details>`
          : html`<p class="muted">${text.monthlyNoData}</p>`}
          <p class="muted">${text.monthlyMethod}</p>
          <div class="winter">
            <strong>${text.monthlyWinterTitle}</strong>
            <p>${text.monthlyWinterText}</p>
            <p class="example"><strong>${text.monthlyExample}:</strong> 5 kW × 15/60 h = ${this._number(1.25,2)} kWh; 25 km → +5 kWh/100 km.</p>
            <a href="${SOURCE}" target="_blank" rel="noopener noreferrer">${text.monthlySource} · 26.01.2026</a>
          </div>
        </div>
      </ha-card>`;
  }
}
if (!customElements.get(TAG)) customElements.define(TAG, SvDashboardMonthlyStatisticsCard);
