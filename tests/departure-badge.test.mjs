import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {plannedClimateLabel} from "../custom_components/sv_dashboard/static/departure-badge-core.js";
const strings={departureQuickToday:"Heute",departureQuickTomorrow:"Morgen",departureStart:"Klimastart",departureTime:"Abfahrt"};
const plan={start:"2026-11-27T11:10:00Z",departure:"2026-11-27T11:30:00Z",kind:"once",timezone:"Europe/Berlin"};
const read=p=>fs.readFileSync("custom_components/sv_dashboard/"+p,"utf8");
test("planned badge uses HA timezone, suppresses during pending or active, and expires",()=>{
  const now=Date.parse("2026-11-27T09:00:00Z");
  assert.equal(plannedClimateLabel(plan,now,"de",strings,false,false).label,"Heute 12:10");
  assert.equal(plannedClimateLabel(plan,Date.parse("2026-11-26T23:00:00Z")-3600000,"de",strings,false,false).label,"Morgen 12:10");
  assert.equal(plannedClimateLabel(plan,now,"de",strings,true,false),null);
  assert.equal(plannedClimateLabel(plan,now,"de",strings,false,true),null);
  assert.equal(plannedClimateLabel(plan,Date.parse(plan.start),"de",strings,false,false),null);
  assert.equal(plannedClimateLabel({...plan,kind:"weekly"},now-3600000,"de",strings,false,false),null);
  assert.equal(plannedClimateLabel({...plan,kind:"weekly"},now,"de",strings,false,false).label,"Heute 12:10");
  assert.equal(plannedClimateLabel(null,now,"de",strings,false,false),null);
});
test("both heroes use shared planner summary; no direct schedule command",()=>{
  for (const path of ["static/vehicle-overview-card.js","static/dual-energy-overview-card.js"]) {
    assert.match(read(path),/plannedClimateLabel\(/);
    assert.match(read(path),/planned_climate/);
  }
  assert.match(read("sensor.py"),/"planned_climate":/);
  assert.match(read("departure_planning.py"),/item\["result_notification"\] = "attempted"/);
  assert.match(read("departure_planning.py"),/departure_confirmation\(item/);
  assert.match(read("notifications.py"),/"departure_climate_result", SWITCH_ALERTS/);
});

test("planned badge uses a 24-hour clock even with en-US locale",()=>{const now=Date.parse("2026-11-27T09:00:00Z");assert.equal(plannedClimateLabel(plan,now,"en-US",strings,false,false).label,"Heute 12:10");});
