"""Immutable local evidence journal. No interpolation or vehicle requests."""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

# Allowlisted vehicle signals, not credentials, VIN, tokens or user settings.
SIGNALS = frozenset("""
battery battery_capacity battery_residual battery_health_capacity battery_health_resistance
battery_charging battery_charging_rate battery_charging_end battery_charging_type battery_plugged
battery_voltage battery_current battery_power battery_temperature battery_charging_power
autonomy electric_autonomy electric_range range mileage odometer engine fuel fuel_autonomy
fuel_consumption_total fuel_consumption_instant fuel_refill_amount refill_amount fuel_capacity
fuel_level tank_capacity temperature service_battery service_battery_voltage preconditioning
preconditioning_start preconditioning_stop command_status remote_availability remote_command_available
remote_control_available connectivity availability refresh_interval last_charge last_trip
last_update last_updated last_vehicle_update remote_commands wakeup manual_wakeup
""".split())
ATTRIBUTES = frozenset(("unit_of_measurement", "Last updated", "Zuletzt aktualisiert", "last_updated", "updatedAt", "updated_at", "createdAt", "created_at", "source_timestamp", "source_time"))


def signal_mapping(mapping):
    result = {}
    for key, entity in mapping.items():
        if not isinstance(entity, str) or "." not in entity:
            continue
        domain = entity.split(".", 1)[0]
        if domain not in ("sensor", "binary_sensor", "button"):
            continue
        signal = key.removesuffix("_" + domain)
        if signal in SIGNALS:
            result[entity] = signal
    return result


def iso(value):
    if isinstance(value, datetime) and value.tzinfo:
        return value.astimezone(timezone.utc).isoformat()
    return None


def observation(signal, state):
    if state is None:
        return None
    at = iso(getattr(state, "last_updated", None))
    if at is None:
        return None
    attributes = {}
    for key, value in (getattr(state, "attributes", {}) or {}).items():
        if key in ATTRIBUTES and isinstance(value, (str, int, float, bool, datetime)):
            attributes[key] = value.isoformat() if isinstance(value, datetime) else value
    # Do not coerce, round, validate plausibility, or manufacture source time.
    return {"signal": signal, "entity_id": state.entity_id, "received_at": at,
            "changed_at": iso(getattr(state, "last_changed", None)),
            "value": state.state, "attributes": attributes}


def encode(kind, identity, payload):
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return (kind, str(identity), hashlib.sha256(raw.encode()).hexdigest(), raw)


def collection_records(kind, rows):
    if isinstance(rows, dict):
        for key, row in rows.items():
            if isinstance(row, dict):
                yield encode(kind, key, row)
    elif isinstance(rows, list):
        for row in rows:
            if isinstance(row, dict):
                key = row.get("id") or row.get("source_time") or row.get("time") or row.get("at") or row.get("start_time") or row.get("end_time") or "unkeyed"
                yield encode(kind, key, row)


def source_records(suffix, data):
    """Archive existing evidence, not an executable configuration restore."""
    if not isinstance(data, dict):
        return
    fields = {
        "metrics": {"trips": "local_trip", "charges": "local_charge", "pending_trips": "pending_trip"},
        "fuel_history": {"events": "refuel_event"},
        "departure_plans": {"ledger": "departure_execution", "preparation": "departure_preparation"},
        "notifications": {"wakeup_activity": "wakeup_event"},
        "server_history": {"recorder_capacity_samples_archive": "capacity_evidence",
                           "recorder_observed_charges_archive": "observed_charge",
                           "monthly_temperature_archive": "temperature_association",
                           "plug_connection_windows": "plug_window"},
        "charge_curves": {"sessions": "charge_curve"},
    }.get(suffix, {})
    for field, kind in fields.items():
        yield from collection_records(kind, data.get(field))
    if suffix == "metrics":
        for field in ("active_trip", "active_charge", "last_trip", "last_charge"):
            if isinstance(data.get(field), dict):
                yield from collection_records(field, [data[field]])
    if suffix == "notifications" and isinstance(data.get("last_notification"), dict):
        row = {key: data["last_notification"].get(key) for key in ("type","title","message","time")}
        yield from collection_records("notification_event", [row])
    if suffix == "server_history" and isinstance(data.get("legacy_live_snapshot"), dict):
        yield from collection_records("local_trip", data["legacy_live_snapshot"].get("trips"))
        yield from collection_records("local_charge", data["legacy_live_snapshot"].get("charges"))


def open_journal(path):
    path = Path(path)
    if path.is_symlink():
        raise ValueError("archive symlink refused")
    if not path.exists():
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            os.close(fd)
    if not path.is_file() or path.is_symlink():
        raise ValueError("invalid archive path")
    db = sqlite3.connect(path, timeout=30)
    try:
        db.execute("PRAGMA synchronous=FULL")
        db.execute("CREATE TABLE IF NOT EXISTS evidence (kind TEXT NOT NULL, identity TEXT NOT NULL, digest TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind, identity, digest)) WITHOUT ROWID")
        db.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        db.commit()
    except Exception:
        db.close()
        raise
    return db


def write_records(path, records, cursor=None):
    db = open_journal(path)
    try:
        with db:
            db.executemany("INSERT OR IGNORE INTO evidence VALUES (?, ?, ?, ?)", records)
            if cursor is not None:
                db.execute("INSERT INTO metadata VALUES ('recorder_cursor', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (cursor,))
        return db.execute("SELECT count(*) FROM evidence").fetchone()[0]
    finally:
        db.close()


def read_cursor(path):
    db = open_journal(path)
    try:
        row = db.execute("SELECT value FROM metadata WHERE key='recorder_cursor'").fetchone()
        return (row[0] if row else None, db.execute("SELECT count(*) FROM evidence").fetchone()[0])
    finally:
        db.close()
