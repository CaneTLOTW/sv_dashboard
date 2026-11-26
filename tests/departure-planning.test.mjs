import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync("custom_components/sv_dashboard/"+p,"utf8");
test("departure planning stays in its own view and uses mapped climate dispatch only",()=>{
 const strategy=read("static/sv_dashboard.js"),frontend=read("static/frontend.js"),card=read("static/departure-planning-card.js"),backend=read("departure_planning.py");
 assert.match(strategy,/path: "departure", icon: "mdi:calendar-clock"/);
 assert.match(frontend,/import\("\.\/departure-planning-card\.js\?v=0\.7\.3-beta\.16"\)/);
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


test("full profile editor offers time stepper, numeric slider buttons and optional target",()=>{const card=read("static/departure-planning-card.js");assert.match(card,/_shiftDraftTime\(-15\)/);assert.match(card,/_shiftDraftTime\(15\)/);assert.match(card,/_slider\(text\("MinSoc"\),"min_soc",0,100,"%"/);assert.match(card,/_slider\(label,"target_soc",1,100,"%",5\)/);assert.match(card,/e\.target\.checked\?80:null/);assert.match(card,/Math\.max\(min,value-delta\)/);assert.match(card,/Math\.min\(max,value\+delta\)/);assert.match(card,/scrollIntoView\(/);assert.match(card,/_openEditor\(p\)/);});


test("scheduled stale preparation uses persisted claim and mapped wake path",()=>{const backend=read("departure_planning.py"),notifications=read("notifications.py");assert.match(backend,/self\.preparation\[key\] = item/);assert.match(backend,/self\.notifications\.async_departure_wakeup\(\)/);assert.match(backend,/fresh_heartbeat\(now, heartbeat, source\)/);assert.match(backend,/datetime\.fromisoformat\(row\["deadline"\]\)/);assert.match(notifications,/async with self\._wakeup_lock/);});


test("one-time cleanup runs independently of UI and preserves date exceptions",()=>{const backend=read("departure_planning.py");assert.match(backend,/await self\._async_cleanup_locked\(dt_util\.utcnow\(\)\)/);assert.match(backend,/await self\._async_cleanup_locked\(now\)/);assert.match(backend,/self\.profiles \+ self\.held_overrides/);assert.match(backend,/revision = self\.revision \+ int\(rows != self\.profiles\)/);assert.match(backend,/"held_overrides": self\.held_overrides/);});

test("wide departure planner uses one shared store and a compact lower settings disclosure",()=>{const strategy=read("static/sv_dashboard.js"),card=read("static/departure-planning-card.js");assert.match(strategy,/column_span:2,cards:\[\{type:"custom:sv-dashboard-departure-planning-card"/);assert.match(card,/@container \(min-width:650px\)/);assert.match(card,/<details class="settings"><summary>/);assert.ok(card.indexOf('<details class="settings">')>card.indexOf('text("QuickTitle")'));});

test("departure panels use two independent stacks and theme cards without a giant white shell",()=>{const card=read("static/departure-planning-card.js");assert.match(card,/ha-card\.shell\{background:transparent;border:0;box-shadow:none\}/);assert.match(card,/class="plan-column planning-column"/);assert.match(card,/class="plan-column management-column"/);assert.equal((card.match(/class="plan-column /g)||[]).length,2);assert.match(card,/\.plan-column\{min-width:0;display:flex;flex-direction:column;gap:12px\}/);assert.match(card,/class="panel profile-panel"/);assert.match(card,/\.hero,\.editor,\.panel,\.calendar,\.settings\{background:var\(--secondary-background-color\)/);assert.match(card,/\.section-heading::after/);assert.ok(card.indexOf('text("ExecutionLog")')<card.indexOf('text("ReminderTitle")'));});
