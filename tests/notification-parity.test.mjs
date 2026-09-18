import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

const notifications = read("notifications.py");
const metrics = read("metrics.py");
const configFlow = read("config_flow.py");
const buttons = read("button.py");
const strategy = read("static/sv_dashboard.js");
const frontendI18n = read("static/i18n.js");

test("reachability heartbeat prefers cached Stellantis source timestamps", () => {
  assert.match(notifications, /current_upstream_heartbeat\(\)/);
  assert.match(notifications, /"upstream_payload_timestamp"/);
  assert.match(notifications, /temperature[\s\S]*mileage[\s\S]*battery/);
  assert.doesNotMatch(notifications, /command_status[\s\S]{0,400}_heartbeat/);
});

test("periodic wake-up is configurable but remains bounded", () => {
  assert.match(notifications, /"wakeup_interval_minutes": 60\.0/);
  assert.match(notifications, /"wakeup_interval_minutes": \("Periodic wake-up interval", "mdi:timer-sync-outline", 30, 360, 15\)/);
  assert.match(notifications, /timedelta\(minutes=float\(self\.setting\("wakeup_interval_minutes"\)\)\)/);
  assert.match(strategy, /notification_setting_wakeup_interval_minutes/);
  assert.match(strategy, /strings\.periodicWakeup/);
});

test("recipient options use the shared modern notify discovery contract", () => {
  assert.match(configFlow, /from \.notifications import available_notification_recipients/);
  assert.match(configFlow, /notify_recipients = available_notification_recipients\(self\.hass\)/);
  assert.doesNotMatch(configFlow, /f"notify\.\{service_name\}"[\s\S]{0,300}recipient_selector/);
});

test("home zones are portable config options, not household helper names", () => {
  assert.match(configFlow, /OPTION_HOME_ZONES/);
  assert.match(configFlow, /state\.entity_id\.startswith\("zone\."\)/);
  assert.match(notifications, /def _home_zones/);
  assert.match(notifications, /entry\.options\.get\(OPTION_HOME_ZONES/);
  assert.match(notifications, /state\.attributes\.get\("in_zones"\)/);
  assert.doesNotMatch(notifications, /input_text\.|input_select\.|VR7CB/);
});

test("completed trip and charge reports are persistently de-duplicated", () => {
  assert.match(notifications, /"notified_events"/);
  assert.match(notifications, /_logical_event_key/);
  assert.match(notifications, /_event_already_notified/);
  assert.match(notifications, /_mark_event_notified/);
  assert.match(notifications, /_MAX_NOTIFIED_EVENTS = 100/);
});

test("charge-start report does not invent ETA and is not dropped without ETA", () => {
  assert.match(notifications, /charge_started_message_no_eta/);
  assert.match(notifications, /if remaining is not None and remaining > 0:/);
  assert.match(notifications, /else:[\s\S]*charge_started_message_no_eta[\s\S]*_async_notify/);
});

test("charge completion uses first observed off boundary after debounce", () => {
  assert.match(metrics, /end_candidate_time/);
  assert.match(metrics, /_async_mark_charge_end_candidate/);
  assert.match(metrics, /_async_clear_charge_end_candidate/);
  assert.match(metrics, /dt_util\.parse_datetime\(str\(active\.get\("end_candidate_time"\)/);
  assert.doesNotMatch(metrics, /start_time = [^\n]+\n\s*end_time = dt_util\.utcnow\(\)\n\s*duration_seconds/);
});

test("settings reset cannot opt in notifications or recipients", () => {
  assert.match(buttons, /"reset_notification_defaults"/);
  assert.match(notifications, /async def async_reset_settings/);
  assert.match(notifications, /self\.data\["settings"\] = dict\(SETTING_DEFAULTS\)/);
  const resetStart = notifications.indexOf("async def async_reset_settings");
  const resetEnd = notifications.indexOf("async def async_set_setting", resetStart);
  const resetBlock = notifications.slice(resetStart, resetEnd);
  assert.doesNotMatch(resetBlock, /switches|recipient/);
});

test("wake-up view exposes activity and reachability diagnostics", () => {
  for (const token of [
    "wakeupActivity24h",
    "wakeupsToday",
    "lastWakeup",
    "lastVehicleData",
    "lastProbe",
    "homeZones",
    "reachability",
    "reset_notification_defaults",
  ]) {
    assert.ok(strategy.includes(token), `missing wake-up UI token ${token}`);
  }
  assert.match(notifications, /"wakeup_activity"/);
  assert.match(notifications, /timedelta\(hours=24\)/);
  assert.match(frontendI18n, /NOTIFICATION_WAKEUP_TEXT/);
});
