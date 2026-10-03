"""Resolve canonical trip telemetry independently from matched field evidence."""

from __future__ import annotations

from datetime import datetime
import math
from typing import Any

from .trip_repair import local_trip_backfill_quality

_MATCH_TIME_TOLERANCE_SECONDS = 5 * 60
_MATCH_DURATION_TOLERANCE_SECONDS = 120
_MATCH_START_MILEAGE_TOLERANCE_KM = 0.5
_MATCH_END_MILEAGE_TOLERANCE_KM = 1.0
_MATCH_DISTANCE_RELATIVE_TOLERANCE = 0.15
_BOUNDARY_FRESHNESS_SECONDS = 10 * 60
_EXACT_BOUNDARY_TOLERANCE_SECONDS = 2 * 60

_FIELD_BOUNDARIES = {
    "soc_start": ("soc", "start_soc", "stellantis_trip.startEnergies.Electric.level", 1.5),
    "soc_end": ("soc", "end_soc", "stellantis_trip.endEnergies.Electric.level", 1.5),
    "electric_range_start_km": (
        "electric_range_km", "start_autonomy", "stellantis_trip.startEnergies.Electric.autonomy", 3.0
    ),
    "electric_range_end_km": (
        "electric_range_km", "end_autonomy", "stellantis_trip.endEnergies.Electric.autonomy", 3.0
    ),
    "fuel_level_start": ("fuel_level", "start_fuel", "stellantis_trip.startEnergies.Fuel.level", 2.0),
    "fuel_level_end": ("fuel_level", "end_fuel", "stellantis_trip.endEnergies.Fuel.level", 2.0),
    "fuel_range_start_km": (
        "fuel_range_km", "start_fuel_range", "stellantis_trip.startEnergies.Fuel.autonomy", 15.0
    ),
    "fuel_range_end_km": (
        "fuel_range_km", "end_fuel_range", "stellantis_trip.endEnergies.Fuel.autonomy", 15.0
    ),
}

_FIELD_PAIRS = (
    ("soc_start", "soc_end", 1.5),
    ("electric_range_start_km", "electric_range_end_km", 3.0),
    ("fuel_level_start", "fuel_level_end", 2.0),
    ("fuel_range_start_km", "fuel_range_end_km", 15.0),
)


def _number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _time(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value.strip():
        text = value.strip()
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed


def _delta_seconds(left: Any, right: Any) -> float | None:
    first, second = _time(left), _time(right)
    if first is None or second is None:
        return None
    try:
        return abs((first - second).total_seconds())
    except TypeError:
        return None


def _boundary_observation(local: dict[str, Any], field: str, edge: str) -> dict[str, Any] | None:
    if not isinstance(local, dict):
        return None
    evidence = local.get("boundary_evidence")
    if isinstance(evidence, dict):
        edge_evidence = evidence.get(edge)
        observation = edge_evidence.get(field) if isinstance(edge_evidence, dict) else None
        if isinstance(observation, dict) and _number(observation.get("value")) is not None:
            return observation

    # Older metric stores captured SOC/fuel/mileage/capacity at the transition,
    # but did not persist each entity's timestamp. Preserve those observations
    # as legacy boundary evidence without fabricating timestamps or new fields.
    legacy_keys = {
        "soc": "start_soc" if edge == "start" else "end_soc",
        "fuel_level": "start_fuel" if edge == "start" else "end_fuel",
        "fuel_range_km": "start_fuel_range" if edge == "start" else "end_fuel_range",
        "fuel_consumption_total": "start_fuel_total" if edge == "start" else "end_fuel_total",
    }
    key = legacy_keys.get(field)
    value = _number(local.get(key)) if key else None
    if value is None:
        return None
    return {"value": value, "timestamp_source": "not_recorded", "source": "legacy_boundary"}


def _fresh_observation(
    local: dict[str, Any],
    field: str,
    edge: str,
    *,
    reference_time: Any = None,
) -> dict[str, Any] | None:
    """Return boundary evidence that is fresh enough to use as a fallback.

    Freshness is evaluated against the canonical/server trip boundary when it
    is available. Untimestamped legacy observations remain readable only as
    fallback evidence; they can never become an exact boundary.
    """
    observation = _boundary_observation(local, field, edge)
    if observation is None:
        return None
    if observation.get("source") == "legacy_boundary":
        return observation

    boundary_time = (
        reference_time
        if reference_time is not None
        else local.get("start_time" if edge == "start" else "end_time")
    )
    age = _delta_seconds(observation.get("source_time"), boundary_time)
    if age is not None and age <= _BOUNDARY_FRESHNESS_SECONDS:
        return observation
    return None


def _local_value(
    local: dict[str, Any],
    field: str,
    edge: str,
    *,
    reference_time: Any = None,
) -> float | None:
    spec = _FIELD_BOUNDARIES.get(field)
    if spec is None:
        return None
    evidence_field, _legacy_key, _server_source, _tolerance = spec
    observation = _fresh_observation(
        local, evidence_field, edge, reference_time=reference_time
    )
    return _number(observation.get("value")) if observation is not None else None


def _local_boundary_source(
    local: dict[str, Any],
    field: str,
    edge: str,
    *,
    reference_time: Any = None,
) -> str | None:
    """Classify local evidence as exact upstream boundary or fallback only."""
    observation = _fresh_observation(
        local, field, edge, reference_time=reference_time
    )
    if observation is None:
        return None
    if observation.get("source") == "legacy_boundary":
        return "sv_local_trip_boundary_fallback"

    # Only a genuine upstream/Stellantis metric timestamp can contradict and
    # replace an already-known server trip boundary. HA receipt/update time is
    # useful fallback evidence but is not measurement-time proof.
    if observation.get("timestamp_source") != "stellantis":
        return "sv_local_trip_boundary_fallback"

    boundary_time = (
        reference_time
        if reference_time is not None
        else local.get("start_time" if edge == "start" else "end_time")
    )
    age = _delta_seconds(observation.get("source_time"), boundary_time)
    if age is None:
        return "sv_local_trip_boundary_fallback"
    if age <= _EXACT_BOUNDARY_TOLERANCE_SECONDS:
        return "sv_local_trip_boundary"
    return "sv_local_trip_boundary_fallback"


def _valid_local_trip(local: dict[str, Any]) -> bool:
    usable, _flags = local_trip_backfill_quality(local)
    return usable


def _match_score(server: dict[str, Any], local: dict[str, Any]) -> float | None:
    if not _valid_local_trip(local):
        return None
    server_start, server_end = _time(server.get("start_time")), _time(server.get("end_time"))
    local_start, local_end = _time(local.get("start_time")), _time(local.get("end_time"))
    if not all((server_start, server_end, local_start, local_end)):
        return None
    start_delta = _delta_seconds(server_start, local_start)
    end_delta = _delta_seconds(server_end, local_end)
    if (
        start_delta is None
        or end_delta is None
        or start_delta > _MATCH_TIME_TOLERANCE_SECONDS
        or end_delta > _MATCH_TIME_TOLERANCE_SECONDS
    ):
        return None

    server_start_mileage = _number(server.get("start_mileage"))
    local_start_mileage = _number(local.get("start_mileage"))
    server_distance = _number(server.get("distance_km"))
    local_distance = _number(local.get("distance_km"))
    if None in (server_start_mileage, local_start_mileage, server_distance, local_distance):
        return None
    distance_tolerance = max(0.5, abs(server_distance) * _MATCH_DISTANCE_RELATIVE_TOLERANCE)
    if abs(server_start_mileage - local_start_mileage) > _MATCH_START_MILEAGE_TOLERANCE_KM:
        return None
    if abs(server_distance - local_distance) > distance_tolerance:
        return None

    server_end_mileage = _number(server.get("end_mileage"))
    local_end_mileage = _number(local.get("end_mileage"))
    if server_end_mileage is not None and local_end_mileage is not None:
        if abs(server_end_mileage - local_end_mileage) > _MATCH_END_MILEAGE_TOLERANCE_KM:
            return None

    server_duration = _number(server.get("duration_seconds"))
    local_duration = _number(local.get("duration_seconds"))
    if server_duration is None:
        server_duration = (server_end - server_start).total_seconds()
    if local_duration is None:
        local_duration = (local_end - local_start).total_seconds()
    duration_tolerance = max(_MATCH_DURATION_TOLERANCE_SECONDS, server_duration * 0.2)
    if abs(server_duration - local_duration) > duration_tolerance:
        return None

    return start_delta + end_delta + abs(server_start_mileage - local_start_mileage) * 60


def _matched_local_trips(
    server_trips: list[dict[str, Any]], local_trips: list[dict[str, Any]] | None
) -> dict[int, dict[str, Any]]:
    locals_ = [row for row in (local_trips or []) if isinstance(row, dict)]
    candidates: list[tuple[float, int, int, dict[str, Any]]] = []
    for server_index, server in enumerate(server_trips):
        for local_index, local in enumerate(locals_):
            score = _match_score(server, local)
            if score is not None:
                candidates.append((score, server_index, local_index, local))
    result: dict[int, dict[str, Any]] = {}
    used_server: set[int] = set()
    used_local: set[int] = set()
    for score, server_index, local_index, local in sorted(candidates, key=lambda item: item[0]):
        if server_index in used_server or local_index in used_local:
            continue
        # Equal-quality competing candidates are ambiguous; do not attach
        # telemetry from either local row to the server trip.
        alternatives = [
            item[0]
            for item in candidates
            if item[1] == server_index and item[2] != local_index
        ]
        if alternatives and abs(min(alternatives) - score) < 30:
            continue
        result[server_index] = local
        used_server.add(server_index)
        used_local.add(local_index)
    return result


def _field_source(trip: dict[str, Any], key: str, fallback: str) -> str:
    sources = trip.setdefault("field_sources", {})
    source = sources.get(key)
    if isinstance(source, str) and source:
        return source
    sources[key] = fallback
    return fallback


def _resolve_pair(
    trip: dict[str, Any], local: dict[str, Any], first: str, second: str, tolerance: float
) -> None:
    first_spec, second_spec = _FIELD_BOUNDARIES[first], _FIELD_BOUNDARIES[second]
    server_start_time = trip.get("start_time")
    server_end_time = trip.get("end_time")
    first_local = _local_value(
        local, first, "start", reference_time=server_start_time
    )
    second_local = _local_value(
        local, second, "end", reference_time=server_end_time
    )
    first_local_source = _local_boundary_source(
        local, first_spec[0], "start", reference_time=server_start_time
    )
    second_local_source = _local_boundary_source(
        local, second_spec[0], "end", reference_time=server_end_time
    )
    server_first, server_second = _number(trip.get(first)), _number(trip.get(second))
    first_conflict = (
        server_first is not None and first_local is not None
        and abs(server_first - first_local) > tolerance
    )
    second_conflict = (
        server_second is not None and second_local is not None
        and abs(server_second - second_local) > tolerance
    )
    server_delta = server_second - server_first if server_first is not None and server_second is not None else None
    local_delta = second_local - first_local if first_local is not None and second_local is not None else None
    local_change_proven = bool(
        local_delta is not None
        and abs(local_delta) > tolerance
        and first_local_source == "sv_local_trip_boundary"
        and second_local_source == "sv_local_trip_boundary"
    )
    duplicated_or_opposed = bool(
        local_change_proven
        and server_delta is not None
        and (
            (local_delta < -tolerance and server_delta >= -tolerance)
            or (server_delta > tolerance * 3 and local_delta <= tolerance)
            or (server_delta < -tolerance and local_delta > tolerance)
        )
    )

    conflicts = trip.setdefault("field_conflicts", {})
    for field, spec, server_value, local_value, has_conflict in (
        (first, first_spec, server_first, first_local, first_conflict),
        (second, second_spec, server_second, second_local, second_conflict),
    ):
        _evidence_field, _legacy_key, server_source, _field_tolerance = spec
        if server_value is None and local_value is not None:
            trip[field] = local_value
            trip["field_sources"][field] = (
                first_local_source if field == first else second_local_source
            ) or "unknown"
        elif has_conflict:
            if duplicated_or_opposed:
                trip[field] = local_value
                trip["field_sources"][field] = "sv_local_trip_boundary"
                resolution = "matched_local_boundary"
            else:
                resolution = "ambiguous_server_retained"
                if server_source:
                    _field_source(trip, field, server_source)
            conflicts[field] = {
                "server": server_value,
                "local": local_value,
                "resolution": resolution,
            }
        elif server_value is not None:
            _field_source(trip, field, server_source)
        elif local_value is None:
            _field_source(trip, field, "unknown")


def resolve_trip_fields(trip: dict[str, Any], local: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return a per-field canonical copy with explicit source/conflict metadata."""
    resolved = dict(trip)
    resolved["field_sources"] = dict(trip.get("field_sources") or {})
    resolved["field_conflicts"] = {}
    resolved["raw_server"] = trip.get("raw_server")
    for first, second, tolerance in _FIELD_PAIRS:
        if local is not None:
            _resolve_pair(resolved, local, first, second, tolerance)
        else:
            for field in (first, second):
                _field_source(resolved, field, "unknown")

    if local is not None:
        fuel_start = _fresh_observation(
            local,
            "fuel_consumption_total",
            "start",
            reference_time=resolved.get("start_time"),
        )
        fuel_end = _fresh_observation(
            local,
            "fuel_consumption_total",
            "end",
            reference_time=resolved.get("end_time"),
        )
        local_fuel_delta = None
        if (
            fuel_start
            and fuel_end
            and _local_boundary_source(
                local,
                "fuel_consumption_total",
                "start",
                reference_time=resolved.get("start_time"),
            ) == "sv_local_trip_boundary"
            and _local_boundary_source(
                local,
                "fuel_consumption_total",
                "end",
                reference_time=resolved.get("end_time"),
            ) == "sv_local_trip_boundary"
        ):
            start_value = _number(fuel_start.get("value"))
            end_value = _number(fuel_end.get("value"))
            distance = _number(resolved.get("distance_km"))
            if (
                start_value is not None
                and end_value is not None
                and end_value >= start_value
                and distance is not None
                and distance > 0
                and end_value - start_value <= distance * 0.5
            ):
                local_fuel_delta = round(end_value - start_value, 3)
        if _number(resolved.get("fuel_consumption_l")) is None and local_fuel_delta is not None:
            resolved["fuel_consumption_l"] = local_fuel_delta
            resolved["field_sources"]["fuel_consumption_l"] = "sv_local_trip_fuel_total_delta"
        else:
            _field_source(resolved, "fuel_consumption_l", "unknown")

    if _number(resolved.get("fuel_consumption_l_100km")) is None:
        fuel_l = _number(resolved.get("fuel_consumption_l"))
        distance = _number(resolved.get("distance_km"))
        if fuel_l is not None and distance is not None and distance > 0:
            resolved["fuel_consumption_l_100km"] = round(fuel_l / distance * 100, 2)
            if resolved["field_sources"].get("fuel_consumption_l") == "stellantis_trip.energyConsumptions.Fuel.consumption":
                resolved["field_sources"]["fuel_consumption_l_100km"] = "derived_from_server_fuel_and_distance"
            else:
                resolved["field_sources"]["fuel_consumption_l_100km"] = "derived_from_resolved_fuel_and_distance"
        else:
            _field_source(resolved, "fuel_consumption_l_100km", "unknown")

    raw = resolved.get("raw_server") if isinstance(resolved.get("raw_server"), dict) else {}
    electric_entries = raw.get("energyConsumptions")
    direct_electric = None
    if isinstance(electric_entries, list):
        for item in electric_entries:
            if isinstance(item, dict) and item.get("type") == "Electric":
                raw_consumption = _number(item.get("consumption"))
                if raw_consumption is not None and raw_consumption >= 0:
                    direct_electric = round(raw_consumption / 1000, 3)
                break
    if direct_electric is not None:
        resolved["energy_kwh"] = direct_electric
        resolved["energy_estimated"] = False
        resolved["energy_source"] = "stellantis_trip.energy_consumptions"
        resolved["field_sources"]["energy_kwh"] = "stellantis_trip.energyConsumptions.Electric.consumption"
    else:
        energy = None
        energy_source = "unknown"
        if local is not None:
            residual_start = _fresh_observation(
                local,
                "residual_energy_kwh",
                "start",
                reference_time=resolved.get("start_time"),
            )
            residual_end = _fresh_observation(
                local,
                "residual_energy_kwh",
                "end",
                reference_time=resolved.get("end_time"),
            )
            if (
                residual_start
                and residual_end
                and _local_boundary_source(
                    local,
                    "residual_energy_kwh",
                    "start",
                    reference_time=resolved.get("start_time"),
                ) == "sv_local_trip_boundary"
                and _local_boundary_source(
                    local,
                    "residual_energy_kwh",
                    "end",
                    reference_time=resolved.get("end_time"),
                ) == "sv_local_trip_boundary"
            ):
                start_value = _number(residual_start.get("value"))
                end_value = _number(residual_end.get("value"))
                if start_value is not None and end_value is not None and start_value > end_value:
                    energy = round(start_value - end_value, 3)
                    energy_source = "sv_local_trip_residual_energy_delta"
        start_soc, end_soc = _number(resolved.get("soc_start")), _number(resolved.get("soc_end"))
        capacity = _number(resolved.get("capacity_kwh"))
        if capacity is None and local is not None:
            capacity = _number(local.get("capacity_kwh"))
        if energy is None and (
            energy_source == "unknown"
            and start_soc is not None
            and end_soc is not None
            and _local_boundary_source(
                local, "soc", "start", reference_time=resolved.get("start_time")
            ) == "sv_local_trip_boundary"
            and _local_boundary_source(
                local, "soc", "end", reference_time=resolved.get("end_time")
            ) == "sv_local_trip_boundary"
            and start_soc > end_soc
            and capacity is not None
            and capacity > 0
            and (_number(resolved.get("distance_km")) or 0) > 1.0
        ):
            energy = round((start_soc - end_soc) * capacity / 100, 3)
            energy_source = "resolved_trip_soc_capacity_estimate"
        resolved["energy_kwh"] = energy
        resolved["energy_estimated"] = energy is not None
        resolved["energy_source"] = energy_source
        resolved["field_sources"]["energy_kwh"] = energy_source

    distance = _number(resolved.get("distance_km"))
    energy = _number(resolved.get("energy_kwh"))
    consumption = round(energy / distance * 100, 2) if energy is not None and distance and distance > 0 else None
    resolved["consumption_kwh_100km"] = consumption
    resolved["energy_per_100_km"] = consumption
    resolved["consumption_estimated"] = bool(resolved.get("energy_estimated"))
    fuel_l = _number(resolved.get("fuel_consumption_l"))
    fuel_start, fuel_end = _number(resolved.get("fuel_level_start")), _number(resolved.get("fuel_level_end"))
    electric_used = bool((energy is not None and energy > 0) or (start_soc is not None and end_soc is not None and end_soc < start_soc))
    fuel_used = bool((fuel_l is not None and fuel_l > 0) or (fuel_start is not None and fuel_end is not None and fuel_end < fuel_start))
    resolved["trip_type"] = "hybrid" if electric_used and fuel_used else "ice" if fuel_used else "ev" if electric_used else "unknown"
    return resolved


def resolve_canonical_trip_fields(
    server_trips: list[dict[str, Any]], local_trips: list[dict[str, Any]] | None
) -> list[dict[str, Any]]:
    """Resolve each server row from at most one strongly matched local trip."""
    matches = _matched_local_trips(server_trips, local_trips)
    resolved_rows = []
    for index, trip in enumerate(server_trips):
        local = matches.get(index)
        resolved = resolve_trip_fields(trip, local)
        if local is None:
            resolved["local_evidence_match"] = {"matched": False, "reason": "no_strong_match"}
        else:
            resolved["local_evidence_match"] = {
                "matched": True,
                "method": "time_mileage_distance_duration",
                "start_delta_seconds": round(_delta_seconds(trip.get("start_time"), local.get("start_time")) or 0, 1),
                "end_delta_seconds": round(_delta_seconds(trip.get("end_time"), local.get("end_time")) or 0, 1),
            }
            if any(
                isinstance(source, str) and source.startswith("sv_local_trip")
                for source in resolved.get("field_sources", {}).values()
            ):
                resolved["sources"] = list(dict.fromkeys([
                    *(resolved.get("sources") or [resolved.get("source")]),
                    "sv_local_trip",
                ]))
        resolved_rows.append(resolved)
    return resolved_rows
