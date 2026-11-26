import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { finite, monthSeries, chartGeometry } from "../custom_components/sv_dashboard/static/monthly-statistics-core.js";

test("monthly plot inserts absent months, preserves missing values and limits calendar window", () => {
  assert.equal(finite(null),null);
  assert.equal(finite(0),0);
  const rows=monthSeries([{month:"2026-09",consumption_kwh_100km:15,ambient_temperature_c:12},{month:"2026-11",consumption_kwh_100km:22,ambient_temperature_c:2}]);
  assert.equal(rows.length,3);
  assert.deepEqual(rows.slice(-3).map(r=>r.month),["2026-09","2026-10","2026-11"]);
  assert.equal(rows.at(-2).consumption_kwh_100km,undefined);
  assert.equal(monthSeries([{month:"2026-09"}],"2026-12").at(-1).month,"2026-12");
  assert.deepEqual(monthSeries([{month:"2020-01"}],"2026-12"),[]);
  const geometry=chartGeometry(rows);
  assert.equal(geometry.line.match(/M/g).length,2);
  assert.equal(geometry.line.includes("L"),false);
  assert.equal(chartGeometry([{ambient_temperature_c:0},{ambient_temperature_c:1}]).line.includes("L"),true);
  assert.equal(monthSeries([{month:"2020-01"},{month:"2026-11"}]).length,1);
  assert.equal(monthSeries([{month:"2025-12"},{month:"2026-11"}]).length,12);
});

test("monthly chart belongs to BEV statistics and retains the rolling consumption plot", () => {
  const strategy=fs.readFileSync("custom_components/sv_dashboard/static/sv_dashboard.js","utf8");
  const frontend=fs.readFileSync("custom_components/sv_dashboard/static/frontend.js","utf8");
  const card=fs.readFileSync("custom_components/sv_dashboard/static/monthly-statistics-card.js","utf8");
  const rolling=strategy.indexOf('title: strings.consumptionHistory');
  const monthly=strategy.indexOf('type: "custom:sv-dashboard-monthly-statistics-card"');
  assert.ok(rolling>=0 && monthly>rolling);
  assert.match(strategy,/supportsElectric && !supportsDualEnergy && serverTripEntity \? \{ type: "custom:sv-dashboard-monthly-statistics-card"/);
  assert.match(frontend,/import\("\.\/monthly-statistics-card\.js\?v=0\.7\.3-beta\.8"\)/);
  assert.match(card,/server_history_ready/);
  assert.match(card,/monthlyTemperatureCoverage/);
  assert.match(card,/frontera-forum\.de/);
});
