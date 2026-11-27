import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {climatePresentation} from "../custom_components/sv_dashboard/static/climate-presentation-core.js";
const now=Date.parse("2026-11-26T16:00:00Z");
const e=(state,age=0,extra={})=>({state,attributes:{"Last updated":new Date(now-age*60000).toISOString(),...extra},last_updated:new Date(now).toISOString()});
test("reported ON uses heating/cooling; missing temperature uses neutral active",()=>{
  assert.equal(climatePresentation(e("on"),e("-4.5"),now).mode,"heating");
  assert.equal(climatePresentation(e("on"),e("20"),now).mode,"heating");
  assert.equal(climatePresentation(e("on"),e("21"),now).mode,"cooling");
  assert.equal(climatePresentation(e("on"),e("77",0,{unit_of_measurement:"°F"}),now).mode,"cooling");
  assert.equal(climatePresentation(e("on"),e("25",120),now).mode,"cooling");
  for(const temp of [undefined,e("unknown"),e("")]) assert.equal(climatePresentation(e("on"),temp,now).mode,"active");
});
test("idle is the visual default; stale ON and unknown never become a question mark",()=>{
  assert.equal(climatePresentation(e("on",31),e("-4"),now).mode,"off");
  assert.equal(climatePresentation(e("on",31),e("-4"),now).rawActive,true);
  assert.equal(climatePresentation({state:"on",last_updated:new Date(now).toISOString()},e("-4"),now).mode,"off");
  assert.equal(climatePresentation(e("on",-6),e("-4"),now).mode,"off");
  assert.equal(climatePresentation(e("off",120),e("-4"),now).mode,"off");
  assert.equal(climatePresentation(e("unknown"),e("-4"),now).mode,"off");
});
test("German field timestamp works; an undated MQTT/HA transition cannot establish active",()=>{
  const localized={"Zuletzt aktualisiert":new Date(now).toISOString()};
  assert.equal(climatePresentation({state:"on",attributes:localized},e("-4"),now).mode,"heating");
  const mqtt={...e("on",60),last_changed:new Date(now-60000).toISOString()};
  assert.equal(climatePresentation(mqtt,e("-4"),now).mode,"off");
  assert.equal(climatePresentation(mqtt,e("-4"),now).confirmed,false);
});
test("recent button timestamp displays pending until a matching newer observation or expiry",()=>{
  const button={state:new Date(now-60000).toISOString()};
  assert.equal(climatePresentation(e("off",2),e("-4"),now,button).mode,"pending");
  assert.equal(climatePresentation(e("on",0),e("-4"),now,button).mode,"heating");
  assert.equal(climatePresentation(e("on",5),e("-4"),now,undefined,button).mode,"pending");
  assert.equal(climatePresentation(e("off",0),e("-4"),now,undefined,button).mode,"off");
  assert.equal(climatePresentation(e("off",5),e("-4"),now,{state:new Date(now-181000).toISOString()}).mode,"off");
});
test("all climate surfaces share presentation and statistics uses two sections",()=>{
  const read=p=>fs.readFileSync("custom_components/sv_dashboard/static/"+p,"utf8");
  for(const p of ["vehicle-overview-card.js","dual-energy-overview-card.js","sv_dashboard.js"])assert.match(read(p),/climate-presentation-core\.js/);
  assert.match(read("sv_dashboard.js"),/climatePresentation\.toString\(\)/);
  assert.match(read("sv_dashboard.js"),/cards: consumptionCards/);
});

test("observed beta.15 restart regression: old ON must stay neutral regardless of HA timestamps",()=>{
  const at=Date.parse("2026-11-26T22:22:58Z");
  const source="2026-11-26T19:25:29Z";
  const start={state:"2026-11-26T18:53:24Z",last_changed:"2026-11-26T22:13:35Z"};
  const temperature={state:"-4",attributes:{"Zuletzt aktualisiert":"2026-11-26T19:01:29Z"}};
  for(const changed of ["2026-11-26T18:53:36Z","2026-11-26T22:13:35Z"]) {
    const climate={state:"on",attributes:{"Zuletzt aktualisiert":source},last_changed:changed,last_updated:changed,last_reported:changed};
    const result=climatePresentation(climate,temperature,at,start);
    assert.equal(result.mode,"off");
    assert.equal(result.active,false);
    assert.equal(result.confirmed,false);
    assert.equal(result.pending,false);
    assert.equal(result.color,null);
  }
});
test("restore during a pending request cannot confirm it; recent stop suppresses older ON",()=>{
  const button={state:new Date(now-60000).toISOString()};
  const restored={...e("on",5),last_changed:new Date(now-1000).toISOString()};
  assert.equal(climatePresentation(restored,e("-4"),now,button).mode,"pending");
  assert.equal(climatePresentation(restored,e("-4"),now,undefined,button).mode,"pending");
  const oldStop={state:new Date(now-240000).toISOString()};
  assert.equal(climatePresentation(restored,e("-4"),now,undefined,oldStop).mode,"off");
  assert.equal(climatePresentation(e("on",0),e("-4"),now,undefined,oldStop).mode,"heating");
});
test("naive source time and fresh HA receipt time cannot make restored ON active",()=>{
  assert.equal(climatePresentation({state:"on",attributes:{"Zuletzt aktualisiert":"2026-11-26T16:00:00"},last_changed:new Date(now).toISOString()},e("-4"),now).mode,"off");
});

test("temperature age is irrelevant to the color, never to climate activation",()=>{
  for(const age of [31,120,1440,10080]){
    assert.equal(climatePresentation(e("on"),e("-3.5",age),now).mode,"heating");
    assert.equal(climatePresentation(e("on"),e("25",age),now).mode,"cooling");
    assert.equal(climatePresentation(e("on",31),e("-3.5",age),now).mode,"off");
  }
  assert.equal(climatePresentation(e("on"),{state:"-3.5"},now).mode,"heating");
  assert.equal(climatePresentation(e("on"),{state:"77",attributes:{unit_of_measurement:"°F"}},now).mode,"cooling");
  for(const temp of [undefined,e("unavailable"),e("unknown"),e(""),e("25",0,{unit_of_measurement:"K"})]){
    assert.equal(climatePresentation(e("on"),temp,now).mode,"active");
  }
  const start={state:new Date(now-60000).toISOString()};
  assert.equal(climatePresentation(e("off",2),e("-3.5",1440),now,start).mode,"pending");
});
