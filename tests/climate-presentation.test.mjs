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
test("German field timestamp and MQTT/HA ON transition can display active without claiming source confirmation",()=>{
  const localized={"Zuletzt aktualisiert":new Date(now).toISOString()};
  assert.equal(climatePresentation({state:"on",attributes:localized},e("-4"),now).mode,"heating");
  const mqtt={...e("on",60),last_changed:new Date(now-60000).toISOString()};
  assert.equal(climatePresentation(mqtt,e("-4"),now).mode,"heating");
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
