export function normalizeHistoryState(raw) {
    const lastUpdated = raw?.last_updated ?? raw?.last_changed ?? raw?.lu;
    let timestamp;
    if (typeof lastUpdated === "number") {
        timestamp = lastUpdated * 1000;
    } else {
        timestamp = Date.parse(lastUpdated);
    }

    return {
        state: String(raw?.state ?? raw?.s ?? "").trim(),
        timestamp,
    };
}

function normalizedStates(states) {
    return (states ?? [])
        .map(normalizeHistoryState)
        .filter((item) => Number.isFinite(item.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);
}

function numericState(value) {
    const normalized = String(value ?? "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function positiveCapacity(value) {
    const parsed = numericState(value);
    return parsed !== null && parsed > 0 ? parsed : null;
}

function stateAt(states, timestamp) {
    let latest = null;
    for (const item of states) {
        if (item.timestamp > timestamp) break;
        if (numericState(item.state) !== null) latest = item;
    }
    if (latest) return latest;
    return states.find((item) => numericState(item.state) !== null) ?? null;
}

function validSoc(item) {
    const value = numericState(item?.state);
    return value !== null && value >= 0 && value <= 100 ? value : null;
}

/**
 * Build the SOC timeline used for charging calculations without destroying the
 * raw Recorder history. While the charging binary sensor is on, a large SOC
 * decrease is not a credible charging transition. Stellantis has occasionally
 * published a transient 0 % between otherwise monotonic values (for example
 * 67 -> 0 -> 68). Such samples remain in Recorder, but are excluded from
 * session start/end, energy and curve calculations and reported through a
 * quality flag.
 */
export function validateChargingSocTimeline(rawStates, start, end, maxDropPercent = 5) {
    const states = normalizedStates(rawStates);
    return validateNormalizedChargingSocTimeline(states, start, end, maxDropPercent);
}

function validateNormalizedChargingSocTimeline(states, start, end, maxDropPercent = 5) {
    const previous = [...states]
        .reverse()
        .find((item) => item.timestamp < start && validSoc(item) !== null);
    const interval = states.filter(
        (item) => item.timestamp >= start && item.timestamp <= end && validSoc(item) !== null
    );
    const candidates = previous
        ? [{ state: previous.state, timestamp: start, _baseline: true }, ...interval]
        : interval;

    const accepted = [];
    const rejected = [];
    for (const item of candidates) {
        const value = validSoc(item);
        if (value === null) continue;
        const prior = accepted.at(-1);
        const priorValue = validSoc(prior);
        if (prior && priorValue !== null && value < priorValue - maxDropPercent) {
            rejected.push({ ...item, reason: "charging_soc_drop" });
            continue;
        }
        accepted.push(item);
    }

    return {
        states: accepted,
        rejected,
        quality_flags: rejected.length ? ["soc_outlier_rejected"] : [],
    };
}

function normalizeChargeType(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["ac", "slow", "normal", "standard"].includes(normalized)) return "AC";
    if (["dc", "quick", "fast", "rapid"].includes(normalized)) return "DC";
    return null;
}

function extractIntervals(chargingStates, mergeGapMs, includeActive = false) {
    const intervals = [];
    let start = null;
    let partialStart = false;
    let seenKnownState = false;

    for (const item of chargingStates) {
        const state = item.state.toLowerCase();
        if (state === "on") {
            if (start === null) {
                start = item.timestamp;
                partialStart = !seenKnownState;
            }
            seenKnownState = true;
            continue;
        }
        if (state !== "off") continue;

        if (start !== null && !partialStart && item.timestamp > start) {
            intervals.push({ start, end: item.timestamp });
        }
        start = null;
        partialStart = false;
        seenKnownState = true;
    }

    // A dashboard may explicitly request the still-running session for the
    // live curve. The default remains completed sessions only, so historical
    // tables are not altered by an in-progress charge.
    if (includeActive && start !== null && !partialStart && Date.now() > start) {
        intervals.push({ start, end: Date.now() });
    }

    const merged = [];
    for (const interval of intervals) {
        const previous = merged.at(-1);
        if (previous && interval.start - previous.end <= mergeGapMs) {
            previous.end = interval.end;
        } else {
            merged.push({ ...interval });
        }
    }
    return merged;
}

function maximumPowerFromStates(powerStates, start, end) {
    const values = powerStates
        .filter((item) => item.timestamp >= start && item.timestamp <= end)
        .map((item) => numericState(item.state))
        .filter((value) => value !== null && value >= 0 && value <= 500);
    return values.length ? Math.max(...values) : null;
}

function maximumPowerFromSoc(socStates, start, end, startSoc, capacity) {
    if (positiveCapacity(capacity) === null) return null;
    const points = [{ timestamp: start, value: startSoc }];
    for (const item of socStates) {
        if (item.timestamp <= start || item.timestamp > end) continue;
        const value = numericState(item.state);
        if (value !== null) points.push({ timestamp: item.timestamp, value });
    }

    let maximum = null;
    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const durationSeconds = (current.timestamp - previous.timestamp) / 1000;
        const socDelta = current.value - previous.value;
        if (durationSeconds < 120 || socDelta <= 0) continue;
        const power = (socDelta * capacity / 100) / (durationSeconds / 3600);
        if (Number.isFinite(power) && power >= 0 && power <= 500) {
            maximum = maximum === null ? power : Math.max(maximum, power);
        }
    }
    return maximum;
}

function chargeTypeForInterval(modeStates, start, end) {
    const values = [];
    const modeAtStart = [...modeStates]
        .reverse()
        .find((item) => item.timestamp <= start && normalizeChargeType(item.state));
    if (modeAtStart) values.push(normalizeChargeType(modeAtStart.state));
    for (const item of modeStates) {
        if (item.timestamp < start || item.timestamp > end) continue;
        const type = normalizeChargeType(item.state);
        if (type) values.push(type);
    }
    if (values.includes("DC")) return "DC";
    if (values.includes("AC")) return "AC";
    return "—";
}

function timestampValue(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    return Date.parse(value);
}

export function chargeSessionId(start) {
    const timestamp = timestampValue(start);
    return Number.isFinite(timestamp)
        ? `charge-${new Date(timestamp).toISOString()}`
        : `charge-${String(start ?? "unknown")}`;
}

function withSessionId(session) {
    return { ...session, id: session.id || chargeSessionId(session.start) };
}

function numericOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

/**
 * Converts historical states of the restart-safe local result sensor into
 * charging sessions. The current sensor state may be `unknown`; the
 * historical attributes are the source of truth for completed sessions.
 */
export function buildLocalChargeSessions(resultStates = []) {
    return resultStates
        .map((raw) => raw?.attributes ?? raw?.a ?? {})
        .filter((attrs) => attrs.start_time && attrs.end_time && attrs.duration_seconds)
        .map((attrs) => withSessionId({
            start: attrs.start_time,
            end: attrs.end_time,
            duration_seconds: numericOrNull(attrs.duration_seconds),
            soc_start: numericOrNull(attrs.soc_start),
            soc_end: numericOrNull(attrs.soc_end),
            capacity_kwh: numericOrNull(attrs.capacity_kwh),
            energy_kwh: numericOrNull(attrs.energy_kwh),
            average_power_kw: numericOrNull(attrs.average_power_kw),
            maximum_power_kw: numericOrNull(attrs.maximum_power_kw),
            charge_type: attrs.charge_type || "—",
            samples: Array.isArray(attrs.samples) ? attrs.samples : [],
            has_charge_curve: Array.isArray(attrs.samples) && attrs.samples.length >= 2,
            estimated: attrs.estimated !== false,
            quality_flags: Array.isArray(attrs.quality_flags) ? attrs.quality_flags : [],
        }))
        .filter((session) => Number.isFinite(timestampValue(session.start)) && Number.isFinite(timestampValue(session.end)));
}

/**
 * Merges recorder-reconstructed and local-result sessions. Local results are
 * preferred for a matching start time because they survive API publication
 * delays and contain the restart-safe completed-session metadata.
 */
export function mergeChargeSessions(rawSessions = [], localSessions = [], mergeGapMinutes = 5) {
    const merged = rawSessions.map(withSessionId);
    const gapMs = mergeGapMinutes * 60000;

    for (const local of localSessions) {
        const localId = chargeSessionId(local.start);
        const index = merged.findIndex((raw) =>
            raw.id === localId || Math.abs(timestampValue(raw.start) - timestampValue(local.start)) <= gapMs
        );
        if (index >= 0) merged.splice(index, 1);
        const duplicateIndex = merged.findIndex((session) => session.id === localId);
        if (duplicateIndex >= 0) merged.splice(duplicateIndex, 1);
        merged.push(withSessionId({ ...local, id: localId }));
    }

    return merged.sort((a, b) => timestampValue(b.start) - timestampValue(a.start));
}

/**
 * Resolves the stored selection ID. ISO start timestamps are accepted as a
 * backward-compatible bridge for selections written by versions before the
 * stable session ID was introduced.
 */
export function findChargeSession(sessions = [], requested) {
    if (!requested) return null;
    const exact = sessions.find((session) => session.id === requested || session.start === requested);
    if (exact) return exact;
    const requestedTime = timestampValue(requested);
    if (!Number.isFinite(requestedTime)) return null;
    return sessions.find((session) => Math.abs(timestampValue(session.start) - requestedTime) <= 5 * 60000) ?? null;
}

/**
 * Builds the points for one charging-session curve.
 *
 * The Stellantis API publishes a whole-number SOC rather than a direct
 * charging-power value. Each segment therefore represents the battery-side
 * average power between two increasing SOC reports. Without a trustworthy
 * capacity, no power curve is invented from the SOC delta.
 */
export function buildChargeCurve({
    socStates,
    modeStates = [],
    start,
    end,
    capacityKwh = null,
}) {
    const startTimestamp = timestampValue(start);
    const endTimestamp = timestampValue(end);
    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || endTimestamp <= startTimestamp) {
        return { points: [], charge_type: "—" };
    }

    const rawSoc = normalizedStates(socStates);
    const validated = validateNormalizedChargingSocTimeline(rawSoc, startTimestamp, endTimestamp);
    const soc = validated.states;
    const modes = normalizedStates(modeStates);
    const startSoc = validSoc(soc[0]);
    const endSoc = validSoc(soc.at(-1));
    const chargeType = chargeTypeForInterval(modes, startTimestamp, endTimestamp);
    if (startSoc === null) {
        return { points: [], charge_type: chargeType, quality_flags: validated.quality_flags };
    }

    const capacity = positiveCapacity(capacityKwh);
    if (capacity === null) {
        return {
            points: [],
            start_soc: startSoc,
            end_soc: endSoc ?? startSoc,
            charge_type: chargeType,
            quality_flags: validated.quality_flags,
        };
    }

    const points = [];
    let previous = { timestamp: startTimestamp, soc: startSoc };

    for (const item of soc) {
        if (item.timestamp <= startTimestamp || item.timestamp > endTimestamp) continue;
        const currentSoc = validSoc(item);
        if (currentSoc === null || currentSoc <= previous.soc) continue;

        const durationSeconds = (item.timestamp - previous.timestamp) / 1000;
        const deltaSoc = currentSoc - previous.soc;
        const powerKw = durationSeconds > 0
            ? (deltaSoc * capacity / 100) / (durationSeconds / 3600)
            : null;

        // Reject implausible power segments. The validated SOC timeline is
        // still used as the next reference, so one bad timing interval cannot
        // inflate a following segment.
        if (Number.isFinite(powerKw) && powerKw >= 0 && powerKw <= 350) {
            points.push({
                timestamp: previous.timestamp,
                soc: previous.soc,
                power_kw: powerKw,
            });
            points.push({
                timestamp: item.timestamp,
                soc: currentSoc,
                power_kw: powerKw,
            });
        }
        previous = { timestamp: item.timestamp, soc: currentSoc };
    }

    return {
        points,
        start_soc: startSoc,
        end_soc: endSoc ?? previous.soc,
        charge_type: chargeType,
        quality_flags: validated.quality_flags,
    };
}

export function buildChargeSessions({
    chargingStates,
    socStates,
    powerStates = [],
    modeStates = [],
    capacityStates = [],
    fallbackCapacity = null,
    mergeGapMinutes = 3,
    includeActive = false,
}) {
    const charging = normalizedStates(chargingStates);
    const rawSoc = normalizedStates(socStates);
    const power = normalizedStates(powerStates);
    const modes = normalizedStates(modeStates);
    const capacities = normalizedStates(capacityStates);
    const intervals = extractIntervals(
        charging, mergeGapMinutes * 60000, includeActive
    );

    return intervals.map((interval) => {
        const validated = validateNormalizedChargingSocTimeline(rawSoc, interval.start, interval.end);
        const soc = validated.states;
        const startSoc = validSoc(soc[0]);
        const endSoc = validSoc(soc.at(-1));
        const capacityState = stateAt(capacities, interval.start);
        const measuredCapacity = positiveCapacity(capacityState?.state);
        const capacity = measuredCapacity ?? positiveCapacity(fallbackCapacity);
        const durationSeconds = (interval.end - interval.start) / 1000;
        const socDelta = startSoc !== null && endSoc !== null
            ? Math.max(0, endSoc - startSoc)
            : null;
        const energy = socDelta !== null && capacity !== null
            ? socDelta * capacity / 100
            : null;
        const averagePower = energy !== null && durationSeconds > 0
            ? energy / (durationSeconds / 3600)
            : null;
        const recordedMaximum = maximumPowerFromStates(power, interval.start, interval.end);
        const derivedMaximum = startSoc !== null && capacity !== null
            ? maximumPowerFromSoc(soc, interval.start, interval.end, startSoc, capacity)
            : null;
        const maximumPower = recordedMaximum !== null && recordedMaximum > 0
            ? recordedMaximum
            : derivedMaximum;

        return {
            id: chargeSessionId(new Date(interval.start).toISOString()),
            start: new Date(interval.start).toISOString(),
            end: new Date(interval.end).toISOString(),
            duration_seconds: Math.round(durationSeconds),
            soc_start: startSoc,
            soc_end: endSoc,
            capacity_kwh: capacity,
            energy_kwh: energy,
            average_power_kw: averagePower,
            maximum_power_kw: maximumPower,
            charge_type: chargeTypeForInterval(modes, interval.start, interval.end),
            estimated: energy !== null,
            quality_flags: validated.quality_flags,
            rejected_soc_samples: validated.rejected.length,
        };
    });
}
