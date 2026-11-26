import { LitElement, html, css, nothing } from "./vendor-lit.js?v=0.6.0-beta.7";
import { localeFor, textFor } from "./i18n.js?v=0.7.3-beta.11";
import { shiftDepartureTime } from "./departure-time-core.js?v=0.7.3-beta.11";

const TAG="sv-dashboard-departure-planning-card";
const fresh=()=>({name:"",kind:"weekly",enabled:true,time:"07:30",weekdays:[0,1,2,3,4],date:null,override:"none",lead_minutes:20,min_soc:20,only_plugged:false,below_c:null,target_soc:null});

class DeparturePlanningCard extends LitElement {
 static properties={_hass:{state:true},_config:{state:true},_data:{state:true},_draft:{state:true},_busy:{state:true},_error:{state:true},_confirm:{state:true},_reminderDraft:{state:true},_quick:{state:true}};
 static styles=css`
 .body{padding:0 16px 16px}.hero,.editor{background:var(--secondary-background-color);border-radius:12px;padding:12px;margin:12px 0}
 .hero strong{display:block;font-size:24px;line-height:1.25;margin:6px 0}.muted{font-size:12px;color:var(--secondary-text-color);line-height:1.45}
 .row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--divider-color)}.info{flex:1;min-width:0;overflow-wrap:anywhere}.info strong{display:block}.time{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums}
 .buttons{display:flex;align-items:center;gap:7px;flex-wrap:wrap}button{border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:var(--primary-color);font:inherit;font-size:12px;padding:8px;cursor:pointer}button:disabled{opacity:.5;cursor:default}button.primary{background:var(--primary-color);color:var(--text-primary-color,#fff);border-color:transparent}.active{color:var(--success-color);font-size:12px}.error{color:var(--error-color);overflow-wrap:anywhere}
 #profile-editor{scroll-margin-top:80px}.slider-stepper{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center}.slider-stepper button{min-width:44px;min-height:44px;font-size:15px;font-variant-numeric:tabular-nums}.slider-stepper input[type=range]{width:100%;min-width:0}.profile-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start}.profile-row .buttons{grid-column:1/-1;justify-content:flex-start}.profile-row .info{overflow-wrap:anywhere}.profile-row .time{text-align:right}.quick-actions{display:flex;gap:6px;flex-wrap:wrap}.quick-actions button{flex:1;min-width:0}.quick-time{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:12px 0;align-items:end}.quick-time input{font-size:18px}.time-stepper{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center}.time-stepper button{font-size:16px;min-height:44px;min-width:52px;white-space:nowrap;font-variant-numeric:tabular-nums}.time-stepper input{min-height:44px;text-align:center}.time-stepper input::-webkit-date-and-time-value{text-align:center}.quick-time .wide{grid-column:1/-1}.quick-save{width:100%;font-size:15px;padding:12px}.live-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.live-head strong{flex:1;min-width:120px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}label{min-width:0;font-size:12px;color:var(--secondary-text-color);display:flex;flex-direction:column;gap:5px}input,select{box-sizing:border-box;min-width:0;width:100%;font:inherit;border:1px solid var(--divider-color);border-radius:7px;background:var(--card-background-color);color:var(--primary-text-color);padding:8px}input[type=date],input[type=time]{display:block;min-width:0;max-width:100%;-webkit-appearance:none;appearance:none}input[type=date]::-webkit-date-and-time-value,input[type=time]::-webkit-date-and-time-value{text-align:left;min-width:0}input[type=range]{padding:0;min-height:34px;accent-color:var(--primary-color)}input[type=checkbox]{width:auto;accent-color:var(--primary-color)}.check{flex-direction:row;align-items:center}.full{grid-column:1/-1}.days{display:flex;flex-wrap:wrap;gap:4px}.days button{min-width:30px;flex:1}details{margin:12px 0}summary{cursor:pointer}.calendar{font-size:13px}.calendar .row{padding:7px 0}h3{font-size:15px;margin:16px 0 6px}
 @media(max-width:430px){.grid,.quick-time{grid-template-columns:1fr}}
 `;
 setConfig(c){if(!c?.entry_id)throw Error("Entry required");const changed=this._config?.entry_id!==c.entry_id;this._config={...c};if(changed){this._data=undefined;this._draft=undefined;this._reminderDraft=undefined;this._quick=undefined;this._requested=null;this._error=null;this._load();}}
 set hass(h){this._hass=h;this._load();}
 connectedCallback(){super.connectedCallback();this._poll=setInterval(()=>{if(this._data&&!this._busy&&!this._draft&&!this._reminderDraft&&!this._quick)this._request("get");},30000);}
 disconnectedCallback(){clearInterval(this._poll);super.disconnectedCallback();}
 getCardSize(){return 7;}
 _load(){const id=this._config?.entry_id;if(!id||!this._hass||this._requested===id)return;this._requested=id;this._request("get");}
 async _request(op,profile=null,profileId=null){
  if(this._busy)return;
  const id=this._config.entry_id;this._busy=true;this._error=null;
  try{
   const msg={type:"sv_dashboard/departure_plans",entry_id:id,op};
   if(op!=="get"){msg.revision=this._data.revision;if(profileId)msg.profile_id=profileId;if(profile){if(op==="reminder")msg.reminder=profile;else if(op==="execution")msg.enabled=profile.enabled;else msg.profile=profile;}}
   const data=await this._hass.callWS(msg);
   if(this._config.entry_id!==id)return;
   this._data=data;
   if(op==="reminder")this._reminderDraft=null;
   if(op==="quick")this._quick=null;
   if(op==="save"||op==="delete"){this._draft=null;this._confirm=null;}
  }catch(e){if(this._config.entry_id===id)this._error=e?.code||"storage_error";}
  finally{this._busy=false;if(this._config.entry_id!==id){this._requested=null;this._load();}}
 }
 _quickValue(){const v=this._data.quick_defaults;return this._quick||{date:v.date,time:v.time,override:"none",custom:false};}
 _quickChange(value){this._quick={...this._quickValue(),...value};}
 _quickDay(day){const v=this._data.quick_defaults;if(day==="custom"){this._quickChange({custom:true});return;}this._quickChange({date:v[day],time:day==="tomorrow"?"07:30":v.date===v.today?v.time:"23:59",custom:false});}
 _shiftQuickTime(delta){const time=shiftDepartureTime(this._quickValue().time,delta);if(time!==null)this._quickChange({time});}
 _quickProfile(t){const q=this._quickValue();return {...fresh(),name:t("Once"),kind:"once",date:q.date,time:q.time,override:q.override,weekdays:[]};}
 async _openEditor(profile){this._draft={...profile,weekdays:[...profile.weekdays]};this._confirm=null;await this.updateComplete;if(this.isConnected&&this._draft)this.renderRoot.querySelector("#profile-editor")?.scrollIntoView({block:"start",behavior:"smooth"});}
 _shiftDraftTime(delta){const time=shiftDepartureTime(this._draft.time,delta);if(time!==null)this._change("time",time);}
 _change(k,v){this._draft={...this._draft,[k]:v};}
 _date(v){return new Intl.DateTimeFormat(localeFor(this._hass),{timeZone:"UTC",dateStyle:"medium"}).format(new Date(v+"T00:00:00Z"));}
 _fmt(v){return new Intl.DateTimeFormat(localeFor(this._hass),{timeZone:this._data.timezone,weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));}
 _day(n){return new Intl.DateTimeFormat(localeFor(this._hass),{weekday:"short",timeZone:"UTC"}).format(new Date(Date.UTC(2026,0,5+n)));}
 _input(label,k,type="text",min,max){const d=this._draft;return html`<label>${label}<input type="${type}" min="${min??""}" max="${max??""}" maxlength="${type==="text"?100:""}" .value="${String(d[k]??"")}" @input="${e=>this._change(k,type==="number"?(e.target.value===""?null:Number(e.target.value)):e.target.value)}"></label>`;}
 _slider(label,k,min,max,unit,delta=5){const value=this._draft[k];return html`<div class="full"><label for="profile-${k}">${label} · ${value} ${unit}</label><div class="slider-stepper"><button type="button" aria-label="${label} −${delta} ${unit}" ?disabled="${this._busy||value<=min}" @click="${()=>this._change(k,Math.max(min,value-delta))}">−${delta}</button><input id="profile-${k}" type="range" min="${min}" max="${max}" step="1" .value="${String(value)}" @input="${e=>this._change(k,Number(e.target.value))}"><button type="button" aria-label="${label} +${delta} ${unit}" ?disabled="${this._busy||value>=max}" @click="${()=>this._change(k,Math.min(max,value+delta))}">+${delta}</button></div></div>`;}
 _draftTime(label){const value=this._draft.time;return html`<div class="full"><label for="profile-clock">${label}</label><div class="time-stepper"><button type="button" aria-label="−15 min" ?disabled="${this._busy||shiftDepartureTime(value,-15)===null}" @click="${()=>this._shiftDraftTime(-15)}">−15</button><input id="profile-clock" type="time" .value="${value}" @input="${e=>this._change("time",e.target.value)}"><button type="button" aria-label="+15 min" ?disabled="${this._busy||shiftDepartureTime(value,15)===null}" @click="${()=>this._shiftDraftTime(15)}">+15</button></div></div>`;}
 _optionalTarget(label){const enabled=this._draft.target_soc!==null;return html`<div class="full"><label class="check"><input type="checkbox" .checked="${enabled}" @change="${e=>this._change("target_soc",e.target.checked?80:null)}">${label}</label>${enabled?this._slider(label,"target_soc",1,100,"%",5):nothing}</div>`;}

 _check(label,k){return html`<label class="check"><input type="checkbox" .checked="${this._draft[k]}" @change="${e=>this._change(k,e.target.checked)}">${label}</label>`;}
 _valid(d){return d.name.trim()&&/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)&&(d.kind==="weekly"?d.weekdays.length>0:!!d.date)&&Number.isInteger(d.lead_minutes)&&d.lead_minutes>=5&&d.lead_minutes<=60&&Number.isInteger(d.min_soc)&&d.min_soc>=0&&d.min_soc<=100&&(d.below_c===null||Number.isInteger(d.below_c)&&d.below_c>=-25&&d.below_c<=35)&&(d.target_soc===null||Number.isInteger(d.target_soc)&&d.target_soc>=1&&d.target_soc<=100);}
 render(){
  if(!this._hass||!this._config)return nothing;
  const t=textFor(this._hass,"dashboard"),data=this._data,d=this._draft;
  const text=(k)=>t["departure"+k],name=id=>data?.profiles.find(p=>p.id===id)?.name||"—";
  const errors={quick_past:"QuickPast",quick_dst:"Dst",quick_duplicate:"QuickDuplicate"};
  const error=this._error?html`<p class="error">${errors[this._error]?text(errors[this._error]):text("Error")+" ("+this._error+")"}</p>`:nothing;
  const next=data?.upcoming[0],reminder=this._reminderDraft||data?.reminder,q=data?.quick_defaults?this._quickValue():null;
  return html`<ha-card header="${text("Title")}"><div class="body">
   ${!data?html`<p class="muted">${text("Preview")}</p>${error}<button ?disabled="${this._busy}" @click="${()=>this._request("get")}">${text("Refresh")}</button>`:nothing}
   ${!data?nothing:html`
    <div class="editor"><div class="live-head"><strong>${text("LiveTitle")}</strong><button class="${data.execution_enabled?"primary":""}" ?disabled="${this._busy}" @click="${()=>this._request("execution",{enabled:!data.execution_enabled})}">${text(data.execution_enabled?"Active":"Inactive")} · ${text(data.execution_enabled?"Disable":"Enable")}</button></div><details><summary class="muted">${text(data.execution_enabled?"Active":"Inactive")}</summary><p class="muted">${text("LiveNote")}</p></details></div>
    <div class="hero"><div class="muted">${text("Next")}</div>
     ${next?html`<strong>${this._fmt(next.departure)}</strong><div>${next.name} · ${text("Start")}: ${this._fmt(next.start)}</div>${next.start_passed?html`<div class="muted">${text("PastStart")}</div>`:nothing}${next.target_soc!==null?html`<div class="muted">${text("Target")}: ${next.target_soc}%</div>`:nothing}`:html`<strong>—</strong><div class="muted">${text("Empty")}</div>`}
    </div>
    ${q?html`<div class="editor"><strong>${text("QuickTitle")}</strong><div class="quick-actions" style="margin-top:10px">${["today","tomorrow","custom"].map(day=>html`<button class="${(day==="custom"?q.custom:!q.custom&&q.date===data.quick_defaults[day])?"primary":""}" aria-pressed="${day==="custom"?q.custom:!q.custom&&q.date===data.quick_defaults[day]}" @click="${()=>this._quickDay(day)}">${text(day==="today"?"QuickToday":day==="tomorrow"?"QuickTomorrow":"Date")}</button>`)}</div><div class="quick-time">${q.custom?html`<label>${text("Date")}<input type="date" min="${data.today}" .value="${q.date}" @input="${e=>this._quickChange({date:e.target.value})}"></label>`:nothing}<div class="${q.custom?"":"wide"}"><label for="quick-clock">${text("Time")}</label><div class="time-stepper"><button type="button" aria-label="−15 min" ?disabled="${this._busy||shiftDepartureTime(q.time,-15)===null}" @click="${()=>this._shiftQuickTime(-15)}">−15</button><input id="quick-clock" type="time" .value="${q.time}" @input="${e=>this._quickChange({time:e.target.value})}"><button type="button" aria-label="+15 min" ?disabled="${this._busy||shiftDepartureTime(q.time,15)===null}" @click="${()=>this._shiftQuickTime(15)}">+15</button></div></div></div><label class="check"><input type="checkbox" .checked="${q.override==="all"}" @change="${e=>this._quickChange({override:e.target.checked?"all":"none"})}">${text("Override")}: ${text("All")}</label><p class="muted">${text("Lead")}: 20 min · ${text("MinSoc")}: 20 %${!data.execution_enabled?html` · ${text("LiveTitle")}: ${text("Inactive")}`:nothing}</p>${error}<button class="primary quick-save" ?disabled="${this._busy||!q.date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(q.time)}" @click="${()=>this._request("quick",this._quickProfile(text))}">${text("QuickSave")}</button><div class="buttons" style="margin-top:8px"><button ?disabled="${this._busy}" @click="${()=>{const profile=this._quickProfile(text);this._quick=null;this._openEditor(profile);}}">${text("Edit")}</button></div></div>`:error}
    <h3>${text("Profiles")} · ${data.profiles.filter(p=>p.enabled&&(p.kind==="weekly"||p.date>=data.today)).length}/${data.profiles.length}</h3>
    ${[...data.profiles].sort((a,b)=>Number(b.enabled)-Number(a.enabled)).map(p=>html`
     <div class="row profile-row"><div class="info"><strong>${p.name}</strong><span class="muted">${p.kind==="weekly"?p.weekdays.map(n=>this._day(n)).join(" · "):this._date(p.date)} · −${p.lead_minutes} min</span>
      ${p.kind==="once"&&p.override!=="none"?html`<div class="muted">${text("Override")}: ${p.override==="all"?text("All"):name(p.override)}</div>`:nothing}</div>
      <div><div class="time">${p.time}</div><div class="${p.enabled?"active":"muted"}">${p.kind==="once"&&(p.date<data.today||!data.upcoming.some(o=>o.profile_id===p.id)&&p.date===data.today)?text("Expired"):p.enabled?text("Active"):text("Inactive")}</div></div>
      <div class="buttons">
       <button ?disabled="${this._busy}" @click="${()=>this._request("save",{...p,enabled:!p.enabled},p.id)}">${p.enabled?text("Disable"):text("Enable")}</button>
       <button ?disabled="${this._busy}" @click="${()=>{this._openEditor(p);}}">${text("Edit")}</button>
       ${this._confirm===p.id?html`<button ?disabled="${this._busy}" @click="${()=>this._request("delete",null,p.id)}">${text("ConfirmDelete")}</button><button @click="${()=>this._confirm=null}">${text("Cancel")}</button>`:html`<button ?disabled="${this._busy}" @click="${()=>this._confirm=p.id}">${text("Delete")}</button>`}
      </div>
     </div>`)}
    <div class="buttons" style="margin-top:12px"><button class="primary" ?disabled="${this._busy}" @click="${()=>{this._openEditor({...fresh(),date:data.today});}}">+ ${text("New")}</button></div>
    ${d?html`<div class="editor" id="profile-editor"><strong>${d.id?text("Edit"):text("New")}</strong><div class="grid">
     <div class="full">${this._input(text("Name"),"name")}</div>
     <label>${text("Repeat")}<select @change="${e=>{this._draft={...d,kind:e.target.value,date:d.date||data.today,override:"none"};}}"><option value="weekly" ?selected="${d.kind==="weekly"}">${text("Weekly")}</option><option value="once" ?selected="${d.kind==="once"}">${text("Once")}</option></select></label>
     ${this._draftTime(text("Time"))}
     ${d.kind==="weekly"?html`<div class="days full">${Array.from({length:7},(_,n)=>html`<button aria-pressed="${d.weekdays.includes(n)}" class="${d.weekdays.includes(n)?"primary":""}" @click="${()=>this._change("weekdays",d.weekdays.includes(n)?d.weekdays.filter(x=>x!==n):[...d.weekdays,n].sort())}">${this._day(n)}</button>`)}</div>`:html`
      ${this._input(text("Date"),"date","date")}
      <label>${text("Override")}<select @change="${e=>this._change("override",e.target.value)}"><option value="none" ?selected="${d.override==="none"}">${text("None")}</option><option value="all" ?selected="${d.override==="all"}">${text("All")}</option>${data.profiles.filter(p=>p.kind==="weekly"&&p.id!==d.id).map(p=>html`<option value="${p.id}" ?selected="${d.override===p.id}">${p.name}</option>`)}</select></label>`}
     ${this._slider(text("Lead"),"lead_minutes",5,60,"min")}
     ${this._slider(text("MinSoc"),"min_soc",0,100,"%")}
     ${this._input(text("Below")+" (°C)","below_c","number",-25,35)}
     ${this._optionalTarget(text("Target"))}
     ${this._check(text("Plugged"),"only_plugged")}${this._check(text("Active"),"enabled")}
     </div><p class="muted">${text(data.execution_enabled?"LiveConditions":"ConditionsNote")}</p>
     <div class="buttons"><button class="primary" ?disabled="${this._busy||!this._valid(d)}" @click="${()=>this._request("save",d,d.id)}">${text("Save")}</button><button @click="${()=>this._draft=null}">${text("Cancel")}</button></div>
    </div>`:nothing}
    ${reminder?html`<div class="editor"><strong>${text("ReminderTitle")}</strong><div class="grid"><label class="check full"><input type="checkbox" .checked="${reminder.enabled}" @change="${e=>this._reminderDraft={...reminder,enabled:e.target.checked}}">${text("ReminderEnabled")}</label><label>${text("ReminderTime")}<input type="time" .value="${reminder.time}" @input="${e=>this._reminderDraft={...reminder,time:e.target.value}}"></label></div><p class="muted">${text("ReminderNote")}</p><div class="buttons"><button class="primary" ?disabled="${this._busy||!this._reminderDraft||!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time)}" @click="${()=>this._request("reminder",reminder)}">${text("Save")}</button></div>${data.last_reminder?html`<p class="muted">${this._date(data.last_reminder.date)} · ${text(data.last_reminder.status==="sent"?"ReminderSent":"ReminderAttempt")}</p>`:nothing}</div>`:nothing}
    <div class="buttons" style="margin-top:12px"><button ?disabled="${this._busy}" @click="${()=>this._request("get")}">${text("Refresh")}</button></div>
    <details class="calendar"><summary>${text("ExecutionLog")} (${(data.execution_log?.length||0)+(data.preparation_log?.length||0)})</summary>${(data.preparation_log||[]).map(row=>html`<div class="row"><div class="info"><strong>${row.name}</strong><span class="muted">${text("Preparation")} · ${this._fmt(row.at)}</span></div><span>${text("Status_"+row.status)||row.status}</span></div>`)}${(data.execution_log||[]).map(row=>html`<div class="row"><div class="info"><strong>${row.name}</strong><span class="muted">${this._fmt(row.at)}</span>${Number.isFinite(row.heartbeat_age_seconds)?html`<div class="muted">${text("DataAge")}: ${Math.round(row.heartbeat_age_seconds/60)} min</div>`:nothing}${row.preparation?html`<div class="muted">${text("Preparation")}: ${text("Status_"+row.preparation.status)||row.preparation.status}</div>`:nothing}</div><span>${text("Status_"+row.status)||row.status}</span></div>`)}</details>
    <details class="calendar"><summary>${text("Calendar")} · 14 d (${data.upcoming.length})</summary>
    ${data.upcoming.map(p=>html`<div class="row"><div class="info"><strong>${p.name}</strong><span class="muted">${text("Start")}: ${this._fmt(p.start)}</span></div><div>${this._fmt(p.departure)}</div></div>`)}
    ${data.skipped.map(p=>html`<div class="row muted"><span>${name(p.profile_id)} · ${this._date(p.date)}</span><span>${text(p.reason==="override"?"Skipped":"Dst")}</span></div>`)}
    </details>
   `}
  </div></ha-card>`;
 }
}
if(!customElements.get(TAG))customElements.define(TAG,DeparturePlanningCard);
