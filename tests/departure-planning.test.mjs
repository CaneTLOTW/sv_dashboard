import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync("custom_components/sv_dashboard/"+p,"utf8");
test("departure planning stays in its own view and uses mapped climate dispatch only",()=>{
 const strategy=read("static/sv_dashboard.js"),frontend=read("static/frontend.js"),card=read("static/departure-planning-card.js"),backend=read("departure_planning.py");
 assert.match(strategy,/path: "departure", icon: "mdi:calendar-clock"/);
 assert.match(frontend,/import\("\.\/departure-planning-card\.js\?v=0\.7\.3-beta\.8"\)/);
 assert.match(card,/sv_dashboard\/departure_plans/);
 assert.match(backend,/connection\.user\.is_admin/);
 assert.match(backend,/revision_conflict/);
 assert.match(backend,/"preview_only": self.execution_enabled_at is None/);
 assert.match(backend,/await asyncio\.wait_for\(self\.hass\.services\.async_call\(/);
 assert.match(backend,/"button", "press", \{"entity_id": button\.entity_id\}/);
 assert.doesNotMatch(backend,/ThermalPrecond|number\.set_value|switch\.turn_on/);
 assert.doesNotMatch(card,/callService|button\.press/);
});


test("reminder uses separate explicit settings and existing notify path",()=>{const card=read("static/departure-planning-card.js"),backend=read("departure_planning.py"),manager=read("notifications.py");assert.match(card,/_request\("reminder",reminder\)/);assert.match(backend,/await self\._persist\(self\.profiles, self\.revision, self\.reminder, claim\)/);assert.match(manager,/async_departure_reminder/);assert.match(manager,/departure_reminder_available/);});


test("quick planner shares the profile store and never arms execution",()=>{const card=read("static/departure-planning-card.js"),backend=read("departure_planning.py");assert.match(card,/_request\("quick",this\._quickProfile\(text\)\)/);assert.match(backend,/rows = add_quick_profile\(/);assert.match(card,/\.profile-row \.buttons\{grid-column:1\/-1/);assert.match(card,/clearInterval\(this\._poll\)/);});


test("quick planner shifts the selected day time exactly 15 minutes without rollover", async()=>{const {shiftDepartureTime}=await import("../custom_components/sv_dashboard/static/departure-time-core.js");assert.equal(shiftDepartureTime("07:30",15),"07:45");assert.equal(shiftDepartureTime("07:30",-15),"07:15");assert.equal(shiftDepartureTime("07:52",15),"08:07");assert.equal(shiftDepartureTime("00:10",-15),null);assert.equal(shiftDepartureTime("23:50",15),null);assert.equal(shiftDepartureTime("23:45",-15),"23:30");assert.equal(shiftDepartureTime("",15),null);assert.equal(shiftDepartureTime("07:30",5),null);const card=read("static/departure-planning-card.js");assert.match(card,/_shiftQuickTime\(-15\)/);assert.match(card,/_shiftQuickTime\(15\)/);});
