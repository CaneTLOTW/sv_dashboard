# Community guide

SV Dashboard is a small volunteer-maintained project. This guide explains where a contribution belongs and helps keep the tracker useful and safe for everyone.

## Choose the right place

| Place | Use it for | Do not use it for |
| --- | --- | --- |
| [Bug report](../.github/ISSUE_TEMPLATE/bug_report.yml) | A reproducible problem in a released version | Setup questions, a single unavailable upstream value, or private data |
| [Feature request](../.github/ISSUE_TEMPLATE/feature_request.yml) | A well-defined, portable improvement | Early ideas or requests tied to one household |
| [Discussions](https://github.com/CaneTLOTW/sv_dashboard/discussions) | Questions, ideas, feedback, screenshots, and shared configurations | Reproducible defects that need tracking |
| Private security advisory | Vulnerabilities or accidental data exposure | General product support |

## Discussions

Use the category that best matches the topic:

- **Q&A** for installation, configuration and usage questions.
- **Ideas** for early proposals that need community feedback before becoming a feature request.
- **Show and tell** for dashboards, screenshots, automations and practical Stellantis-vehicle experiences.
- **General** for project-wide feedback and compatibility observations.

Discussion threads are community support. A reply is welcome but not guaranteed, and neither the project nor its maintainers can provide vehicle, Stellantis-account or Home Assistant support on a fixed schedule.

## Good reports

For a bug report, include the SV Dashboard, Home Assistant and Stellantis Vehicles versions; the affected view or package-owned entity; concise reproduction steps; and anonymised logs/screenshots. First verify that the upstream Stellantis integration is configured and exposes working vehicle entities.

For a feature request, explain the user need, portable behavior and the upstream entities/capabilities it would rely on. Features must not require a VIN, hard-coded model, specific household layout or private service.

## Compatibility reports

When reporting a new brand/model/powertrain, distinguish between:

- upstream entity/control being present;
- SV Dashboard displaying/mapping it correctly;
- a remote command being accepted;
- the physical vehicle effect being verified.

Do not trigger intrusive commands merely to discover compatibility.

## Privacy

Never publish a VIN, vehicle/home location, GPS history, credentials, tokens, account identifiers, notification recipients, raw entity exports, Home Assistant backups or `.storage` files. Redact screenshots before uploading them.

## Scope

SV Dashboard is a dashboard companion for the upstream Stellantis Vehicles integration. It does not implement the Stellantis API, authentication or native remote vehicle commands. Upstream API availability, polling limits and vehicle-specific capabilities can vary by model, region, account and time.
