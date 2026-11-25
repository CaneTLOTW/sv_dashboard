import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helper = path.join(root, "custom_components", "sv_dashboard", "trip_repair.py");

function runPython(body) {
  return execFileSync("python", ["-c", body, helper], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

test("zero-start Stellantis trip is repaired from local odometer continuity", () => {
  const output = runPython(String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_repair", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
trips = [
  {"id":"prev","start_time":"2026-08-25T12:30:00+00:00","end_time":"2026-08-25T13:00:00+00:00","duration_seconds":1800,"distance_km":41.0,"start_mileage":1000.0,"end_mileage":1041.0,"valid_for_statistics":True,"quality_flags":[]},
  {"id":"bad","start_time":"2026-08-25T13:14:00+00:00","end_time":"2026-08-25T13:23:00+00:00","duration_seconds":540,"distance_km":1048.0,"start_mileage":0.0,"end_mileage":1048.0,"energy_kwh":1.05,"raw_average_speed_kmh":None,"valid_for_statistics":False,"quality_flags":["distance_outlier","derived_speed_outlier","zero_start_odometer_sentinel"],"raw_server":{"distance":1048.0,"startMileage":0.0}},
  {"id":"next","start_time":"2026-08-25T14:00:00+00:00","end_time":"2026-08-25T14:20:00+00:00","duration_seconds":1200,"distance_km":12.0,"start_mileage":1048.0,"end_mileage":1060.0,"valid_for_statistics":True,"quality_flags":[]},
]
local = [{"start_time":"2026-08-25T13:14:05+00:00","end_time":"2026-08-25T13:23:02+00:00","start_mileage":1041.0,"end_mileage":1048.0,"distance_km":7.0}]
out = mod.repair_trip_odometer_continuity(trips, local)
row = next(item for item in out if item["id"] == "bad")
print(json.dumps(row, sort_keys=True))
`);
  const row = JSON.parse(output);
  assert.equal(row.start_mileage, 1041);
  assert.equal(row.end_mileage, 1048);
  assert.equal(row.distance_km, 7);
  assert.equal(row.average_speed, 46.7);
  assert.equal(row.energy_per_100_km, 15);
  assert.equal(row.valid_for_statistics, true);
  assert.equal(row.repair_metadata.source, "local_trip_match");
  assert.equal(row.source_distance_km, 1048);
  assert.equal(row.raw_server.distance, 1048);
  assert.equal(row.raw_server.startMileage, 0);
  assert.ok(row.quality_flags.includes("odometer_continuity_repaired"));
});

test("repair falls back to next server start but refuses unsupported regression", () => {
  const output = runPython(String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_repair", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
repairable = [
  {"id":"prev","start_time":"2026-08-25T10:00:00+00:00","distance_km":10,"start_mileage":1031,"end_mileage":1041,"valid_for_statistics":True,"quality_flags":[]},
  {"id":"bad","start_time":"2026-08-25T11:00:00+00:00","duration_seconds":600,"distance_km":1048,"start_mileage":0,"end_mileage":1048,"valid_for_statistics":False,"quality_flags":["distance_outlier","zero_start_odometer_sentinel"]},
  {"id":"next","start_time":"2026-08-25T12:00:00+00:00","distance_km":5,"start_mileage":1048,"end_mileage":1053,"valid_for_statistics":True,"quality_flags":[]},
]
unsupported = [
  {"id":"prev","start_time":"2026-08-25T10:00:00+00:00","distance_km":10,"start_mileage":1031,"end_mileage":1041,"valid_for_statistics":True,"quality_flags":[]},
  {"id":"bad","start_time":"2026-08-25T11:00:00+00:00","duration_seconds":600,"distance_km":5,"start_mileage":1000,"end_mileage":1005,"valid_for_statistics":False,"quality_flags":["odometer_distance_mismatch"]},
  {"id":"next","start_time":"2026-08-25T12:00:00+00:00","distance_km":5,"start_mileage":1006,"end_mileage":1011,"valid_for_statistics":False,"quality_flags":["odometer_distance_mismatch"]},
]
r1 = mod.repair_trip_odometer_continuity(repairable, [])[1]
r2 = mod.repair_trip_odometer_continuity(unsupported, [])[1]
print(json.dumps({"r1":r1,"r2":r2}, sort_keys=True))
`);
  const { r1, r2 } = JSON.parse(output);
  assert.equal(r1.distance_km, 7);
  assert.equal(r1.repair_metadata.source, "next_server_start");
  assert.equal(r1.valid_for_statistics, true);
  assert.equal(r2.distance_km, 5);
  assert.equal(r2.start_mileage, 1000);
  assert.equal(r2.repair_metadata, undefined);
});

test("continuity repair is idempotent on the canonical copy", () => {
  const output = runPython(String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_repair", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
rows = [
  {"id":"prev","start_time":"2026-08-25T10:00:00+00:00","distance_km":10,"start_mileage":1031,"end_mileage":1041,"valid_for_statistics":True,"quality_flags":[]},
  {"id":"bad","start_time":"2026-08-25T11:00:00+00:00","duration_seconds":600,"distance_km":1048,"start_mileage":0,"end_mileage":1048,"valid_for_statistics":False,"quality_flags":["distance_outlier","zero_start_odometer_sentinel"]},
  {"id":"next","start_time":"2026-08-25T12:00:00+00:00","distance_km":5,"start_mileage":1048,"end_mileage":1053,"valid_for_statistics":True,"quality_flags":[]},
]
first = mod.repair_trip_odometer_continuity(rows, [])
encoded_first = json.dumps(first, sort_keys=True)
second = mod.repair_trip_odometer_continuity(first, [])
print(json.dumps({"same": encoded_first == json.dumps(second, sort_keys=True)}))
`);
  assert.deepEqual(JSON.parse(output), { same: true });
});

test("stale high-speed local composite is flagged and removed from backfill evidence", () => {
  const output = runPython(String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_repair", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
trips = [
  {"id":"server","start_time":"2026-09-15T10:33:10+00:00","end_time":"2026-09-15T10:38:40+00:00","duration_seconds":330,"distance_km":4,"start_mileage":1872,"end_mileage":1876,"valid_for_statistics":True,"quality_flags":[]},
]
invalid = {"id":"stale","start_time":"2026-09-15T06:00:00+00:00","end_time":"2026-09-15T06:06:02+00:00","duration_seconds":362,"start_mileage":1851,"end_mileage":1876,"distance_km":25,"energy_kwh":3.4,"quality_flags":[]}
valid = {"id":"good","start_time":"2026-09-14T15:30:00+00:00","end_time":"2026-09-14T15:50:00+00:00","duration_seconds":1200,"start_mileage":1832,"end_mileage":1851,"distance_km":19,"energy_kwh":3.3,"quality_flags":[]}
local = [invalid, valid]
mod.repair_trip_odometer_continuity(trips, local)
print(json.dumps({"remaining":[row["id"] for row in local],"invalid":invalid,"valid":valid}, sort_keys=True))
`);
  const result = JSON.parse(output);
  assert.deepEqual(result.remaining, ["good"]);
  assert.equal(result.invalid.backfill_eligible, false);
  assert.ok(result.invalid.quality_flags.includes("local_speed_outlier"));
  assert.equal(result.valid.backfill_eligible, true);
});

test("short overlapping server replay is quarantined before odometer repair", () => {
  const output = runPython(String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_repair", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
def row(id, start, end, duration, mileage, distance, valid=True):
    return {"id":id,"start_time":"2026-01-01T"+start+"+00:00","end_time":"2026-01-01T"+end+"+00:00","duration_seconds":duration,"start_mileage":mileage,"end_mileage":mileage+distance,"distance_km":distance,"valid_for_statistics":valid,"quality_flags":[] if valid else ["derived_speed_outlier"]}
rows = [row("normal","10:00:00","10:28:04",1684,1000,25),row("replay","10:28:01","10:29:01",60,1000,25,False),row("next","10:40:00","10:45:00",300,1025,4),row("short","10:50:00","10:51:00",60,1029,1)]
original = json.dumps(rows, sort_keys=True)
clean, excluded = mod.partition_replayed_trips(rows)
assert json.dumps(rows, sort_keys=True) == original
out = mod.repair_trip_odometer_continuity(clean, [])
assert mod.partition_replayed_trips(out)[1] == []
print(json.dumps({"ids":[x["id"] for x in out],"distance":sum(x["distance_km"] for x in out),"excluded":excluded}))
`);
  assert.deepEqual(JSON.parse(output), {ids:["normal","next","short"],distance:30,excluded:[{id:"replay",duplicate_of:"normal",reason:"short_overlapping_odometer_replay"}]});
});


test("a unique local trip may fill an exact odometer gap but a composite cannot", () => {
  const output = runPython(String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_repair", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
def row(id,start,end,seconds,a,b):
    return {"id":id,"start_time":"2026-01-01T"+start+"+00:00","end_time":"2026-01-01T"+end+"+00:00","duration_seconds":seconds,"start_mileage":a,"end_mileage":b,"distance_km":b-a,"valid_for_statistics":True}
before=row("a","10:00:00","10:10:00",600,1000,1010)
after=row("b","11:00:00","11:15:00",900,1028,1040)
good=row("local","10:30:00","10:50:00",1200,1010,1028)
good["energy_kwh"]=3
bad=row("composite","10:30:00","10:50:00",1200,1010,1050)
out=mod.recover_local_odometer_gaps([before,after],[good,bad])
assert len(out)==1
assert mod.recover_local_odometer_gaps([before,after],[bad])==[]
assert mod.recover_local_odometer_gaps([before,after],[good,{**good,"id":"ambiguous"}])==[]
assert mod.recover_local_odometer_gaps([before,out[0],after],[good])==[]
print(json.dumps({"distance":out[0]["distance_km"],"source":out[0]["source"],"estimated":out[0]["energy_estimated"],"server_id":out[0]["server_id"]}))
`);
  assert.deepEqual(JSON.parse(output), {distance:18,source:"sv_local_gap_recovery",estimated:true,server_id:null});
});
