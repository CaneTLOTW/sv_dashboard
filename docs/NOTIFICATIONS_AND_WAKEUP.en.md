# Notifications and wake-up

## Safety model: explicit opt-in

Installing SV Dashboard does **not** send notifications and does **not** activate automatic wake-up behavior.

Notification delivery requires explicit choices:

1. select one or more existing Home Assistant `notify.*` services in **Settings → Devices & services → SV Dashboard → Configure**;
2. enable the notification master switch;
3. enable the relevant topic switch;
4. enable the intended recipient switch.

Notify-service discovery is selection-only. A newly discovered service is never silently enabled.

Multiple selected recipients are supported. A delivery failure for one recipient must not prevent delivery to another active recipient.

## Package-owned settings

Settings are native `sv_dashboard` Number/Time entities and persist per config entry.

| Setting | Default |
| --- | ---: |
| Range warning | 25 km |
| Range reset | 30 km |
| At-home SOC warning | 30 % |
| At-home SOC reset | 35 % |
| At-home warning delay | 20 min |
| 12-V/service-battery warning | 50 % |
| 12-V/service-battery reset | 55 % |
| Stale threshold at home/inactive | 3 h |
| Stale threshold away/active | 2 h |
| Reachability probe wait | 15 min |
| Charge-start notification delay | 10 min |
| Periodic wake-up interval | 60 min (30–360 min) |
| Quiet-hours start | 22:00 |
| Quiet-hours end | 07:00 |

Warning/reset pairs retain valid hysteresis. Changing a setting does not intentionally reset existing episode markers.

Electric/home-charge settings are only meaningful where the selected vehicle exposes the required electric/charging capabilities.

Home presence is configured with one or more existing Home Assistant `zone.*` entities in the integration options. `zone.home` remains the portable default; no household zone helper or friendly name is hard-coded.

## Notification topics

Depending on enabled modules and vehicle capabilities, SV Dashboard can report:

| Event | Typical content |
| --- | --- |
| Completed trip | Distance, duration, speed and available energy/consumption data. |
| Charge started | Start/current SOC and defensible expected finish time when supported. |
| Charge completed | Duration, SOC change and available energy/power/type data. |
| Low range | Current range/SOC below the configured threshold with reset hysteresis. |
| At-home charge recommendation | Low SOC persisted for the configured delay while home, off and not charging. |
| 12-V/service battery warning | Service-battery value below threshold with reset hysteresis. |
| Vehicle unreachable | Confirmed stale vehicle heartbeat after the configured logic/probe path. |
| Vehicle recovered | One recovery message after a reported outage and proven fresh heartbeat. |

Charge reports and SOC/home-charge recommendations are capability-gated. Combustion-only vehicles must not receive invented electric events.

SOC-derived energy/power values remain battery-side estimates and are not meter readings.

## Reachability heartbeat

A parked vehicle can legitimately keep the same SOC, mileage, range or location for hours. Unchanged values are not generic proof of connection.

SV Dashboard first reads the newest trustworthy `createdAt` / `updatedAt` timestamp from the already-loaded Stellantis Vehicles coordinator payload for the exact selected VIN. This is local cached data: it performs no extra REST request and no wake-up. It fixes the important case where a fresh payload returns the same ambient-temperature value and the upstream Home Assistant temperature entity therefore does not change.

If that loaded payload is temporarily unavailable during startup/reload, SV falls back to the freshest timestamp across several mapped vehicle-data entities rather than trusting temperature alone. Command-history/action timestamps are explicitly excluded.

A Stellantis command status such as `accepted` or `forwarded` proves only that the command path accepted the request. It does **not** prove that the vehicle returned fresh telemetry.

## Availability episode flow

When the proven heartbeat exceeds the configured stale threshold:

1. start an outage candidate;
2. optionally request one wake-up for the episode;
3. wait the configured probe interval;
4. only a fresh vehicle heartbeat clears the candidate;
5. if still stale, generate at most one unreachable notification for the episode;
6. after a reported outage, generate one recovery notification when genuine freshness returns.

The probe is deliberately conservative and must not become high-frequency polling.

## Quiet hours

Quiet hours apply to non-urgent availability warnings.

A warning that becomes eligible during quiet hours is **deferred, not dropped**. At quiet-hours end:

- send it once if the vehicle is still stale and the episode remains eligible;
- discard it if genuine recovery happened first.

Quiet hours do not globally suppress all trip/charge reports or other notification families.

## Charge-start expected finish time

SV Dashboard uses a strict hierarchy:

1. prefer a valid, plausible and sufficiently fresh upstream charging-end time;
2. otherwise use the valid configured upstream charge limit when active and above current SOC;
3. otherwise use 100 % as target SOC;
4. estimate remaining time only from recent positive plausible power samples;
5. if neither upstream end time nor a defensible estimate exists, still send the truthful charge-start report but omit the precise finish time.

No fixed battery capacity or hard-coded 80 % target is used.

## Wake-up controls

The Wake-up view can include:

- **Wake vehicle now**;
- **Periodic wake-up** with a configurable 30–360 minute interval (default 60 min);
- **Wake-up while charging** where relevant;
- **Availability wake-up probe**;
- package-owned last wake-up, wake-ups-today and bounded 24-hour wake-up activity diagnostics.

Automatic switches start off.

The existence or success of an upstream command entity is not proof that the selected vehicle supports the physical action. See [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md).

## Recipient management

Recipient selection belongs to Home Assistant integration options rather than hard-coded dashboard/repository configuration.

The Notifications view creates controls from explicitly configured recipients. A recipient switch can remain defined while its underlying Home Assistant Notify entity is temporarily unavailable during provider reload; delivery still fails closed unless the destination is currently discoverable/available.

No recipient credentials, mobile-app names, messaging-service configuration or household IDs belong in this repository.

## Diagnostics

Notification/System state exposes package diagnostics such as:

- last notification information;
- heartbeat source/time;
- outage/probe state;
- wake-up/counter information;
- package control/entity mappings.

Diagnostics should explain behavior without exposing raw private stores or upstream payloads.

## Persistence

Notification switches, settings, episode markers, logical trip/charge notification IDs, last-notification diagnostics, wake-up counters and bounded wake-up activity are stored per SV Dashboard config entry and survive Home Assistant restarts.

The **Restore notification defaults** action resets only package-owned Number/Time settings. It never opts in the master switch, topic switches, recipients or wake-up switches.

## Current QA status

The notification/wake-up contract above is implemented. The modern Notify-entity cutover and provider-reload lifecycle were runtime-accepted through beta.25: explicitly configured recipient switches survive a temporary provider-entity disappearance and recover availability without requiring an SV Dashboard reload.

Focused **natural-event** acceptance is still open for real trip/charge reports, quiet-hours deferral and outage/recovery behavior in **SV Dashboard issue #3**. Runtime QA should validate the same generic contract for any vehicle state and must not add owner- or vehicle-specific behavior.


## Recipient delivery

SV Dashboard discovers notification destinations explicitly selected by the user. Modern Home Assistant notify entities are delivered through `notify.send_message`; legacy `notify.<service>` actions remain supported only as a compatibility fallback.

Selecting a recipient in the integration options does not enable it automatically. Each selected recipient retains its own explicit SV recipient switch.

The package Test notification is intentionally usable while the global notification master is still off, so recipient routing can be accepted before the production cutover. It still requires at least one selected recipient whose recipient switch is enabled.
