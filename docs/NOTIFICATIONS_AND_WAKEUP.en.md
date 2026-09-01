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
| Quiet-hours start | 22:00 |
| Quiet-hours end | 07:00 |

Warning/reset pairs retain valid hysteresis. Changing a setting does not intentionally reset existing episode markers.

Electric/home-charge settings are only meaningful where the selected vehicle exposes the required electric/charging capabilities.

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

SV Dashboard prefers a proven fresh vehicle/temperature source heartbeat and exposes the selected heartbeat in diagnostics.

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
5. if neither upstream end time nor a defensible estimate exists, omit the precise finish time.

No fixed battery capacity or hard-coded 80 % target is used.

## Wake-up controls

The Wake-up view can include:

- **Wake vehicle now**;
- **Hourly wake-up**;
- **Wake-up while charging** where relevant;
- **Availability wake-up probe**.

Automatic switches start off.

The existence or success of an upstream command entity is not proof that the selected vehicle supports the physical action. See [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md).

## Recipient management

Recipient selection belongs to Home Assistant integration options rather than hard-coded dashboard/repository configuration.

The Notifications view shows controls only for explicitly selected recipients that currently exist as Home Assistant Notify services.

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

Notification switches, settings, episode markers, last-notification diagnostics and wake-up counters are stored per SV Dashboard config entry and survive Home Assistant restarts.

## Current QA status

The migrated SV implementation contains the notification/wake-up contract above, but focused real-event runtime acceptance is still open.

Recipient delivery, quiet-hours deferral, heartbeat outage/recovery and charge-start hierarchy are tracked in **SV Dashboard issue #3**. The project does not manufacture disruptive vehicle states solely for testing.
