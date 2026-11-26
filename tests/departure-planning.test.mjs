import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync("custom_components/sv_dashboard/"+p,"utf8");
test("departure planning stays in its own view and never dispatches",()=>{
 const strategy=read("static/sv_dashboard.js"),frontend=read("static/frontend.js"),card=read("static/departure-planning-card.js"),backend=read("departure_planning.py");
 assert.match(strategy,/path: "departure", icon: "mdi:calendar-clock"/);
 assert.match(frontend,/import\("\.\/departure-planning-card\.js\?v=0\.7\.3-beta\.5"\)/);
 assert.match(card,/sv_dashboard\/departure_plans/);
 assert.match(backend,/connection\.user\.is_admin/);
 assert.match(backend,/revision_conflict/);
 assert.match(backend,/"preview_only": True/);
 assert.doesNotMatch(backend,/services\.async_call|button\.press|ThermalPrecond/);
 assert.doesNotMatch(card,/callService|button\.press/);
});
