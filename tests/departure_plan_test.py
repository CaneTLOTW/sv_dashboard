from datetime import UTC, datetime
from pathlib import Path
import importlib.util

spec = importlib.util.spec_from_file_location("departure_plan", Path(__file__).parents[1] / "custom_components/sv_dashboard/departure_plan.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def weekly(name, days, time):
    return {"name": name, "kind": "weekly", "weekdays": days, "time": time}

def once(day, target="none", enabled=True):
    return {"name": "Exception", "kind": "once", "date": day, "time": "06:30", "override": target, "enabled": enabled}

rows = m.edit_profiles([], "save", weekly("A", [0,2,4], "07:30"), None)
a = rows[0]["id"]
rows = m.edit_profiles(rows, "save", weekly("B", [4], "08:00"), None)
b = rows[1]["id"]
rows = m.edit_profiles(rows, "save", once("2026-11-27", a), None)
ex = rows[2]["id"]
now = datetime(2026,11,26,9,tzinfo=UTC)
out = m.preview(rows, now, "Europe/Berlin")
assert [(p["name"],p["departure"]) for p in out["upcoming"][:2]] == [("Exception","2026-11-27T05:30:00+00:00"),("B","2026-11-27T07:00:00+00:00")]
assert out["upcoming"][0]["start"] == "2026-11-27T05:10:00+00:00"
assert any(p["profile_id"]==a and p["departure"].startswith("2026-12-04") for p in out["upcoming"])
rows = m.edit_profiles(rows,"save",once("2026-11-27","all"),ex)
assert not any(p["profile_id"] in (a,b) and p["departure"].startswith("2026-11-27") for p in m.preview(rows,now,"Europe/Berlin")["upcoming"])
rows = m.edit_profiles(rows,"save",once("2026-11-27","all",False),ex)
assert any(p["profile_id"]==a and p["departure"].startswith("2026-11-27") for p in m.preview(rows,now,"Europe/Berlin")["upcoming"])
rows = m.edit_profiles(rows,"save",once("2026-11-27",a),ex)
rows = m.edit_profiles(rows,"delete",None,a)
assert next(p for p in rows if p["id"]==ex)["override"]=="none"
spring = m.normalize_profile({"name":"DST","kind":"once","date":"2027-03-28","time":"02:30"},"dst")
assert m.preview([spring],datetime(2027,3,27,tzinfo=UTC),"Europe/Berlin")["skipped"][0]["reason"]=="dst_gap"
fall = m.normalize_profile({"name":"DST","kind":"once","date":"2027-10-31","time":"02:30"},"dst")
assert m.preview([fall],datetime(2027,10,30,tzinfo=UTC),"Europe/Berlin")["upcoming"][0]["departure"]=="2027-10-31T00:30:00+00:00"
for invalid in [{**weekly("Bad",[],"07:30")},{**weekly("Bad",[0],"25:00")},{**once("2026-02-30")},{**weekly("Bad",[True],"07:30")}]:
    try: m.normalize_profile(invalid,"bad")
    except ValueError: pass
    else: raise AssertionError(invalid)
for n in range(20):
    rows = m.edit_profiles(rows,"save",weekly(str(n),[0],"08:00"),None)
assert len(rows)==22
print("Departure planning tests passed")
