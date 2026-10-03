import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../custom_components/sv_dashboard/static/charge-history-core.js", import.meta.url), "utf8");
const {
    buildChargeSessions,
    buildLocalChargeSessions,
    findChargeSession,
    mergeChargeSessions,
    validateChargingSocTimeline,
} = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const state = (value, timestamp, attributes = undefined) => ({
    state: String(value),
    last_changed: timestamp,
    ...(attributes ? { attributes } : {}),
});

const rawSessions = buildChargeSessions({
    chargingStates: [
        state("on", "2026-08-14T08:00:00Z"),
        state("off", "2026-08-14T09:00:00Z"),
        state("on", "2026-08-14T12:00:00Z"),
        state("off", "2026-08-14T13:00:00Z"),
    ],
    socStates: [
        state(20, "2026-08-14T08:00:00Z"),
        state(40, "2026-08-14T09:00:00Z"),
        state(50, "2026-08-14T12:00:00Z"),
        state(80, "2026-08-14T13:00:00Z"),
    ],
    modeStates: [state("AC", "2026-08-14T07:59:00Z")],
});

const localOnly = buildLocalChargeSessions([
    state("unknown", "2026-08-14T14:00:00Z", {
        start_time: "2026-08-14T10:00:00Z",
        end_time: "2026-08-14T11:30:00Z",
        duration_seconds: 5400,
        soc_start: 35,
        soc_end: 65,
        capacity_kwh: 43.4,
        energy_kwh: 13.02,
        average_power_kw: 8.68,
        charge_type: "AC",
    }),
]);

assert.equal(localOnly.length, 1, "historical local result must be usable while current state is unknown");
assert.match(localOnly[0].id, /^charge-2026-08-14T10:00:00\.000Z$/);

const matchingLocal = buildLocalChargeSessions([
    state("unknown", "2026-08-14T14:00:00Z", {
        start_time: "2026-08-14T08:02:00Z",
        end_time: "2026-08-14T09:00:00Z",
        duration_seconds: 3480,
        soc_start: 20,
        soc_end: 40,
        capacity_kwh: 43.4,
        energy_kwh: 8.68,
        average_power_kw: 8.97,
        charge_type: "AC",
    }),
]);

const merged = mergeChargeSessions(rawSessions, matchingLocal);
assert.equal(merged.length, 2, "matching local and recorder sessions must be deduplicated");
const matched = merged.find((session) => session.id === matchingLocal[0].id);
assert.equal(matched?.id, matchingLocal[0].id, "local replacement must keep one stable session ID");
assert.equal(findChargeSession(merged, matchingLocal[0].id)?.id, matchingLocal[0].id);
assert.equal(findChargeSession(merged, matchingLocal[0].start)?.id, matchingLocal[0].id, "old timestamp selections remain compatible");

const localMerged = mergeChargeSessions([], localOnly);
assert.equal(localMerged.length, 1, "a recorder-only local result must be selectable");
assert.equal(findChargeSession(localMerged, localOnly[0].id)?.id, localOnly[0].id);

assert.equal(matched?.start, "2026-08-14T08:02:00Z");
assert.equal(mergeChargeSessions(rawSessions, []).at(0).start, "2026-08-14T12:00:00.000Z", "without a selection the newest session is first");
assert.equal(findChargeSession(merged, "charge-does-not-exist"), null, "unknown selections must not silently resolve to another session");

const anomalousSoc = [
    state(67, "2026-09-10T07:59:00Z"),
    state(0, "2026-09-10T08:01:00Z"),
    state(68, "2026-09-10T08:05:00Z"),
    state(80, "2026-09-10T08:30:00Z"),
    state(99, "2026-09-10T09:00:00Z"),
];
const validated = validateChargingSocTimeline(
    anomalousSoc,
    Date.parse("2026-09-10T08:00:00Z"),
    Date.parse("2026-09-10T09:00:00Z"),
);
assert.deepEqual(validated.states.map((item) => Number(item.state)), [67, 68, 80, 99]);
assert.equal(validated.rejected.length, 1);
assert.deepEqual(validated.quality_flags, ["soc_outlier_rejected"]);

const anomalySession = buildChargeSessions({
    chargingStates: [
        state("off", "2026-09-10T07:59:00Z"),
        state("on", "2026-09-10T08:00:00Z"),
        state("off", "2026-09-10T09:00:00Z"),
    ],
    socStates: anomalousSoc,
    fallbackCapacity: 42.2,
});
assert.equal(anomalySession.length, 1);
assert.equal(anomalySession[0].soc_start, 67, "transient 0 % must not replace the real charging baseline");
assert.equal(anomalySession[0].soc_end, 99);
assert.equal(anomalySession[0].rejected_soc_samples, 1);
assert.deepEqual(anomalySession[0].quality_flags, ["soc_outlier_rejected"]);
assert.ok(Math.abs(anomalySession[0].energy_kwh - 13.504) < 0.001, "energy must use the validated 67 -> 99 % delta");


const richRecorder = [{
    id: "charge-2026-10-02T14:59:00.000Z",
    start: "2026-10-02T14:59:00Z",
    end: "2026-10-02T17:02:00Z",
    duration_seconds: 7380,
    soc_start: 62,
    soc_end: 70,
    capacity_kwh: 42,
    energy_kwh: 3.36,
    average_power_kw: 1.64,
    maximum_power_kw: null,
    charge_type: "AC",
}];
const sparseLocal = buildLocalChargeSessions([
    state("unknown", "2026-10-02T17:03:00Z", {
        start_time: "2026-10-02T14:59:00Z",
        end_time: "2026-10-02T17:02:00Z",
        duration_seconds: 7380,
        soc_start: null,
        soc_end: 70,
        capacity_kwh: 42,
        energy_kwh: null,
        average_power_kw: null,
        maximum_power_kw: null,
        charge_type: "Unknown",
    }),
]);
const enriched = mergeChargeSessions(richRecorder, sparseLocal);
assert.equal(enriched.length, 1, "sparse local and rich recorder evidence must remain one session");
assert.equal(enriched[0].soc_start, 62, "known recorder start SOC must enrich missing local summary");
assert.equal(enriched[0].energy_kwh, 3.36, "known recorder energy must survive sparse local merge");
assert.equal(enriched[0].average_power_kw, 1.64);
assert.equal(enriched[0].charge_type, "AC");

const dsIntermediate = [{
    id: "charge-2026-10-02T19:54:00.000Z",
    start: "2026-10-02T19:54:00Z",
    end: "2026-10-03T01:35:00Z",
    duration_seconds: 20460,
    soc_start: 24,
    soc_end: 96,
    capacity_kwh: 14.6,
    energy_kwh: 10.51,
    average_power_kw: 1.85,
    maximum_power_kw: 1.5,
    maximum_power_kw_estimated: true,
    charge_type: "AC",
}];
const dsFinished = buildLocalChargeSessions([
    state("unknown", "2026-10-03T01:37:00Z", {
        start_time: "2026-10-02T19:54:00Z",
        end_time: "2026-10-03T01:36:00Z",
        duration_seconds: 20520,
        soc_start: 24,
        soc_end: 99,
        capacity_kwh: 14.6,
        energy_kwh: 10.95,
        average_power_kw: 1.92,
        maximum_power_kw: 1.5,
        maximum_power_kw_estimated: true,
        charge_type: "slow",
    }),
]);
const dsMerged = mergeChargeSessions(dsIntermediate, dsFinished);
assert.equal(dsMerged.length, 1, "24→96 and later 24→99 evidence must identify one physical charge");
assert.equal(dsMerged[0].soc_end, 99, "later preferred completed boundary must remain authoritative");
assert.equal(dsMerged[0].energy_kwh, 10.95);
assert.equal(dsMerged[0].charge_type, "AC");
assert.equal(dsMerged[0].maximum_power_kw, null, "estimated maximum below average must be suppressed");
assert.ok(dsMerged[0].quality_flags.includes("estimated_max_below_average_suppressed"));

const dsLaterRaw = [{
    id: "charge-2026-10-02T19:54:00.000Z",
    start: "2026-10-02T19:54:00Z",
    end: "2026-10-03T01:36:00Z",
    duration_seconds: 20520,
    soc_start: 24,
    soc_end: 99,
    capacity_kwh: 14.6,
    energy_kwh: 10.95,
    average_power_kw: 1.92,
    maximum_power_kw: null,
    charge_type: "AC",
}];
const dsEarlyLocal = buildLocalChargeSessions([
    state("unknown", "2026-10-03T01:35:30Z", {
        start_time: "2026-10-02T19:54:00Z",
        end_time: "2026-10-03T01:35:00Z",
        duration_seconds: 20460,
        soc_start: 24,
        soc_end: 96,
        capacity_kwh: 14.6,
        energy_kwh: 10.51,
        average_power_kw: 1.85,
        charge_type: "AC",
    }),
]);
const dsLaterWins = mergeChargeSessions(dsLaterRaw, dsEarlyLocal);
assert.equal(dsLaterWins.length, 1);
assert.equal(dsLaterWins[0].soc_end, 99, "later completed boundary must enrich an earlier local summary");
assert.equal(dsLaterWins[0].energy_kwh, 10.95);
assert.equal(dsLaterWins[0].average_power_kw, 1.92);

const distinctLocal = buildLocalChargeSessions([
    state("unknown", "2026-10-03T09:30:00Z", {
        start_time: "2026-10-03T08:01:00Z",
        end_time: "2026-10-03T09:20:00Z",
        duration_seconds: 4740,
        soc_start: 40,
        soc_end: 60,
        energy_kwh: 5,
        average_power_kw: 3.8,
        charge_type: "AC",
    }),
]);
const nearbyButDistinct = [{
    id: "charge-2026-10-03T08:00:00.000Z",
    start: "2026-10-03T08:00:00Z",
    end: "2026-10-03T09:00:00Z",
    duration_seconds: 3600,
    soc_start: 20,
    soc_end: 40,
    energy_kwh: 5,
    average_power_kw: 5,
    charge_type: "AC",
}];
assert.equal(
    mergeChargeSessions(nearbyButDistinct, distinctLocal).length,
    2,
    "nearby starts with materially different end boundaries must remain separate sessions",
);

console.log("charge-history-core tests passed");
