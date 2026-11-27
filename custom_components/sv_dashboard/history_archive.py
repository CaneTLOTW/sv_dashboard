"""Lossless local history primitives, independent of HA Recorder retention."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import math


def empty_trip_archive():
    return {"schema": 1, "latest": {}, "versions": {}}


def digest(row):
    return hashlib.sha256(json.dumps(row, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def merge_trip_versions(archive, rows, *, prefer_incoming=True):
    if not isinstance(archive, dict) or archive.get("schema") != 1 or not isinstance(archive.get("latest"), dict) or not isinstance(archive.get("versions"), dict):
        raise ValueError("invalid trip archive")
    latest, versions = dict(archive["latest"]), dict(archive["versions"])
    for key, value in latest.items():
        if value not in versions or not isinstance(versions[value], dict) or str(versions[value].get("id")) != key:
            raise ValueError("invalid trip archive reference")
    for fingerprint, row in versions.items():
        if not isinstance(row, dict) or not row.get("id") or digest(row) != fingerprint:
            raise ValueError("invalid trip archive payload")
    for row in rows:
        if not isinstance(row, dict) or not row.get("id"):
            raise ValueError("invalid raw trip")
        key, fingerprint = str(row["id"]), digest(row)
        versions.setdefault(fingerprint, row)
        if prefer_incoming or key not in latest:
            latest[key] = fingerprint
    return {"schema": 1, "latest": latest, "versions": versions}


def archive_rows(archive):
    return [archive["versions"][key] for key in archive["latest"].values()]


def position_sample(state):
    """Observed HA state time, not an inferred GPS fix time."""
    if state is None or getattr(state, "state", None) in ("unknown", "unavailable"):
        return None
    try:
        lat, lon = float(state.attributes["latitude"]), float(state.attributes["longitude"])
        at = state.last_updated
        if not at.tzinfo or not math.isfinite(lat) or not math.isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            return None
        return {"at": at.astimezone(timezone.utc).isoformat(), "latitude": lat, "longitude": lon}
    except (TypeError, ValueError, AttributeError, KeyError):
        return None


def merge_points(existing, incoming):
    """Deduplicate exact observations; never interpolate or expire points."""
    result = {}
    for point in [*existing, *incoming]:
        if not isinstance(point, dict):
            raise ValueError("invalid GPS point")
        at = datetime.fromisoformat(point["at"])
        lat, lon = point["latitude"], point["longitude"]
        if not at.tzinfo or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise ValueError("invalid GPS point")
        result[(at.astimezone(timezone.utc).isoformat(), lat, lon)] = point
    return [result[key] for key in sorted(result)]


def point_geojson(points):
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [p["longitude"], p["latitude"]]},
         "properties": {"start_time": p["at"], "end_time": p["at"], "position_source": "ha_tracker_archive", "route_detail": "observed_point"}}
        for p in points
    ]}
