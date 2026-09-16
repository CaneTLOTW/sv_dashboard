# Temporary compatibility: closed Stellantis history transport

SV Dashboard normally delegates all Stellantis authentication and HTTP session ownership to the upstream `stellantis_vehicles` integration.

At the time this compatibility path was introduced, upstream `StellantisBase.close_session()` could leave an already-closed `ClientSession` referenced in `client._session`: it returned early when `session.closed` was already true, while `start_session()` only created a replacement when `_session` was falsey. Historical `/trips` requests could therefore fail with `Connector is closed.` even though the currently loaded client and VIN were otherwise valid.

The SV compatibility action is intentionally narrow:

- never bind to an upstream client whose `_shutting_down` flag is true;
- never create or own a Stellantis `aiohttp.ClientSession` in SV Dashboard;
- when the referenced upstream session is already closed, clear only that dead `_session` reference so the next upstream `make_http_request()` recreates its own session;
- when only the connector is closed while the session is still open, call upstream `close_session()` first;
- retry a request only once, and only for the explicit closed-session/connector error family;
- preserve the existing VIN matching, authentication, pagination, fallback history and unload behavior.

This is a temporary third-party compatibility shim. Remove it once the minimum supported upstream version guarantees that closed sessions cannot remain referenced and the runtime acceptance for that upstream version has passed.
