import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../custom_components/sv_dashboard/notifications.py", import.meta.url),
  "utf8",
);

test("notification Store keeps the compatible v1 major schema", () => {
  assert.match(source, /_STORE_VERSION = 1/);
  assert.match(source, /settings = self\.data\.setdefault\("settings", \{\}\)/);
  assert.match(source, /for key, default in SETTING_DEFAULTS\.items\(\):/);
  assert.match(source, /settings\.setdefault\(key, default\)/);
});

test("notify discovery supports modern entities without auto-opting recipients in", () => {
  assert.match(source, /def available_notification_recipients/);
  assert.match(source, /state\.entity_id\.startswith\("notify\."\)/);
  assert.match(source, /hass\.services\.async_services\(\)\.get\("notify", \{\}\)/);
  assert.match(source, /configured = self\.entry\.options\.get\(OPTION_NOTIFICATION_RECIPIENTS\)/);
  assert.match(source, /if configured is None:/);
  assert.match(source, /switches\.get\(self\.recipient_switch_key\(recipient\)\) is True/);
  assert.doesNotMatch(source, /if configured is None:\s*return discovered/);
});

test("delivery prefers notify.send_message entities and keeps legacy service fallback", () => {
  assert.match(source, /self\.hass\.states\.get\(recipient\) is not None/);
  assert.match(source, /"notify",\s*"send_message"/);
  assert.match(source, /"entity_id": recipient/);
  assert.match(source, /service_name = recipient\.removeprefix\("notify\."\)/);
  assert.match(source, /"notify",\s*service_name,/);
});

test("test notification can validate selected recipients before enabling master", () => {
  assert.match(source, /async_test_notification[\s\S]*bypass_master=True/);
  assert.match(source, /bypass_master: bool = False/);
  assert.match(source, /if not bypass_master and not self\.is_enabled\(SWITCH_NOTIFICATIONS\):/);
  assert.match(source, /recipients = self\._enabled_recipients\(\)/);
});

test("quiet-hour outage deferral is eligible-only and cleared on delivery or recovery", () => {
  const master = source.indexOf("if not bypass_master and not self.is_enabled(SWITCH_NOTIFICATIONS):");
  const recipients = source.indexOf("recipients = self._enabled_recipients()", master);
  const quiet = source.indexOf('notification_type == "availability_outage" and self._in_quiet_hours()', recipients);
  assert.ok(master >= 0 && recipients > master && quiet > recipients);
  assert.match(source, /self\.data\["markers"\]\.pop\("quiet_notification_pending", None\)/);
  assert.match(source, /"quiet_notification_pending",\s*\)/);
});

test("charge-start forecast rejects stale episode data and scans recent plausible power", () => {
  assert.match(source, /_upstream_charge_end\(start\)/);
  assert.match(source, /updated < active_start - _CHARGE_END_START_TOLERANCE/);
  assert.match(source, /for sample in reversed\(samples\):/);
  assert.match(source, /_MAX_RECENT_CHARGE_SAMPLE_AGE/);
  assert.match(source, /_MAX_RECENT_CHARGE_POWER_KW/);
  assert.match(source, /if len\(values\) == 2:/);
});
