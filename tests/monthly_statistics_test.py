"""Standalone regression coverage for the monthly statistics contract."""
from datetime import datetime, timezone
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("monthly_statistics", Path(__file__).parents[1] / "custom_components/sv_dashboard/monthly_statistics.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def trip(key, start, end, distance, energy, estimated=False, valid=True):
    return {"id": key, "start_time": start, "end_time": end, "distance_km": distance,
            "energy_kwh": energy, "energy_estimated": estimated, "valid_for_statistics": valid}


def at(value):
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)


a = trip("a", "2026-10-31T23:30:00Z", "2026-10-31T23:50:00Z", 10, 2, True)
b = trip("b", "2026-11-01T10:00:00Z", "2026-11-01T10:10:00Z", 30, 3)
zero = trip("zero", "2026-11-01T11:00:00Z", "2026-11-01T11:10:00Z", 10, 0)
bad = trip("bad", "2026-11-01T12:00:00Z", "2026-11-01T12:10:00Z", 50, 20, valid=False)
samples = [(at("2026-10-31T23:25:00"), 0), (at("2026-10-31T23:40:00"), 10),
           (at("2026-11-01T09:00:00"), 30), (at("2026-11-01T10:00:00"), 20),
           (at("2026-11-01T10:05:00"), None)]
archive = m.observe_trip_temperatures([a,b,zero,bad], samples)
row, = m.monthly_consumption([a,b,zero,bad,a], archive, "Europe/Berlin")
assert row["month"] == "2026-11"
assert row["consumption_kwh_100km"] == 12.5
assert row["energy_coverage"] == .8
assert row["estimated_energy_share"] == .4
assert row["trip_count"] == 3 and row["energy_trip_count"] == 2
assert row["temperature_coverage"] == round(25/30,4)
assert row["ambient_temperature_c"] == 8
assert m.observe_trip_temperatures([a,b], [], archive) == archive
assert m.monthly_consumption([a], {}, "Europe/Berlin")[0]["ambient_temperature_c"] is None
assert m.monthly_consumption([a], {}, "UTC")[0]["month"] == "2026-10"
assert m.monthly_consumption([zero], {}, "Europe/Berlin")[0]["consumption_kwh_100km"] is None
assert m.celsius(32, "°F") == 0 and m.celsius(-5, "°C") == -5
assert m.celsius("unavailable", "°C") is None and m.celsius(20, None) is None
changed = {**a, "end_time": "2026-10-31T23:51:00Z"}
assert m.monthly_consumption([changed], archive, "Europe/Berlin")[0]["ambient_temperature_c"] is None
stale = m.observe_trip_temperatures([b], [(at("2026-11-01T09:00:00"), 25)])
assert stale == {}
print("Monthly statistics tests passed")


from datetime import timedelta
assert m.range_calibration([zero, bad], {})["mode"] == "unavailable"
fallback = m.range_calibration([a,b], archive)
assert fallback["mode"] == "scenario" and fallback["reference_rate"] == 12.5
assert fallback["reference_temperature_c"] is None
trips, thermal = [], {}
for idx in range(80):
    start = at("2026-09-01T00:00:00") + timedelta(days=idx)
    distance = [10, 40, 16, 60][idx % 4]
    temp = [0, 4, 16, 20, 5, 15, -3, 12][(idx // 4) % 8]
    seconds = distance * 60
    end = start + timedelta(seconds=seconds)
    energy = distance * (13 + .3 * m._cold(temp)) / 100 + 1.25 * m._startup(temp, seconds)
    row = trip(str(idx), start.isoformat(), end.isoformat(), distance, energy)
    trips.append(row)
    thermal[m.interval_key((start,end))] = {"seconds": seconds, "degree_seconds": temp*seconds}
fit = m.range_calibration(trips, thermal)
assert fit["mode"] == "fitted", fit
assert abs(fit["base_rate"] - 13) < .6 and abs(fit["cold_slope"] - .3) < .11
assert abs(fit["startup_kwh"] - 1.25) <= .5
assert fit["holdout_error_rate"] < fit["holdout_baseline_error_rate"]
assert m.range_calibration(trips, {})["mode"] == "scenario"
print("Range calibration tests passed")
