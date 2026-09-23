#!/usr/bin/env python3
"""Install the owner-only frontend fixture overlay into a local HA checkout.

Run after installing/updating the normal SV Dashboard candidate. The script is
idempotent and deliberately patches only the local installed static files.
Never copy these patched files back into custom_components/ in git.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import shutil

IMPORT_LINE = '  import("./owner-test-harness-card.js?v=owner-local"),\n'
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


def install(target: Path) -> None:
    source = Path(__file__).with_name("owner-test-harness-card.js")
    frontend = target / "frontend.js"
    strategy = target / "sv_dashboard.js"
    if not frontend.exists() or not strategy.exists():
        raise SystemExit(f"SV Dashboard static directory not found/complete: {target}")

    shutil.copy2(source, target / source.name)

    text = frontend.read_text(encoding="utf-8")
    if "owner-test-harness-card.js" not in text:
        anchor = "const packageModules = Promise.all([\n"
        if anchor not in text:
            raise SystemExit("frontend.js packageModules anchor not found")
        text = text.replace(anchor, anchor + IMPORT_LINE, 1)
        frontend.write_text(text, encoding="utf-8")

    text = strategy.read_text(encoding="utf-8")
    if "ownerFixtureActive" not in text:
        if HERO_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js Hero anchor not found")
        text = text.replace(HERO_ANCHOR, HERO_PATCH, 1)
        strategy.write_text(text, encoding="utf-8")

    print("Owner test harness installed.")
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
