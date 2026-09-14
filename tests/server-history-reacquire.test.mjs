import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const history = read("custom_components/sv_dashboard/server_history.py");
const init = read("custom_components/sv_dashboard/__init__.py");
const compat = read("custom_components/sv_dashboard/upstream_compat.py");
const unload = init.slice(init.indexOf("async def async_unload_entry"));

test("resolution prefers device-linked entries and falls back to loaded caches", () => {
  assert.match(compat, /def resolve_loaded_upstream\(/);
  assert.match(compat, /resolve_cached_upstream\(client, target_vin\)/);
  assert.match(history, /preferred_entry_ids = set\(getattr\(device, "config_entries", \(\)\) or \(\)\)/);
  assert.match(history, /async_entries\(UPSTREAM_DOMAIN\)/);
  assert.doesNotMatch(history, /if device is None:\n\s+return None, None/);
  assert.doesNotMatch(history, /get_user_vehicles/);
});

test("unresolved startup uses one cancellable bounded reacquisition worker", () => {
  assert.match(history, /self\._initialize_lock = asyncio\.Lock\(\)/);
  assert.match(history, /if self\._reacquire_task is not None and not self\._reacquire_task\.done\(\):/);
  assert.match(history, /delay = min\(delay \* 2, 300\)/);
  assert.match(history, /self\._reacquire_task\.cancel\(\)/);
  assert.match(init, /entry\.async_on_unload\(server_history\.async_cancel_background_tasks\)/);
});

test("failed platform unload does not shut down reacquisition", () => {
  const unloadResult = unload.indexOf("unloaded = await hass.config_entries.async_unload_platforms");
  const successBranch = unload.indexOf("if unloaded:");
  const cancellation = unload.indexOf("coordinator.server_history.async_cancel_background_tasks");
  assert.ok(unloadResult >= 0);
  assert.ok(successBranch > unloadResult);
  assert.ok(cancellation > successBranch);
  assert.doesNotMatch(
    unload.slice(0, successBranch),
    /async_cancel_background_tasks\(\)/,
  );
});

test("successful reacquisition still uses the normal sync/readiness path", () => {
  assert.match(history, /self\._mark_server_history_ready\(\)/);
  assert.match(history, /await async_fetch_historical_trips\(/);
  assert.match(history, /self\.data\["server_history_source"\] = "local_fallback"/);
  assert.match(history, /self\.data\["server_history_ready"\] = True/);
});
