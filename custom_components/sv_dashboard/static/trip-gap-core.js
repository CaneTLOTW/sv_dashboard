const numberOrNull = (value) => {
    const numeric = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(numeric) ? numeric : null;
};

const rounded = (value) => Math.round(value * 1000) / 1000;

const canonicalTime = (trip) => trip?.end_time || trip?.start_time || null;

const endMileage = (trip) => {
    const explicit = numberOrNull(trip?.end_mileage ?? trip?.end_mileage_km);
    if (explicit !== null) return explicit;
    const start = numberOrNull(trip?.start_mileage ?? trip?.start_mileage_km);
    const distance = numberOrNull(trip?.distance_km ?? trip?.distance);
    return start !== null && distance !== null ? start + distance : null;
};

const usableAnchor = (trip) => {
    if (!trip || trip.valid_for_statistics === false) return false;
    const start = numberOrNull(trip.start_mileage ?? trip.start_mileage_km);
    const end = endMileage(trip);
    return start !== null && end !== null && start >= 0 && end >= start;
};

export function semanticTripTime(trip) {
    const attributes = trip?.attributes ?? {};
    return attributes.end_time || attributes.start_time || trip?.end_time || trip?.start_time ||
        trip?.last_updated || trip?.last_changed || null;
}

export function tripFilterTime(trip) {
    if (trip?.reconstructed_gap || trip?.attributes?.reconstructed_gap) {
        const attributes = trip?.attributes ?? {};
        return attributes.gap_before_time || trip?.gap_before_time ||
            attributes.gap_after_time || trip?.gap_after_time || null;
    }
    return semanticTripTime(trip);
}

export function insertOdometerGapRows(trips, { toleranceKm = 1, maxGapKm = 1000 } = {}) {
    const ordered = Array.isArray(trips) ? [...trips] : [];
    const result = [];

    for (let index = 0; index < ordered.length; index += 1) {
        const current = ordered[index];
        const previous = index > 0 ? ordered[index - 1] : null;

        if (previous && usableAnchor(previous) && usableAnchor(current)) {
            const previousEnd = endMileage(previous);
            const currentStart = numberOrNull(current.start_mileage ?? current.start_mileage_km);
            const gap = previousEnd !== null && currentStart !== null
                ? rounded(currentStart - previousEnd)
                : null;

            if (gap !== null && gap > toleranceKm && gap <= maxGapKm) {
                const previousId = String(previous.server_id || previous.id || index - 1);
                const currentId = String(current.server_id || current.id || index);
                result.push({
                    id: `odometer-gap:${previousId}:${currentId}`,
                    server_id: `odometer-gap:${previousId}:${currentId}`,
                    source: "reconstructed_odometer_gap",
                    sources: ["odometer_continuity"],
                    reconstructed_gap: true,
                    status: "reconstructed",
                    confidence: "high",
                    start_time: null,
                    end_time: null,
                    gap_after_time: canonicalTime(previous),
                    gap_before_time: current.start_time || current.end_time || null,
                    duration_seconds: null,
                    distance_km: gap,
                    start_mileage: rounded(previousEnd),
                    end_mileage: rounded(currentStart),
                    start_mileage_km: rounded(previousEnd),
                    end_mileage_km: rounded(currentStart),
                    average_speed: null,
                    average_speed_kmh: null,
                    energy_kwh: null,
                    energy_per_100_km: null,
                    fuel_consumption_l: null,
                    fuel_consumption_l_100km: null,
                    trip_type: "unknown",
                    valid_for_statistics: false,
                    quality_flags: ["reconstructed_odometer_gap"],
                });
            }
        }
        result.push(current);
    }
    return result;
}
