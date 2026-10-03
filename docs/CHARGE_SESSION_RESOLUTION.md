# Canonical charge-session resolution

SV Dashboard treats a charging session as a **physical interval first** and a
set of telemetry fields second. This prevents one real charge from becoming
multiple history rows merely because different Home Assistant/Recorder/REST
representations disagree about SOC, energy, power or charging mode.

## Physical session identity

Completed observed-charge representations may be combined only when their
start/end interval evidence strongly matches.

Current guards include:

- start boundaries within 90 seconds;
- end boundaries within 5 minutes;
- compatible duration where both sides expose one.

SOC, range, energy, average power and charge type are deliberately **not**
required to match before the physical event is identified. Those values are
resolved only after identity has been established.

This contract covers the real DS N°4 case where one physical AC charge had an
intermediate representation ending around 96% and a later `Finished`
representation ending around 99%.

## Per-field evidence

For one matched physical charge, summary fields are resolved independently.

- A known value fills a missing/Unknown/degraded field.
- A sparse representation cannot erase richer same-session evidence.
- `No` during a proven active charge is degraded charging-mode evidence; it
  normalizes to Unknown until explicit Slow/Normal/AC or Quick/Fast/DC evidence
  exists.
- Equivalent mode spellings are normalized before conflict comparison.
- A later trustworthy completion boundary may update end-dependent fields such
  as end time, duration, end SOC, energy and average power even when an earlier
  representation already had non-null intermediate values.
- Conflicting values remain available as field-conflict/provenance metadata
  where the backend contract records them.

Charging type is never inferred solely from power level.

## Exact and sample-derived boundaries

The package captures exact start/end values when they are available at the
physical charging transition. If an exact field is missing, the earliest or
latest useful in-session sample may fill it as fallback evidence.

Sample-derived boundaries remain explicitly marked. Energy calculated across
such a boundary is marked partial/sample-boundary evidence rather than being
presented as if both endpoints were measured at the physical plug-in/off edge.

Valid numeric zero remains a value where the field semantics permit zero.

## Source time versus observation time

A Stellantis source timestamp and a Home Assistant observation timestamp answer
different questions.

Each live charge sample can preserve:

- vehicle/upstream source time;
- metric-specific SOC/residual source time;
- Home Assistant metric update time;
- local `received_at` observation time;
- trigger metric and bounded fan-out provenance.

A reused upstream timestamp is **not** sufficient proof that two later
observations are the same payload. When the same metric changes again, SV
retains a new sample even if Stellantis reused the same source timestamp.

The same distinction applies when rendering a persisted curve. The stored SOC
timeline uses the HA/SV observation timestamp first. The vehicle source
timestamp is only a fallback for older records that have no observation time.
Otherwise a frozen source timestamp can place every recent SOC point outside
its real charge interval and make an existing curve appear empty.

Closely spaced updates from different mapped charging metrics may be coalesced
as one payload fan-out. This prevents duplicate points without collapsing a
real hour-long charging progression.

## Live power versus retrospective power

Live current charge power requires a defensible recent positive delta.

- residual-energy movement is preferred when it advances;
- whole-percent SOC × trustworthy capacity is the fallback;
- if the metric changed while its source timestamp stayed frozen, bounded HA
  observation time may time the delta with explicit
  `home_assistant_fallback` provenance;
- tiny/non-positive or implausible results are unavailable, not fake 0 kW;
- live freshness uses the recent observation/derivation time while original
  measurement/source time remains exposed separately.

A completed-session average is retrospective. It is never substituted for an
instantaneous current-power value.

## Power summaries

Estimated segment maxima are quality-checked. If an estimated
`maximum_power_kw` would be lower than the same session's average power, the
maximum is suppressed rather than "repaired" by copying the average.

Direct/strong measured power evidence may establish a maximum when available.

## Curve retention

Raw session samples remain package Store evidence. Home Assistant sensor
attributes expose only a bounded compact curve timeline.

One physical completed session should retain one curve association through:

1. live metrics finalization;
2. Recorder observed-session archive;
3. canonical server-history merge;
4. frontend fallback/history merge.

A duplicate history row is never required to keep a richer curve.

## Regression sources

The principal regression cases are:

- owner BEV sparse final result versus richer Recorder curve (62→70%);
- DS N°4 one physical AC charge with intermediate 24→96% and later
  `Finished` 24→99%;
- frozen Stellantis source time while HA observes changing SOC values;
- two genuinely separate nearby sessions that must remain separate.

Tests live in:

- `tests/charge_resolution_test.py`;
- `tests/charge-history-core.test.mjs`;
- `tests/current-charge-power.test.mjs`.

The corresponding release acceptance scope is
[`BETA40_TEST_SCOPE.md`](BETA40_TEST_SCOPE.md).
