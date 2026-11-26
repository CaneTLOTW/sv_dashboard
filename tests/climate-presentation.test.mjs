import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {climatePresentation} from "../custom_components/sv_dashboard/static/climate-presentation-core.js";
const now=Date.parse("2026-11-26T16:00:00Z");
const e=(state,age=0,extra={})=>({state,attributes:{"Last updated":new Date(now-age*60000).toISOString(),...extra},last_updated:new Date(now).toISOString()});
test("heating/cooling uses a recent temperature",()=>{
  assert.equal(climatePresentation(e("on"),e("-4.5"),now).mode,"heating");
  assert.equal(climatePresentation(e("on"),e("20"),now).mode,"heating");
  assert.equal(climatePresentation(e("on"),e("21"),now).mode,"cooling");
  assert.equal(climatePresentation(e("on"),e("77",0,{unit_of_measurement:"°F"}),now).mode,"cooling");
  for(const temp of [undefined,e("unknown"),e(""),e("25",16)]) {
    assert.equal(climatePresentation(e("on"),temp,now).mode,"active");
    assert.equal(climatePresentation(e("on"),temp,now).color,null);
  }
});
test("stale ON, missing source time, future timestamp and fresh OFF are distinct",()=>{
  assert.equal(climatePresentation(e("on",16),e("-4"),now).mode,"unknown");
  assert.equal(climatePresentation({state:"on",last_updated:new Date(now).toISOString()},e("-4"),now).mode,"unknown");
  assert.equal(climatePresentation(e("on",-6),e("-4"),now).mode,"unknown");
  assert.equal(climatePresentation(e("off"),e("-4"),now).mode,"off");
  assert.equal(climatePresentation(e("unknown"),e("-4"),now).mode,"unknown");
  assert.equal(climatePresentation(e("on",16),e("-4"),now).active,true);
});
test("all climate surfaces share presentation and statistics uses two sections",()=>{
  const read=p=>fs.readFileSync("custom_components/sv_dashboard/static/"+p,"utf8");
  for(const p of ["vehicle-overview-card.js","dual-energy-overview-card.js","sv_dashboard.js"])assert.match(read(p),/climate-presentation-core\.js/);
  assert.match(read("sv_dashboard.js"),/climatePresentation\.toString\(\)/);
  assert.match(read("sv_dashboard.js"),/cards: consumptionCards/);
});

test("localized Stellantis field timestamp is recognized and preferred", () => {
  const localized = { "Zuletzt aktualisiert": new Date(now).toISOString() };
  const climate = { state: "on", attributes: localized };
  const temperature = e("-4", 60, localized);
  assert.equal(climatePresentation(climate, temperature, now).mode, "heating");
  assert.equal(climatePresentation(e("on", 0, {
    "Zuletzt aktualisiert": new Date(now - 16 * 60000).toISOString(),
  }), temperature, now).mode, "unknown");
});
