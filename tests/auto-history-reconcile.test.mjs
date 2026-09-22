import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../custom_components/sv_dashboard/server_history.py", import.meta.url),
  "utf8",
);

test("server history listens to both completion events", () => {
  assert.match(source, /f"\{DOMAIN\}_trip_completed"/);
  assert.match(source, /f"\{DOMAIN\}_charge_completed"/);
  assert.match(source, /self\._handle_trip_completed/);
  assert.match(source, /self\._handle_charge_completed/);
});

test("automatic reconciliation is bounded, coalesced and incremental", () => {
  assert.match(source, /_pending_auto_reconcile: dict/);
  assert.match(source, /completion_key\(event_type, payload\)/);
  assert.match(source, /AUTO_RECONCILE_DELAYS_SECONDS/);
  assert.match(source, /await self\.async_initialize\(\)/);
  assert.doesNotMatch(source, /_async_auto_reconcile[\s\S]{0,5000}async_full_sync\(\)/);
  assert.match(source, /parsed - timedelta\(hours=2\)/);
});

test("automatic reconciliation records diagnostics and stops when represented", () => {
  for (const result of ["pending", "represented", "retry_pending", "sync_failed", "exhausted"]) {
    assert.match(source, new RegExp(`"${result}"`));
  }
  assert.match(source, /if not self\._pending_auto_reconcile:[\s\S]{0,300}result="represented"/);
});

test("shutdown cancels automatic worker and unsubscribes completion listeners", () => {
  assert.match(source, /self\._auto_reconcile_task\.cancel\(\)/);
  assert.match(source, /for unsubscribe in self\._event_unsubs/);
  assert.match(source, /self\._pending_auto_reconcile\.clear\(\)/);
});

test("manual full sync remains an explicit separate action", () => {
  assert.match(source, /async def async_full_sync\(self\)/);
  assert.match(source, /await self\.async_initialize\(_force_full=True\)/);
});
