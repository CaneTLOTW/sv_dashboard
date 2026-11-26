import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { localeFor,textFor } from "./i18n.js?v=0.7.3-beta.8";
import { num,calculateRange } from "./range-calculator-core.js?v=0.7.3-beta.8";
const TAG="sv-dashboard-range-calculator-card";
class RangeCalculator extends LitElement{
 static properties={_hass:{state:true},_config:{state:true},_inputs:{state:true}};
 static styles=css`
 .body{padding:0 16px 16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--secondary-text-color)}
 input,select{box-sizing:border-box;width:100%;min-width:0;font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:7px;padding:8px}input[type=range]{accent-color:var(--primary-color);padding:0;min-height:34px;touch-action:pan-y}
 .slider{grid-column:1/-1;display:grid;grid-template-columns:1fr auto}.slider input{grid-column:1/-1}.slider strong{color:var(--primary-text-color)}
 .tile{background:var(--secondary-background-color);border-radius:12px;padding:12px}.tile strong{display:block;font-size:clamp(20px,5vw,28px);margin:4px 0;font-variant-numeric:tabular-nums}
 .muted,.tile span{font-size:12px;color:var(--secondary-text-color);line-height:1.5}.row{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--divider-color);padding:7px 0;font-size:12px}
 details{margin:12px 0}summary{cursor:pointer;margin-bottom:10px}.actions{display:flex;justify-content:flex-end;gap:8px;margin:10px 0}button{font:inherit;border:1px solid var(--divider-color);border-radius:8px;color:var(--primary-color);background:transparent;padding:6px 10px;cursor:pointer}
 @media(max-width:340px){.grid{grid-template-columns:1fr}}
 `;
 setConfig(c){if(!c?.entity)throw new Error("Entity must be specified");if(this._config?.entity!==c.entity)this._inputs={};this._config={...c};}
 set hass(h){this._hass=h;}getCardSize(){return 6;}
 _state(k){return this._hass?.states?.[this._config?.[k]];}
 _set(k,v){this._inputs={...this._inputs,[k]:v};}
 _fmt(v,d=1){const n=num(v);return n===null?"—":new Intl.NumberFormat(localeFor(this._hass),{maximumFractionDigits:d}).format(n);}
 _field(label,k,v,min,max,step=1){return html`<label>${label}<input type="number" min="${min}" max="${max}" step="${step}" .value="${String(v??"")}" @change="${e=>this._set(k,num(e.target.value))}"></label>`;}
 _slider(label,k,v,min,max,unit,step=1){return html`<label class="slider"><span>${label}</span><strong>${this._fmt(v,0)} ${unit}</strong><input type="range" min="${min}" max="${max}" step="${step}" .value="${String(v??min)}" @input="${e=>this._set(k,Number(e.target.value))}"></label>`;}
 render(){if(!this._hass||!this._config)return nothing;
  const t=textFor(this._hass,"dashboard"),a=this._hass.states[this._config.entity]?.attributes,m=a?.server_history_ready?a.range_calibration||{}:{};
  const soh=num(this._state("soh_entity")?.state),ts=this._state("temperature_entity");let temp=num(ts?.state);
  if(temp!==null){if(ts.attributes?.unit_of_measurement==="°F")temp=(temp-32)*5/9;else if(ts.attributes?.unit_of_measurement!=="°C")temp=null;}
  const cap=this._state("capacity_entity"),capacity=cap?.attributes?.unit_of_measurement==="kWh"?num(cap.state):null;
  const v={soc:num(this._state("soc_entity")?.state),soh,referenceSoh:soh,capacity,basis:"current",temp:temp===null?null:Math.max(-25,Math.min(40,Math.round(temp))),target:200,reserve:10,speed:80,extra:0,referenceTemp:num(m.reference_temperature_c),...this._inputs};
  const r=calculateRange(m,v),row=(l,x)=>html`<div class="row"><span>${l}</span><strong>${x}</strong></div>`;
  return html`<ha-card header="${t.rangeCalcTitle}"><div class="body"><div class="grid">
  ${this._slider("SoC","soc",v.soc,0,100,"%")}${this._slider(t.monthlyAmbient,"temp",v.temp,-25,40,"°C")}
  ${this._slider(t.rangeCalcTarget,"target",v.target,1,Math.max(600,Math.ceil(v.target/5)*5),"km",1)}${this._slider(t.rangeCalcReserve,"reserve",v.reserve,0,50,"%")}
  </div><div class="actions"><button @click="${()=>this._set("soc",100)}">SoC 100 %</button><button @click="${()=>this._inputs={}}">${t.rangeCalcReset}</button></div>
  <details ?open="${v.capacity===null||m.mode==="scenario"&&v.referenceTemp===null}"><summary>${t.rangeCalcSettings}</summary><div class="grid">
  ${this._field(t.rangeCalcCapacity+" (kWh)","capacity",v.capacity,1,300,.1)}
  <label>${t.rangeCalcBasis}<select .value="${v.basis}" @change="${e=>this._set("basis",e.target.value)}"><option value="current">${t.rangeCalcCurrent}</option><option value="new">${t.rangeCalcNew}</option></select></label>
  ${this._field(t.rangeCalcTarget+" (km)","target",v.target,1,1500)}${this._field("SoH (%)","soh",v.soh,1,100,.1)}${this._field("Ø km/h","speed",v.speed,10,130)}${this._field(t.rangeCalcExtra+" (%)","extra",v.extra,0,60)}
  ${m.mode==="scenario"&&num(m.reference_temperature_c)===null?this._field(t.rangeCalcReference+" (°C)","referenceTemp",v.referenceTemp,-25,40):nothing}
  </div><p class="muted">${t.rangeCalcCapacityNote}</p></details>
  <strong>${m.mode==="fitted"?t.rangeCalcFitted:m.mode==="scenario"?t.rangeCalcScenario:t.monthlyNoData}</strong>
  <p class="muted">${m.mode==="fitted"?t.rangeCalcFitNote:t.rangeCalcScenarioNote}</p>
  ${num(m.reference_rate)!==null?html`<p class="muted">${t.rangeCalcReference}: ${this._fmt(m.reference_rate)} kWh/100 km · ${this._fmt(m.reference_distance_km,0)} km · n=${m.reference_trip_count} · T: ${this._fmt(m.reference_temperature_c??v.referenceTemp)} °C · ${t.trips} (°C): ${m.temperature_trip_count}/${m.trip_count}</p>`:nothing}
  ${r?html`<div class="grid"><div class="tile"><span>${t.rangeCalcRange} · ${v.reserve}%</span><strong>${Math.floor(r.conservativeRange)}–${Math.floor(r.range)} km</strong></div><div class="tile"><span>${t.rangeCalcArrival} · ${v.target} km</span><strong>${r.unreachable?"—":this._fmt(r.lowArrival,0)+"–"+this._fmt(r.arrival,0)+" %"}</strong><span>${r.shortfall>0?t.rangeCalcStop:t.rangeCalcPossible}</span></div></div>
  ${row(t.rangeCalcCapacity,this._fmt(r.capacity,2)+" kWh")}${row(t.rangeCalcEnergy,this._fmt(r.energy,2)+"–"+this._fmt(r.high,2)+" kWh")}${row(t.rangeCalcRunning,this._fmt(r.running)+" kWh/100 km")}${row(t.rangeCalcWarmup,this._fmt(r.startup,2)+" kWh")}${row(t.rangeCalcShortfall,this._fmt(r.shortfall,2)+" kWh")}
  ${r.extrapolated?html`<p class="muted">${t.rangeCalcUncertain}</p>`:nothing}`:html`<p class="muted">${t.rangeCalcMissing}</p>`}
  <p class="muted">${t.rangeCalcWarning}</p></div></ha-card>`;
 }
}
if(!customElements.get(TAG))customElements.define(TAG,RangeCalculator);
