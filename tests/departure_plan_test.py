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
assert settings["min_soc"] == 30
assert m.reminder_candidate(evening,"Europe/Berlin",settings,None,17) == {"date":"2026-11-26","minimum":30,"soc":17}
assert m.reminder_candidate(evening,"Europe/Berlin",settings,None,29)["minimum"] == 30
assert m.reminder_candidate(evening,"Europe/Berlin",settings,"2026-11-26",17) is None
for invalid in (None, -1, 101, float("nan"), True, "17"):
    assert m.reminder_candidate(evening,"Europe/Berlin",settings,None,invalid) is None
assert m.reminder_candidate(evening,"Europe/Berlin",m.normalize_reminder({}),None,17) is None
assert m.reminder_candidate(datetime(2026,11,26,18,51,tzinfo=UTC),"Europe/Berlin",settings,None,17) is None
assert m.reminder_candidate(evening,"Europe/Berlin",settings,None,30) is None
custom = m.normalize_reminder({"enabled":True,"min_soc":75,"time":"19:30"})
assert m.reminder_candidate(evening,"Europe/Berlin",custom,None,74)["minimum"] == 75
assert m.reminder_candidate(evening,"Europe/Berlin",custom,None,75) is None
for invalid in (0,101,True,20.5,"30"):
    try:
        m.normalize_reminder({"min_soc":invalid})
    except ValueError:
        pass
    else:
        raise AssertionError("invalid warning threshold")
print("Departure reminder tests passed")


due = datetime(2026,11,27,6,10,30,tzinfo=UTC)
armed = datetime(2026,11,26,tzinfo=UTC)
assert len(m.due_occurrences([base], due, "Europe/Berlin", armed, {})) == 1
key = m.due_occurrences([base], due, "Europe/Berlin", armed, {})[0]["key"]
assert not m.due_occurrences([base], due, "Europe/Berlin", armed, {key: {}})
assert not m.due_occurrences([base], due, "Europe/Berlin", due, {})
assert not m.due_occurrences([base, exception], due, "Europe/Berlin", armed, {})
assert not m.due_occurrences([base], due, "Europe/Berlin", None, {})
assert m.climate_gate(base, 35, "off", "off", 0, False, True, True, climate_min_soc=30) == "ready"
assert m.climate_gate(base, 17, "off", "on", 0, False, True, True, climate_min_soc=30) == "soc"
assert m.climate_gate(base, 35, "on", "on", 0, False, True, True, climate_min_soc=30) == "engine"
assert m.climate_gate(base, 35, "off", "on", 0, False, True, False, climate_min_soc=30) == "stale"
assert m.climate_gate(base, 35, "off", "on", 0, True, True, True, climate_min_soc=30) == "already_active"
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


# Cleanup at the exact departure instant, including disabled and old one-offs.
tz = "Europe/Berlin"
at = datetime(2026,11,26,15,0,tzinfo=UTC)
weekly_later = m.normalize_profile(weekly("Evening",[3],"18:00"),"series")
one = m.normalize_profile({"name":"One","kind":"once","date":"2026-11-26","time":"16:00","override":"all"},"one")
disabled = m.normalize_profile({**one,"enabled":False,"override":"none"},"disabled")
future = m.normalize_profile({**one,"date":"2026-11-27","override":"none"},"future")
old = m.normalize_profile({**one,"date":"2026-11-25"},"old")
active, held, expired = m.expire_one_time_profiles([weekly_later,one,disabled,future,old],[],at,tz)
assert active == [weekly_later,future]
assert held == [one]
assert {p["id"] for p,_ in expired} == {"one","disabled","old"}
assert m.expire_one_time_profiles([one],[],at-timedelta(seconds=1),tz)[0] == [one]
assert not any(r["profile_id"]=="one" for r in m.preview(active+held,at,tz)["upcoming"])
assert not any(r["profile_id"]=="series" and r["departure"].startswith("2026-11-26") for r in m.preview(active+held,at,tz)["upcoming"])
next_day = datetime(2026,11,26,23,0,tzinfo=UTC)
assert m.expire_one_time_profiles(active,held,next_day,tz)[1] == []
assert any(r["profile_id"]=="series" for r in m.preview(active,next_day,tz)["upcoming"])
gap = m.normalize_profile({**one,"date":"2027-03-28","time":"02:30"},"gap")
assert m.expire_one_time_profiles([gap],[],datetime(2027,3,28,12,tzinfo=UTC),tz)[0] == [gap]
assert m.expire_one_time_profiles([gap],[],datetime(2027,3,29,0,tzinfo=UTC),tz)[0] == []
fall = m.normalize_profile({**one,"date":"2027-10-31","time":"02:30"},"fall")
assert m.expire_one_time_profiles([fall],[],datetime(2027,10,31,0,30,tzinfo=UTC),tz)[0] == []
print("One-time profile expiry and date-wide exception tests passed")

# Exercise the actual async cleanup implementation without HA or network.
import ast
import asyncio
from types import SimpleNamespace
source = (Path(__file__).parents[1] / "custom_components/sv_dashboard/departure_planning.py").read_text()
manager = next(n for n in ast.parse(source).body if isinstance(n,ast.ClassDef) and n.name=="DeparturePlanning")
method = next(n for n in manager.body if isinstance(n,ast.AsyncFunctionDef) and n.name=="_async_cleanup_locked")
namespace = {"expire_one_time_profiles":m.expire_one_time_profiles,"timedelta":timedelta,
             "dt_util":SimpleNamespace(parse_datetime=lambda v:datetime.fromisoformat(v) if v else None)}
exec(compile(ast.Module(body=[method],type_ignores=[]),"<cleanup-test>","exec"),namespace)
cleanup = namespace["_async_cleanup_locked"]

async def check_cleanup():
    calls = []
    async def save(rows, revision, reminder, last_reminder):
        calls.append((rows,revision))
    k = "one|"+at.isoformat()
    old_key = "old|2026-09-01T12:00:00+00:00"
    existing = {"at":(at-timedelta(minutes=20)).isoformat(),"status":"stale","name":"One"}
    s = SimpleNamespace(profiles=[weekly_later,one],held_overrides=[],ledger={k:existing,old_key:{"at":"2026-09-01T12:00:00+00:00"}},preparation={},
                        revision=4,reminder={},last_reminder=None,hass=SimpleNamespace(config=SimpleNamespace(time_zone=tz)),_persist=save)
    await cleanup(s,at)
    assert s.profiles == [weekly_later] and s.held_overrides == [one] and s.revision==5
    assert s.ledger == {k:existing} and len(calls)==1
    await cleanup(s,at)
    assert len(calls)==1
    await cleanup(s,next_day)
    assert s.held_overrides==[] and s.revision==5 and len(calls)==2
    async def fail(*args): raise OSError("test")
    s.profiles=[one];s._persist=fail
    before=(s.profiles,s.held_overrides,s.ledger,s.preparation,s.revision)
    try: await cleanup(s,at)
    except OSError: pass
    else: raise AssertionError("storage failure ignored")
    assert (s.profiles,s.held_overrides,s.ledger,s.preparation,s.revision)==before
    s._persist=save;s.ledger={};s.preparation={k:{"at":(at-timedelta(minutes=30)).isoformat(),"status":"submitted"}}
    await cleanup(s,at)
    assert s.ledger[k]["status"]=="missed" and s.ledger[k]["preparation"]["status"]=="submitted"
asyncio.run(check_cleanup())
print("Cleanup persistence, history retention and rollback tests passed")

# Global climate reserve overrides legacy profile minima; no migration lowering.
assert m.migrate_climate_min_soc([]) == 20
assert m.migrate_climate_min_soc([base, exception]) == 30
for invalid in (19,0,101,True,30.5,"30",None):
    try: m.normalize_climate_min_soc(invalid)
    except ValueError: pass
    else: raise AssertionError("invalid global climate minimum")
for profile in (base, exception):
    assert m.climate_gate(profile, 19, "off", "on", 0, False, True, True, climate_min_soc=20) == "soc"
    assert m.climate_gate(profile, 20, "off", "off", 0, False, True, True, climate_min_soc=20) == "ready"
    assert m.climate_gate(profile, 29, "off", "on", 0, False, True, True, climate_min_soc=30) == "soc"
    assert m.climate_gate(profile, 30, "off", "off", 0, False, True, True, climate_min_soc=30) == "ready"
print("Global climate reserve tests passed")
