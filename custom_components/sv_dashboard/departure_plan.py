"""Pure departure-plan validation and calendar preview (no command dispatch)."""
from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo
import re


def _integer(value, lo, hi):
    if type(value) is not int or not lo <= value <= hi:
        raise ValueError("invalid_number")
    return value


def _optional(value, lo, hi):
    return None if value is None else _integer(value, lo, hi)


def _bool(value):
    if type(value) is not bool:
        raise ValueError("invalid_boolean")
    return value


def normalize_profile(value: dict, profile_id: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError("invalid_profile")
    name = value.get("name")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
        raise ValueError("invalid_name")
    kind = value.get("kind")
    if kind not in ("weekly", "once"):
        raise ValueError("invalid_kind")
    at = value.get("time")
    if not isinstance(at, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", at):
        raise ValueError("invalid_time")
    weekdays, day, override = [], None, "none"
    if kind == "weekly":
        raw = value.get("weekdays", [])
        if not isinstance(raw, list) or not raw:
            raise ValueError("invalid_weekdays")
        weekdays = sorted({_integer(x, 0, 6) for x in raw})
    else:
        day = value.get("date")
        if not isinstance(day, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
            raise ValueError("invalid_date")
        try:
            date.fromisoformat(day)
        except ValueError as exc:
            raise ValueError("invalid_date") from exc
        override = value.get("override", "none")
        if not isinstance(override, str) or len(override) > 50:
            raise ValueError("invalid_override")
    return {"id": profile_id, "name": name.strip(), "enabled": _bool(value.get("enabled", True)),
            "kind": kind, "time": at, "weekdays": weekdays, "date": day,
            "override": override, "lead_minutes": _integer(value.get("lead_minutes", 20), 5, 60),
            "min_soc": _integer(value.get("min_soc", 20), 0, 100),
            "only_plugged": _bool(value.get("only_plugged", False)),
            "below_c": _optional(value.get("below_c"), -25, 35),
            "target_soc": _optional(value.get("target_soc"), 1, 100)}


def edit_profiles(profiles: list, op: str, value: dict | None, profile_id: str | None) -> list:
    """Return a new collection. IDs are server-issued; no fixed profile cap."""
    rows = [dict(p) for p in profiles]
    existing = next((p for p in rows if p["id"] == profile_id), None)
    if op == "delete":
        if existing is None:
            raise ValueError("not_found")
        rows = [p for p in rows if p["id"] != profile_id]
        for p in rows:
            if p["override"] == profile_id:
                p["override"] = "none"
        return rows
    if op != "save" or (profile_id is not None and existing is None):
        raise ValueError("not_found")
    profile = normalize_profile(value, profile_id or uuid4().hex)
    target = profile["override"]
    if target not in ("none", "all") and not any(p["id"] == target and p["kind"] == "weekly" and p["id"] != profile["id"] for p in rows):
        raise ValueError("invalid_override")
    if existing is not None:
        rows = [profile if p["id"] == profile_id else p for p in rows]
        if profile["kind"] != "weekly":
            for p in rows:
                if p["override"] == profile_id:
                    p["override"] = "none"
    else:
        rows.append(profile)
    return rows


def _local_departure(day: date, clock: str, tz: ZoneInfo) -> datetime | None:
    # On autumn DST overlap choose the first occurrence; spring gaps are skipped.
    wall = datetime.combine(day, time.fromisoformat(clock))
    aware = wall.replace(tzinfo=tz, fold=0)
    if aware.astimezone(UTC).astimezone(tz).replace(tzinfo=None) != wall:
        return None
    return aware.astimezone(UTC)


def preview(profiles: list, now: datetime, timezone_name: str, days: int = 14) -> dict:
    tz = ZoneInfo(timezone_name)
    now = now.astimezone(UTC)
    today = now.astimezone(tz).date()
    enabled = [p for p in profiles if p["enabled"]]
    upcoming, skipped = [], []
    for offset in range(days):
        day = today + timedelta(days=offset)
        once = [p for p in enabled if p["kind"] == "once" and p["date"] == day.isoformat()]
        overrides = {p["override"] for p in once}
        weekly = [p for p in enabled if p["kind"] == "weekly" and day.weekday() in p["weekdays"]]
        for p in weekly + once:
            if p["kind"] == "weekly" and ("all" in overrides or p["id"] in overrides):
                skipped.append({"profile_id": p["id"], "date": day.isoformat(), "reason": "override"})
                continue
            departure = _local_departure(day, p["time"], tz)
            if departure is None:
                skipped.append({"profile_id": p["id"], "date": day.isoformat(), "reason": "dst_gap"})
                continue
            if departure <= now:
                continue
            start = departure - timedelta(minutes=p["lead_minutes"])
            upcoming.append({"profile_id": p["id"], "name": p["name"], "kind": p["kind"],
                "departure": departure.isoformat(), "start": start.isoformat(),
                "start_passed": start < now, "target_soc": p["target_soc"]})
    upcoming.sort(key=lambda p: (p["departure"], p["profile_id"]))
    return {"today": today.isoformat(), "timezone": timezone_name, "upcoming": upcoming, "skipped": skipped}


def normalize_reminder(value: dict) -> dict:
    if not isinstance(value, dict):
        raise ValueError("invalid_reminder")
    clock = value.get("time", "19:30")
    if not isinstance(clock, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", clock):
        raise ValueError("invalid_time")
    return {"enabled": _bool(value.get("enabled", False)), "time": clock}


def reminder_candidate(profiles: list, now: datetime, timezone_name: str,
                       settings: dict, last_date: str | None, soc: float | None) -> dict | None:
    """One warning per evening, for a real next-morning departure after overrides.

    The last reported SoC is a risk signal, not a forecast or a command gate.
    Never assume charging plans, temperature, or plug status tomorrow.
    """
    if not settings["enabled"] or soc is None or not 0 <= soc <= 100:
        return None
    tz = ZoneInfo(timezone_name)
    local = now.astimezone(tz)
    today = local.date()
    if last_date == today.isoformat():
        return None
    scheduled = _local_departure(today, settings["time"], tz)
    if scheduled is None or not timedelta(0) <= now.astimezone(UTC) - scheduled < timedelta(minutes=20):
        return None
    tomorrow = today + timedelta(days=1)
    by_id = {p["id"]: p for p in profiles}
    for occurrence in preview(profiles, now, timezone_name, 2)["upcoming"]:
        departure = datetime.fromisoformat(occurrence["departure"]).astimezone(tz)
        if departure.date() != tomorrow or departure.hour >= 12:
            continue
        profile = by_id[occurrence["profile_id"]]
        minimum = profile["min_soc"]
        # The desired departure charge is deliberately separate from the
        # climate threshold. This reminder is about the climate risk only.
        if soc < minimum:
            start = datetime.fromisoformat(occurrence["start"]).astimezone(tz)
            return {"date": today.isoformat(), "departure": departure.strftime("%H:%M"),
                    "start": start.strftime("%H:%M"), "minimum": minimum, "soc": soc}
    return None


def due_occurrences(profiles, now, timezone_name, enabled_at, ledger):
    """Only new, currently due starts; no catch-up after more than two minutes."""
    now = now.astimezone(UTC)
    if enabled_at is None:
        return []
    result = []
    for row in preview(profiles, now, timezone_name, 2)["upcoming"]:
        start = datetime.fromisoformat(row["start"])
        key = row["profile_id"] + "|" + row["departure"]
        if start > enabled_at and timedelta(0) <= now - start < timedelta(minutes=2) and key not in ledger:
            result.append({**row, "key": key})
    return sorted(result, key=lambda row: (row["start"], row["departure"], row["profile_id"]))


def climate_gate(profile, soc, engine, plugged, temperature, climate, button_available, fresh):
    """Conservative gate; never infer availability from a cable alone."""
    if not button_available:
        return "unavailable"
    if not fresh:
        return "stale"
    if engine != "off":
        return "engine"
    if climate is True:
        return "already_active"
    if climate is not False:
        return "unknown"
    if soc is None or not 0 <= soc <= 100 or soc < profile["min_soc"]:
        return "soc"
    if profile["only_plugged"] and plugged != "on":
        return "plug"
    if profile["below_c"] is not None and (temperature is None or not -70 <= temperature <= 70 or temperature >= profile["below_c"]):
        return "temperature"
    return "ready"


def climate_state(raw):
    if str(raw).lower() in ("on", "true", "inprogress", "running", "enabled"):
        return True
    if str(raw).lower() in ("off", "false", "disabled", "finished", "stopped"):
        return False
    return None


def quick_defaults(now: datetime, timezone_name: str) -> dict:
    """Suggest a departure about 30 minutes away, rounded up to five minutes."""
    tz = ZoneInfo(timezone_name)
    candidate = now.astimezone(UTC) + timedelta(minutes=30)
    candidate = candidate.replace(second=0, microsecond=0) + timedelta(minutes=(-candidate.minute) % 5)
    local = candidate.astimezone(tz)
    today = now.astimezone(tz).date()
    return {"date": local.date().isoformat(), "time": local.strftime("%H:%M"),
            "today": today.isoformat(), "tomorrow": (today + timedelta(days=1)).isoformat()}


def add_quick_profile(profiles, value, now, timezone_name):
    """Use the same profile contract, with a future climate start guaranteed."""
    profile = normalize_profile(value, "quick")
    if profile["kind"] != "once" or not profile["enabled"]:
        raise ValueError("invalid_profile")
    departure = _local_departure(date.fromisoformat(profile["date"]), profile["time"], ZoneInfo(timezone_name))
    if departure is None:
        raise ValueError("quick_dst")
    if departure - timedelta(minutes=profile["lead_minutes"]) <= now.astimezone(UTC):
        raise ValueError("quick_past")
    if any(p["kind"] == "once" and p["enabled"] and p["date"] == profile["date"]
           and p["time"] == profile["time"] for p in profiles):
        raise ValueError("quick_duplicate")
    return edit_profiles(profiles, "save", profile, None)


def execution_candidates(profiles, now, timezone_name, enabled_at, ledger, preparation):
    """Effective upcoming occurrences with bounded preparation and late-start window."""
    now = now.astimezone(UTC)
    if enabled_at is None:
        return []
    result = []
    for row in preview(profiles, now, timezone_name, 2)["upcoming"]:
        start = datetime.fromisoformat(row["start"])
        departure = datetime.fromisoformat(row["departure"])
        key = row["profile_id"] + "|" + row["departure"]
        if start <= enabled_at or key in ledger or now >= departure or now < start - timedelta(minutes=10):
            continue
        deadline = min(start + timedelta(minutes=5), departure)
        if now < start:
            phase = "prepare"
        elif now >= deadline or (now >= start + timedelta(minutes=2) and key not in preparation):
            phase = "missed"
        else:
            phase = "due"
        result.append({**row, "key": key, "phase": phase, "deadline": deadline.isoformat()})
    return sorted(result, key=lambda row: (row["start"], row["departure"], row["profile_id"]))


def fresh_heartbeat(now, stamp, source):
    return bool(stamp is not None and stamp.tzinfo is not None and
                source == "upstream_payload_timestamp" and
                timedelta(0) <= now - stamp <= timedelta(minutes=15))


def expire_one_time_profiles(profiles, held_overrides, now, timezone_name):
    """Remove elapsed one-offs; preserve their date-wide series exceptions until midnight."""
    now = now.astimezone(UTC)
    tz = ZoneInfo(timezone_name)
    today = now.astimezone(tz).date()
    kept, expired = [], []
    held = {p["id"]: p for p in held_overrides if p["date"] == today.isoformat()}
    for p in profiles:
        if p["kind"] != "once":
            kept.append(p)
            continue
        day = date.fromisoformat(p["date"])
        departure = _local_departure(day, p["time"], tz)
        # A nonexistent DST wall-clock time has no instant; remove after its date.
        if day < today or (departure is not None and departure <= now):
            expired.append((p, departure))
            if day == today and departure is not None and p["enabled"] and p["override"] != "none":
                held[p["id"]] = p
        else:
            kept.append(p)
    return kept, list(held.values()), expired
