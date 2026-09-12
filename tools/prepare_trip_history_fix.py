from pathlib import Path

trip_path = Path('custom_components/sv_dashboard/static/trip-history-card.js')
trip = trip_path.read_text()
trip = trip.replace(
    '''        const hasTripType = trips.some((trip) => trip.attributes?.trip_type && trip.attributes.trip_type !== "unknown");
        const columnCount = hybridLayout ? 6 : 4 + (hasEnergy ? 2 : 0) + (hasFuel ? 1 : 0) + (hasTripType ? 1 : 0) + (hasMaxSpeed ? 1 : 0);''',
    '''        const showTripType = hybridLayout;
        const columnCount = hybridLayout ? 7 : 4 + (hasEnergy ? 2 : 0) + (hasFuel ? 1 : 0) + (hasMaxSpeed ? 1 : 0);''',
)
trip = trip.replace(
    '''                                ${hybridLayout ? html`<th>${text.consumption}</th><th>l/100 km</th>` : html`${hasEnergy ? html`<th>${text.energy}</th><th>${text.consumption}</th>` : nothing}${hasFuel ? html`<th>l/100 km</th>` : nothing}${hasTripType ? html`<th>${dashboardText.powertrain}</th>` : nothing}${hasMaxSpeed ? html`<th>${text.maximum}</th>` : nothing}`}''',
    '''                                ${hybridLayout ? html`<th>${text.consumption}</th><th>l/100 km</th><th>${dashboardText.powertrain}</th>` : html`${hasEnergy ? html`<th>${text.energy}</th><th>${text.consumption}</th>` : nothing}${hasFuel ? html`<th>l/100 km</th>` : nothing}${hasMaxSpeed ? html`<th>${text.maximum}</th>` : nothing}`}''',
)
trip = trip.replace(
    '''                                ${hybridLayout ? html`
                                    <td>${invalid ? "—" : this._value(trip.attributes?.energy_per_100_km)}</td>
                                    <td>${invalid ? "—" : this._value(trip.attributes?.fuel_consumption_l_100km)}</td>
                                ` : html`
                                    ${hasEnergy ? html`<td>${this._value(trip.attributes?.energy_kwh)}</td><td>${invalid ? "—" : this._value(trip.attributes?.energy_per_100_km)}</td>` : nothing}
                                    ${hasFuel ? html`<td>${invalid ? "—" : this._value(trip.attributes?.fuel_consumption_l_100km)}</td>` : nothing}
                                    ${hasTripType ? html`<td><span class="trip-type">${({ ev: "EV", hybrid: "Hybrid", ice: "ICE" })[trip.attributes?.trip_type] || "—"}</span></td>` : nothing}
                                    ${hasMaxSpeed ? html`<td>${invalid ? "—" : this._value(trip.attributes?.max_speed)}</td>` : nothing}
                                `}''',
    '''                                ${hybridLayout ? html`
                                    <td>${invalid ? "—" : this._value(trip.attributes?.energy_per_100_km)}</td>
                                    <td>${invalid ? "—" : this._value(trip.attributes?.fuel_consumption_l_100km)}</td>
                                    <td><span class="trip-type">${({ ev: "EV", hybrid: "Hybrid", ice: "ICE" })[trip.attributes?.trip_type] || "—"}</span></td>
                                ` : html`
                                    ${hasEnergy ? html`<td>${this._value(trip.attributes?.energy_kwh)}</td><td>${invalid ? "—" : this._value(trip.attributes?.energy_per_100_km)}</td>` : nothing}
                                    ${hasFuel ? html`<td>${invalid ? "—" : this._value(trip.attributes?.fuel_consumption_l_100km)}</td>` : nothing}
                                    ${hasMaxSpeed ? html`<td>${invalid ? "—" : this._value(trip.attributes?.max_speed)}</td>` : nothing}
                                `}''',
)
trip = trip.replace(
    '${hasTripType ? html`<span><strong>${dashboardText.powertrain}:</strong>',
    '${showTripType ? html`<span><strong>${dashboardText.powertrain}:</strong>',
)
assert 'hasTripType' not in trip
assert 'const showTripType = hybridLayout;' in trip
trip_path.write_text(trip)

history_path = Path('custom_components/sv_dashboard/server_history.py')
history = history_path.read_text()
marker = '\n\nclass ServerHistoryManager:'
assert marker in history
helper = '''\n\ndef enrich_trips_with_local_energy(\n    server_trips: list[dict[str, Any]],\n    local_trips: list[dict[str, Any]] | None = None,\n) -> list[dict[str, Any]]:\n    \"\"\"Fill only missing electric trip energy from a matched local observation.\n\n    The server trip remains canonical for timing, distance and fuel telemetry.\n    Local SV tracking is used only when the server row has no electric energy,\n    a positive locally derived energy value exists, and odometer/distance match\n    the same physical trip. Existing server electric telemetry is never\n    overwritten, and zero/unknown local energy is never promoted into history.\n    \"\"\"\n    local_rows = [row for row in (local_trips or []) if isinstance(row, dict)]\n    for trip in server_trips:\n        if _number(trip.get(\"energy_kwh\")) is not None:\n            continue\n        start_mileage = _number(trip.get(\"start_mileage\"))\n        distance = _number(trip.get(\"distance_km\"))\n        if start_mileage is None or distance is None or distance <= 0:\n            continue\n\n        candidates: list[tuple[float, dict[str, Any]]] = []\n        trip_start = _parse_time(trip.get(\"start_time\"))\n        for local in local_rows:\n            local_energy = _number(local.get(\"energy_kwh\"))\n            local_start_mileage = _number(local.get(\"start_mileage\"))\n            local_distance = _number(local.get(\"distance_km\"))\n            if (\n                local_energy is None\n                or local_energy <= 0\n                or local_start_mileage is None\n                or local_distance is None\n            ):\n                continue\n            mileage_delta = abs(local_start_mileage - start_mileage)\n            distance_delta = abs(local_distance - distance)\n            if mileage_delta > 0.25 or distance_delta > 2.0:\n                continue\n            local_start = _parse_time(local.get(\"start_time\"))\n            time_delta = None\n            if trip_start is not None and local_start is not None:\n                time_delta = abs((trip_start - local_start).total_seconds())\n                if time_delta > 20 * 60:\n                    continue\n            score = mileage_delta * 1000 + distance_delta * 100 + ((time_delta or 0) / 60)\n            candidates.append((score, local))\n\n        if not candidates:\n            continue\n        local = min(candidates, key=lambda item: item[0])[1]\n        local_energy = _number(local.get(\"energy_kwh\"))\n        if local_energy is None or local_energy <= 0:\n            continue\n\n        trip[\"energy_kwh\"] = round(local_energy, 3)\n        trip[\"energy_per_100_km\"] = round(local_energy / distance * 100, 2)\n        trip[\"consumption_kwh_100km\"] = trip[\"energy_per_100_km\"]\n        trip[\"energy_estimated\"] = True\n        trip[\"consumption_estimated\"] = True\n        trip[\"energy_source\"] = \"sv_local_trip_soc_delta\"\n        for key in (\"soc_start\", \"soc_end\", \"capacity_kwh\"):\n            if trip.get(key) is None and local.get(key) is not None:\n                trip[key] = local.get(key)\n        fuel_used = (_number(trip.get(\"fuel_consumption_l\")) or 0) > 0\n        trip[\"trip_type\"] = \"hybrid\" if fuel_used else \"ev\"\n        trip[\"sources\"] = list(dict.fromkeys([\n            *(trip.get(\"sources\") or [trip.get(\"source\")]),\n            \"sv_local_trip\",\n        ]))\n    return server_trips\n'''
history = history.replace(marker, helper + marker)
old = '''        trips = repair_trip_odometer_continuity(trips, local_trips)
        by_id = {trip["id"]: trip for trip in trips if trip.get("id")}'''
new = '''        trips = repair_trip_odometer_continuity(trips, local_trips)
        trips = enrich_trips_with_local_energy(trips, local_trips)
        by_id = {trip["id"]: trip for trip in trips if trip.get("id")}'''
assert old in history
history = history.replace(old, new)
history_path.write_text(history)

hybrid_path = Path('tests/hybrid-fuel-ui.test.mjs')
hybrid = hybrid_path.read_text()
hybrid = hybrid.replace('assert.match(trip, /const columnCount = hybridLayout \\? 6/);', 'assert.match(trip, /const columnCount = hybridLayout \\? 7/);')
hybrid = hybrid.replace('assert.match(trip, /hybridLayout \\? html`<th>\\$\\{text\\.consumption\\}<\\/th><th>l\\/100 km<\\/th>`/);', 'assert.match(trip, /hybridLayout \\? html`<th>\\$\\{text\\.consumption\\}<\\/th><th>l\\/100 km<\\/th><th>\\$\\{dashboardText\\.powertrain\\}<\\/th>`/);')
hybrid_path.write_text(hybrid)

Path('tests/trip-history-regression.test.mjs').write_text(r'''import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const trip = read("../custom_components/sv_dashboard/static/trip-history-card.js");
const history = read("../custom_components/sv_dashboard/server_history.py");

test("single-energy trip history omits redundant powertrain column", () => {
  assert.match(trip, /const showTripType = hybridLayout/);
  assert.match(trip, /const columnCount = hybridLayout \? 7 : 4 \+ \(hasEnergy \? 2 : 0\) \+ \(hasFuel \? 1 : 0\) \+ \(hasMaxSpeed \? 1 : 0\)/);
  assert.doesNotMatch(trip, /hasTripType/);
});

test("dual-energy trip history keeps per-trip powertrain classification", () => {
  assert.match(trip, /hybridLayout \? html`<th>\$\{text\.consumption\}<\/th><th>l\/100 km<\/th><th>\$\{dashboardText\.powertrain\}<\/th>`/);
  assert.match(trip, /ev: "EV", hybrid: "Hybrid", ice: "ICE"/);
});

test("canonical server trips recover only missing positive local electric energy", () => {
  assert.match(history, /def enrich_trips_with_local_energy\(/);
  assert.match(history, /if _number\(trip\.get\("energy_kwh"\)\) is not None:/);
  assert.match(history, /local_energy <= 0/);
  assert.match(history, /mileage_delta > 0\.25/);
  assert.match(history, /distance_delta > 2\.0/);
  assert.match(history, /"energy_source"\] = "sv_local_trip_soc_delta"/);
  assert.match(history, /trips = enrich_trips_with_local_energy\(trips, local_trips\)/);
});
''')
