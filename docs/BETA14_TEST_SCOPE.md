# beta.14 owner runtime scope

`v0.6.0-beta.14` is the immutable owner/canary candidate for the server-history lifecycle work merged after beta.13.

Primary runtime acceptance is tracked in Issue #55.

## Candidate focus

- historical Stellantis `/trips` access through the already loaded upstream authenticated transport;
- exact-VIN upstream runtime resolution after Home Assistant startup ordering misses;
- bounded background reacquisition without duplicate workers;
- rejection of upstream runtime clients already marked `_shutting_down`;
- temporary recovery from stranded closed upstream session/connector state without introducing an SV-owned OAuth/session stack;
- archive/local fallback preservation until server history actually synchronizes.

## Acceptance target

After installing the exact beta.14 release and restarting Home Assistant:

- SV Dashboard loads normally;
- Stellantis Vehicles remains healthy for normal coordinator/API refreshes;
- `server_history_ready=true`;
- `server_history_source=server`;
- `server_history_reason=sync_succeeded`;
- `last_sync` is fresh;
- `Connector is closed.` no longer strands history synchronization;
- existing archived/server/local history remains intact;
- no duplicate retry/reacquisition workers or unload warnings appear.

A controlled Stellantis Vehicles reload should also leave SV Dashboard able to reject the shutting-down runtime and reacquire the replacement current runtime.

If acceptance fails, record the exact exception/traceback and sanitized runtime/session/connector lifecycle state in Issue #55. Do not patch the runtime in place.

## Release boundary

This is a backend/history lifecycle prerelease. No frontend modules changed after beta.13, so their validated content cache keys intentionally remain unchanged.

`main` remains unchanged until beta.14 runtime acceptance and the remaining release gates are complete.
