from datetime import timedelta
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


evening = datetime(2026,11,26,18,30,tzinfo=UTC)
base = m.normalize_profile({**weekly("A",[4],"07:30"),"min_soc":30},"a")
exception = m.normalize_profile({**once("2026-11-27","a"),"min_soc":20},"ex")
settings = m.normalize_reminder({"enabled":True})
assert m.reminder_candidate([base],evening,"Europe/Berlin",settings,None,17)["minimum"]==30
assert m.reminder_candidate([base,exception],evening,"Europe/Berlin",settings,None,25) is None
assert m.reminder_candidate([base,exception],evening,"Europe/Berlin",settings,None,17)["departure"]=="06:30"
assert m.reminder_candidate([base],evening,"Europe/Berlin",settings,"2026-11-26",17) is None
assert m.reminder_candidate([base],evening,"Europe/Berlin",settings,None,None) is None
assert m.reminder_candidate([base],evening,"Europe/Berlin",m.normalize_reminder({}),None,17) is None
assert m.reminder_candidate([base],datetime(2026,11,26,18,51,tzinfo=UTC),"Europe/Berlin",settings,None,17) is None
assert m.reminder_candidate([base],evening,"Europe/Berlin",settings,None,30) is None
print("Departure reminder tests passed")


due = datetime(2026,11,27,6,10,30,tzinfo=UTC)
armed = datetime(2026,11,26,tzinfo=UTC)
assert len(m.due_occurrences([base], due, "Europe/Berlin", armed, {})) == 1
key = m.due_occurrences([base], due, "Europe/Berlin", armed, {})[0]["key"]
assert not m.due_occurrences([base], due, "Europe/Berlin", armed, {key: {}})
assert not m.due_occurrences([base], due, "Europe/Berlin", due, {})
assert not m.due_occurrences([base, exception], due, "Europe/Berlin", armed, {})
assert not m.due_occurrences([base], due, "Europe/Berlin", None, {})
assert m.climate_gate(base, 35, "off", "off", 0, False, True, True) == "ready"
assert m.climate_gate(base, 17, "off", "on", 0, False, True, True) == "soc"
assert m.climate_gate(base, 35, "on", "on", 0, False, True, True) == "engine"
assert m.climate_gate(base, 35, "off", "on", 0, False, True, False) == "stale"
assert m.climate_gate(base, 35, "off", "on", 0, True, True, True) == "already_active"
print("Departure execution gates passed")


qnow = datetime(2026,11,26,14,38,tzinfo=UTC)
assert m.quick_defaults(qnow,"Europe/Berlin")["time"]=="16:10"
assert m.quick_defaults(datetime(2026,11,26,22,50,tzinfo=UTC),"Europe/Berlin")["date"]=="2026-11-27"
q = {"name":"Once","kind":"once","date":"2026-11-26","time":"16:10","override":"none"}
qr = m.add_quick_profile([],q,qnow,"Europe/Berlin")
assert qr[0]["lead_minutes"]==20 and qr[0]["min_soc"]==20
for vals, current, expected in [({**q,"time":"15:50"},[], "quick_past"),(q,qr,"quick_duplicate"),({**q,"date":"2027-03-28","time":"02:30"},[],"quick_dst")]:
    try: m.add_quick_profile(current,vals,qnow,"Europe/Berlin")
    except ValueError as exc: assert str(exc)==expected
    else: raise AssertionError(expected)
print("Quick departure tests passed")


# 16:00 CET reproduction: armed shortly before start, stale heartbeat.
armed_late = datetime(2026,11,27,6,7,5,tzinfo=UTC)
start = datetime(2026,11,27,6,10,tzinfo=UTC)
k = m.execution_candidates([base],armed_late+timedelta(seconds=30),"Europe/Berlin",armed_late,{}, {})[0]["key"]
assert m.execution_candidates([base],armed_late+timedelta(seconds=30),"Europe/Berlin",armed_late,{}, {})[0]["phase"]=="prepare"
assert m.execution_candidates([base],start+timedelta(seconds=42),"Europe/Berlin",armed_late,{}, {})[0]["phase"]=="due"
assert m.execution_candidates([base],start+timedelta(minutes=3),"Europe/Berlin",armed_late,{}, {k:{}})[0]["phase"]=="due"
assert m.execution_candidates([base],start+timedelta(minutes=3),"Europe/Berlin",armed_late,{}, {})[0]["phase"]=="missed"
assert m.execution_candidates([base],start+timedelta(minutes=5),"Europe/Berlin",armed_late,{}, {k:{}})[0]["phase"]=="missed"
assert not m.execution_candidates([base],start+timedelta(minutes=20),"Europe/Berlin",armed_late,{}, {k:{}})
assert not m.execution_candidates([base],start,"Europe/Berlin",None,{}, {})
assert not m.execution_candidates([base,exception],start,"Europe/Berlin",armed_late,{}, {})
assert not m.execution_candidates([base],start,"Europe/Berlin",armed_late,{k:{}},{})
assert not m.fresh_heartbeat(start,start-timedelta(minutes=78),"upstream_payload_timestamp")
assert not m.fresh_heartbeat(start,start,"ha_last_updated")
assert m.fresh_heartbeat(start,start-timedelta(minutes=1),"upstream_payload_timestamp")
print("Departure preparation windows passed")
