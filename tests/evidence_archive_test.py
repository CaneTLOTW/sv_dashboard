from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
from types import SimpleNamespace
import subprocess
import sys

spec=importlib.util.spec_from_file_location("evidence",Path(__file__).parents[1]/"custom_components/sv_dashboard/evidence_archive.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
mapping=m.signal_mapping({"battery":"sensor.battery","battery_sensor":"sensor.battery","battery_health_capacity":"sensor.soh","abrp_token":"sensor.secret","fuel":"sensor.fuel","vehicle":"device_tracker.car"})
assert mapping=={"sensor.battery":"battery","sensor.soh":"battery_health_capacity","sensor.fuel":"fuel"}
stamp=datetime(2026,11,28,tzinfo=timezone.utc)
state=SimpleNamespace(entity_id="sensor.soh",state="0",last_updated=stamp,last_changed=stamp,attributes={"unit_of_measurement":"%","Last updated":"2026-11-27T23:59:00Z","secret":"not archived"})
row=m.observation("battery_health_capacity",state)
assert row["value"]=="0" and row["attributes"]=={"unit_of_measurement":"%","Last updated":"2026-11-27T23:59:00Z"}
a=m.encode("telemetry","sensor.soh|"+row["received_at"],row)
b=m.encode("telemetry","sensor.soh|"+row["received_at"],{**row,"value":"93"})
events=list(m.source_records("fuel_history",{"events":[{"id":"refuel","fuel_before_percent":20}]}))
assert len(events)==1 and events[0][0]=="refuel_event"
with tempfile.TemporaryDirectory() as directory:
    path=Path(directory)/"archive.sqlite3"
    assert m.write_records(path,[a,a,b,*events])==3
    assert m.write_records(path,[a],stamp.isoformat())==3
    assert m.read_cursor(path)==(stamp.isoformat(),3)
    db=sqlite3.connect(path)
    assert {json.loads(r[0])["value"] for r in db.execute("SELECT payload FROM evidence WHERE kind='telemetry'")}=={"0","93"}
    assert db.execute("PRAGMA integrity_check").fetchone()[0]=="ok"
    db.close()
    source=Path(directory)/"source"
    out=Path(directory)/"staged"
    source.write_text(json.dumps({"version":1,"key":"sv_dashboard_test_fuel_history","data":{"events":[{"id":"refuel","fuel_before_percent":20}]}}))
    cmd=[sys.executable,str(Path(__file__).parents[1]/"scripts/stage_evidence_recovery.py"),"--vehicle-prefix","sv_dashboard_test","--store",str(source),"--output",str(out)]
    subprocess.run(cmd,check=True,capture_output=True)
    assert m.read_cursor(out)==(None,1)
    assert subprocess.run(cmd,capture_output=True).returncode!=0
    assert subprocess.run([*cmd[:3],"--vehicle-prefix","other","--store",str(source),"--output",str(Path(directory)/"wrong")],capture_output=True).returncode!=0
print("Evidence journal and non-overwriting staging tests passed")
