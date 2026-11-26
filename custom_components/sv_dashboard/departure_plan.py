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
            if departure < now:
                continue
            start = departure - timedelta(minutes=p["lead_minutes"])
            upcoming.append({"profile_id": p["id"], "name": p["name"], "kind": p["kind"],
                "departure": departure.isoformat(), "start": start.isoformat(),
                "start_passed": start < now, "target_soc": p["target_soc"]})
    upcoming.sort(key=lambda p: (p["departure"], p["profile_id"]))
    return {"today": today.isoformat(), "timezone": timezone_name, "upcoming": upcoming, "skipped": skipped}
