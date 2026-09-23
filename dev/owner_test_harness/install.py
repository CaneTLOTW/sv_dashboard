#!/usr/bin/env python3
"""Install the owner-only frontend fixture overlay into a local HA checkout.

Run after installing/updating the normal SV Dashboard candidate. The script is
idempotent and deliberately patches only the local installed static files.
Never copy these patched files back into custom_components/ in git.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import shutil

HERO_ANCHOR = '    const hero = tracker && (entity("battery") || entity("fuel")) ? (supportsDualEnergy ? {'
HERO_PATCH = '''    const ownerFixture = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("sv_owner_fixture")
      : null;
    const ownerFixtureActive = Boolean(ownerFixture);

    const hero = tracker && (entity("battery") || entity("fuel")) ? (ownerFixtureActive ? {
      type: "custom:sv-dashboard-owner-test-harness-card",
      entry_id: attributes.entry_id,
      grid_options: { columns: "full", rows: 5 },
    } : supportsDualEnergy ? {'''


def _patch_frontend(frontend: Path, source: Path) -> str:
    token = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    import_line = f'  import("./owner-test-harness-card.js?v=owner-{token}"),\n'
    text = frontend.read_text(encoding="utf-8")

    # Re-running the installer must also refresh the module URL when the local
    # harness source changed; remove any prior owner-only import first.
    text = "".join(
        line
        for line in text.splitlines(keepends=True)
        if "owner-test-harness-card.js?v=owner-" not in line
    )
    anchor = "const packageModules = Promise.all([\n"
    if anchor not in text:
        raise SystemExit("frontend.js packageModules anchor not found")
    text = text.replace(anchor, anchor + import_line, 1)
    frontend.write_text(text, encoding="utf-8")
    return token


def install(target: Path) -> None:
    source = Path(__file__).with_name("owner-test-harness-card.js")
    frontend = target / "frontend.js"
    strategy = target / "sv_dashboard.js"
    if not frontend.exists() or not strategy.exists():
        raise SystemExit(f"SV Dashboard static directory not found/complete: {target}")

    shutil.copy2(source, target / source.name)
    token = _patch_frontend(frontend, source)

    text = strategy.read_text(encoding="utf-8")
    if "ownerFixtureActive" not in text:
        if HERO_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js Hero anchor not found")
        text = text.replace(HERO_ANCHOR, HERO_PATCH, 1)
        strategy.write_text(text, encoding="utf-8")

    print(f"Owner test harness installed (module owner-{token}).")
    print("Profiles:")
    print("  ?sv_owner_fixture=phev")
    print("  ?sv_owner_fixture=phev-idle")
    print("  ?sv_owner_fixture=phev-driving")
    print("  ?sv_owner_fixture=phev-charging")
    print("  ?sv_owner_fixture=phev-stale")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--target",
        default="/config/custom_components/sv_dashboard/static",
        help="Installed SV Dashboard static directory",
    )
    args = parser.parse_args()
    install(Path(args.target))


if __name__ == "__main__":
    main()
