from datetime import datetime, timezone
import importlib.util
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("archive", Path(__file__).parents[1]/"custom_components/sv_dashboard/history_archive.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
old={"id":"old","startedAt":"2026-08-08T08:00:00Z"}
new={"id":"new","startedAt":"2026-11-27T08:00:00Z"}
a=m.merge_trip_versions(m.empty_trip_archive(), [old,new])
assert m.merge_trip_versions(a, []) == a
b=m.merge_trip_versions(a,[{**old,"updatedAt":"2026-11-27T09:00:00Z"}])
assert len(b["latest"])==2 and len(b["versions"])==3
assert m.digest(old) in b["versions"]
assert m.merge_trip_versions(b,[old],prefer_incoming=False)==b
assert len(m.archive_rows(b))==2
try: m.merge_trip_versions({},[old])
except ValueError: pass
else: raise AssertionError("invalid archive accepted")
state=SimpleNamespace(state="not_home",attributes={"latitude":51,"longitude":8},last_updated=datetime(2026,8,30,tzinfo=timezone.utc))
point=m.position_sample(state)
assert point["latitude"]==51
assert m.merge_points([point],[point])==[point]
assert m.merge_points([point],[])==[point]
assert m.point_geojson([point])["features"][0]["geometry"]["coordinates"]==[8,51]
assert m.position_sample(SimpleNamespace(state="unavailable",attributes=state.attributes,last_updated=state.last_updated)) is None
print("Lossless history archive tests passed")

# Recovery utility stages only a new archive, preserves current exact payload,
# rejects cross-vehicle inputs and refuses overwrite.
import json, subprocess, sys, tempfile
with tempfile.TemporaryDirectory() as directory:
    root=Path(directory)
    current, backup, output = (root/name for name in ("current","backup","archive"))
    key="sv_dashboard_test_server_history"
    store=lambda rows,key=key: {"version":1,"key":key,"data":{"server_trips_raw":rows}}
    current.write_text(json.dumps(store([new])))
    backup.write_text(json.dumps(store([old,{**new,"older":True}])))
    cmd=[sys.executable,str(Path(__file__).parents[1]/"scripts/stage_history_recovery.py"),"--current",str(current),"--backup",str(backup),"--output",str(output)]
    original=current.read_bytes()
    subprocess.run(cmd,check=True,capture_output=True)
    result=json.loads(output.read_text())
    assert result["key"]=="sv_dashboard_test_trip_archive"
    assert {r["id"]:r for r in m.archive_rows(result["data"])}=={"old":old,"new":new}
    assert len(result["data"]["versions"])==3
    assert result["data"]["recovery_pending"] is True
    newer={**new,"updatedAt":"2026-11-28T08:00:00Z"}
    hydrated=m.merge_trip_versions(result["data"],[newer],prefer_incoming=result["data"]["recovery_pending"])
    assert "recovery_pending" not in hydrated and m.digest(new) in hydrated["versions"]
    assert {r["id"]:r for r in m.archive_rows(hydrated)}["new"]==newer
    assert current.read_bytes()==original
    assert subprocess.run(cmd,capture_output=True).returncode!=0
    backup.write_text(json.dumps(store([old],"sv_dashboard_other_server_history")))
    assert subprocess.run(cmd[:-1]+[str(root/"wrong")],capture_output=True).returncode!=0
    assert not (root/"wrong").exists()
print("Recovery staging tests passed")
