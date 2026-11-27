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

# Planned display and source-stamped confirmation, no HA receipt fallback.
armed = datetime(2026,11,26,0,tzinfo=UTC)
assert m.next_climate_badge([base], datetime(2026,11,27,3,9,tzinfo=UTC),tz,armed,{}) is None
assert m.next_climate_badge([base], datetime(2026,11,27,3,10,tzinfo=UTC),tz,armed,{})["kind"] == "weekly"
assert m.next_climate_badge([exception], datetime(2026,11,26,12,tzinfo=UTC),tz,armed,{})["kind"] == "once"
assert m.next_climate_badge([exception], datetime(2026,11,26,12,tzinfo=UTC),tz,None,{}) is None
stamp = datetime(2026,11,27,6,10,tzinfo=UTC)
item = {"at":stamp.isoformat(),"dispatched_at":stamp.isoformat(),"departure":(stamp+timedelta(minutes=20)).isoformat(),"status":"submitted","result_notification":"pending"}
new = stamp + timedelta(minutes=2)
assert m.departure_confirmation(item,"on",{"Zuletzt aktualisiert":new.isoformat()},new) == "confirmed"
assert m.departure_confirmation(item,"on",{"Zuletzt aktualisiert":(stamp-timedelta(hours=3)).isoformat()},new) == "submitted"
assert m.departure_confirmation(item,"on",{},stamp+timedelta(minutes=3)) == "submitted"
assert m.departure_confirmation(item,"on",{},stamp+timedelta(minutes=10)) == "unconfirmed"
assert m.departure_confirmation(item,"on",{"Last updated":(stamp+timedelta(minutes=4)).isoformat()},stamp+timedelta(minutes=4)) == "confirmed"
assert m.departure_confirmation(item,"on",{"Last updated":(stamp+timedelta(minutes=11)).isoformat()},stamp+timedelta(minutes=11)) == "unconfirmed"
assert not m.departure_result_due(item,new)
assert m.departure_result_due({**item,"status":"confirmed"},new)
assert not m.departure_result_due({**item,"status":"confirmed","result_notification":"attempted"},new)
assert not m.departure_result_due({**item,"status":"confirmed"},stamp+timedelta(minutes=26))
print("Planned climate badge and terminal result evidence tests passed")

# Estimated SOC loss needs a source-dated baseline/end and continuous clean observation.
from types import SimpleNamespace
sample = lambda soc, at: m.climate_soc_sample(SimpleNamespace(state=str(soc), attributes={"Zuletzt aktualisiert":at.isoformat()}))
baseline = sample(85, stamp-timedelta(minutes=1))
before = m.climate_soc_begin(baseline, stamp, True)
assert before["status"] == "pending"
assert m.climate_soc_begin(sample(85,stamp-timedelta(minutes=16)),stamp,True)["status"] == "unavailable"
assert m.climate_soc_begin(baseline,stamp,False)["status"] == "unavailable"
assert m.climate_soc_sample(SimpleNamespace(state="85",attributes={})) is None
assert m.climate_soc_sample(SimpleNamespace(state="nan",attributes={"Last updated":stamp.isoformat()})) is None
confirmed_item = {**item,"status":"confirmed","climate_confirmed_at":new.isoformat(),"climate_soc":before}
end = stamp + timedelta(minutes=20)
end_attrs={"Last updated":end.isoformat()}
finish = lambda s,guard=True,at=end: m.climate_soc_advance(confirmed_item,s,"off",end_attrs,at,guard)
assert finish(sample(83,end))["loss_pp"] == 2
assert finish(sample(85,end))["loss_pp"] == 0
assert finish(sample(86,end))["status"] == "unavailable"
assert finish(sample(83,end),False)["status"] == "unavailable"
assert finish(sample(83,end-timedelta(minutes=1)))["status"] == "pending"
assert finish(sample(83,end+timedelta(minutes=6)),True,end+timedelta(minutes=6))["status"] == "unavailable"
assert finish(None,True,end+timedelta(minutes=11))["status"] == "unavailable"
assert m.climate_soc_advance(confirmed_item,sample(83,end),"off",{},end,True)["status"] == "pending"
assert m.climate_soc_advance({**confirmed_item,"status":"unconfirmed"},sample(83,end),"off",end_attrs,end,True)["status"] == "unavailable"
print("Climate SOC observation tests passed")

# Early removal only for the unchanged, positively confirmed one-off.
early=at-timedelta(minutes=15)
key="one|"+at.isoformat()
confirmed_row={"status":"confirmed","profile_snapshot":one}
rows,held,expired=m.expire_one_time_profiles([weekly_later,one],[],early,tz,{key:confirmed_row})
assert rows==[weekly_later] and held==[one] and expired==[(one,at)]
effective=rows+[{**p,"_held_only":True} for p in held]
assert not any(r["profile_id"]=="one" for r in m.preview(effective,early,tz)["upcoming"])
assert not any(r["profile_id"]=="series" and r["departure"].startswith("2026-11-26") for r in m.preview(effective,early,tz)["upcoming"])
assert m.expire_one_time_profiles([one],[],early,tz,{key:{"status":"submitted","profile_snapshot":one}})[0]==[one]
edited={**one,"name":"Edited"}
assert m.expire_one_time_profiles([edited],[],early,tz,{key:confirmed_row})[0]==[edited]
assert m.expire_one_time_profiles([weekly_later],[],early,tz,{key:confirmed_row})[0]==[weekly_later]
assert m.departure_confirmation({**item,"dispatch_error":True},"on",{"Last updated":(stamp+timedelta(minutes=7)).isoformat()},stamp+timedelta(minutes=7))=="confirmed"
assert m.departure_confirmation({**item,"departure":(stamp+timedelta(minutes=5)).isoformat()},"off",{},stamp+timedelta(minutes=5))=="unconfirmed"
async def check_early_cleanup():
    calls=[]
    async def save(*args): calls.append(args)
    entry={"at":early.isoformat(),"name":"One","departure":at.isoformat(),"status":"confirmed","profile_snapshot":one,"climate_soc":{"status":"pending"}}
    s=SimpleNamespace(profiles=[one,weekly_later],held_overrides=[],ledger={key:entry},preparation={},revision=1,reminder={},last_reminder=None,execution_enabled_at=early-timedelta(hours=1),hass=SimpleNamespace(config=SimpleNamespace(time_zone=tz)),_persist=save)
    await cleanup(s,early)
    assert s.profiles==[weekly_later] and s.ledger[key]==entry and s.revision==2
    await cleanup(s,early)
    assert len(calls)==1
    s.profiles=[one];s.ledger={};s.held_overrides=[]
    await cleanup(s,at)
    assert s.ledger[key]["status"]=="missed" and s.ledger[key]["result_notification"]=="pending"
asyncio.run(check_early_cleanup())
print("Confirmed profile cleanup and ten-minute confirmation tests passed")

# Retry is bounded by the original confirmation window and durable claim.
assert not m.departure_retry_due(item, stamp+timedelta(minutes=4,seconds=59))
assert m.departure_retry_due(item, stamp+timedelta(minutes=5))
assert m.departure_retry_due(item, stamp+timedelta(minutes=7))
assert not m.departure_retry_due(item, stamp+timedelta(minutes=8))
assert not m.departure_retry_due({**item,"retry":{"status":"claimed"}},stamp+timedelta(minutes=5))
assert not m.departure_retry_due({**item,"status":"confirmed"},stamp+timedelta(minutes=5))
assert not m.departure_retry_due({**item,"status":"unconfirmed"},stamp+timedelta(minutes=5))
assert not m.departure_retry_due({**item,"departure":(stamp+timedelta(minutes=6)).isoformat()},stamp+timedelta(minutes=5))
# Exercise the actual retry method with a fake service and persistent claim.
source = (Path(__file__).parents[1] / "custom_components/sv_dashboard/departure_planning.py").read_text()
manager = next(n for n in ast.parse(source).body if isinstance(n,ast.ClassDef) and n.name=="DeparturePlanning")
retry_method = next(n for n in manager.body if isinstance(n,ast.AsyncFunctionDef) and n.name=="_async_retry_locked")
retry_ns={"dt_util":SimpleNamespace(utcnow=lambda:stamp+timedelta(minutes=5)), "departure_retry_due":m.departure_retry_due,"asyncio":asyncio}
exec(compile(ast.Module(body=[retry_method],type_ignores=[]),"<retry-test>","exec"),retry_ns)
async def check_retry():
    calls=[]
    current=dict(item)
    async def persist(*args): calls.append(("persist",current.get("retry",{}).get("status")))
    async def press(*args,**kwargs):
        assert current["retry"]["status"]=="claimed"
        calls.append(("press",args[2]["entity_id"]))
    button=SimpleNamespace(entity_id="button.climate")
    s=SimpleNamespace(_retry_button=lambda *args:button,_retry_observed={"k":True},profiles=[],revision=1,reminder={},last_reminder=None,_persist=persist,hass=SimpleNamespace(services=SimpleNamespace(async_call=press)))
    await retry_ns["_async_retry_locked"](s,"k",current)
    await retry_ns["_async_retry_locked"](s,"k",current)
    assert calls==[("persist","claimed"),("press","button.climate"),("persist","submitted")]
    assert current["status"]=="submitted" and "k" not in s._retry_observed
    current=dict(item);calls.clear()
    checks=iter([button,None]);s._retry_button=lambda *args:next(checks)
    await retry_ns["_async_retry_locked"](s,"k",current)
    assert calls==[("persist","claimed"),("persist","skipped")]
    assert current["retry"]["status"]=="skipped"
    current=dict(item);calls.clear();s._retry_button=lambda *args:button
    async def bad(*args): raise OSError("storage")
    s._persist=bad
    try: await retry_ns["_async_retry_locked"](s,"k",current)
    except OSError: pass
    else: raise AssertionError("claim failure ignored")
    assert calls==[] and "retry" not in current
asyncio.run(check_retry())
print("Bounded climate retry tests passed")
