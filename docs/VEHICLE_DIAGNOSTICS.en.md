# Vehicle diagnostics timeline

The generated dashboard's **System → Vehicle diagnostics** card shows a
read-only timeline of Home Assistant Recorder state changes for the selected
SV Dashboard config entry. It is intended to correlate existing history, not
to diagnose or issue a vehicle command.

## Use

The card loads a two-hour window once when opened. Select **30 min**, **2 h**,
**6 h** or **24 h** and press **Reload** to run another bounded query. Expand a
timeline row to compare its Home Assistant event time with a source timestamp
when one was recorded. **Copy diagnostics** copies a compact support summary;
the copied timeline is capped at 80 events and 24,000 characters.

Signals are resolved from the selected config entry's upstream entity mapping.
When available, the timeline includes refresh interval, preconditioning,
temperature, translated command status, remote availability, charging, battery
level, and mapped vehicle-data state changes. Missing optional entities and an
empty Recorder result are normal and do not fail the System view. The current
refresh interval is shown separately from its historical state changes.

## What Recorder evidence means

- Event time is the Home Assistant state timestamp stored by Recorder.
- A source timestamp is shown only when the recorded entity attributes contain
  a parseable upstream time field. Otherwise the row identifies its timestamp
  as Home Assistant state time.
- A mapped vehicle-data state change is evidence that Home Assistant recorded a
  relevant mapped state. It is shown separately from command status, but does
  **not** prove that the vehicle was continuously online or that a command was
  delivered.
- Temperature history is displayed as temperature. The diagnostics timeline
  does not infer a climate mode or reinterpret the EV Hero's climate styling.
- Command rows show only the upstream integration's recorded, translated
  `command_status` state. The raw MQTT result code is not stored in this
  Recorder history and is explicitly reported as **not recorded**; it is never
  reconstructed from translated text or a number.
- A later recorded vehicle-data state can follow a command timeout. These are
  independent observations: command outcome is not the same as vehicle
  reachability.

The query reads at most 24 hours, uses only entity IDs from the selected config
entry's mapping, returns at most 300 events, and makes no vehicle command or
external network request. It does not scrape Home Assistant logs, read or
export persistent notifications, or write a diagnostic cache. Historic source
timestamps or transitions that Recorder did not retain cannot be recovered.

## Privacy

The response and clipboard summary use stable semantic signal names, not entity
IDs. They omit VINs, coordinates, URLs, customer/account identifiers, tokens,
MQTT topics and raw payloads. Only selected state values, approved units, event
times and recognized source-time attributes are included. No report is written
to the server.

## Related charging/settings behavior

The beta.38 refresh-interval preset remains a convenience proxy to the actual
upstream number entity; it does not introduce a second polling interval or
performance fix. The neutral active-preconditioning color is retained as UI
semantics and is independent of this diagnostics timeline.

For beta.40, charge-power sampling keeps vehicle source time and Home Assistant
observation time separately. A frozen upstream timestamp no longer identifies
all later changed SOC/residual observations as one payload; bounded HA
observation-time fallback is explicitly marked when it is needed to time a real
value delta. The diagnostics timeline remains read-only and does not alter that
calculation.
