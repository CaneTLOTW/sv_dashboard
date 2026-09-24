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

SELECTOR_DECL_ANCHOR = "    const overviewSections = [\n"
SELECTOR_DECL_PATCH = '''    const ownerTestSelector = {
      type: "custom:sv-dashboard-owner-test-selector-card",
      entry_id: attributes.entry_id,
      grid_options: { columns: "full", rows: 1 },
    };

    const overviewSections = [
'''
SELECTOR_CARD_ANCHOR = '        separator(strings.live, "mdi:car-connected"),\n        hero,\n'
SELECTOR_CARD_PATCH = '        separator(strings.live, "mdi:car-connected"),\n        ownerTestSelector,\n        hero,\n'

OWNER_READY_ANCHOR = '''  static async generateDashboard({ hass, config }) {
    const readiness = typeof window !== "undefined"
      ? window.__svDashboardDependencyReadiness
      : null;
    if (readiness && typeof readiness.then === "function") {
      await readiness;
    }
'''
OWNER_READY_PATCH = '''  static async generateDashboard({ hass, config }) {
    const readiness = typeof window !== "undefined"
      ? window.__svDashboardDependencyReadiness
      : null;
    if (readiness && typeof readiness.then === "function") {
      await readiness;
    }
    const ownerHarnessReady = typeof window !== "undefined"
      ? window.__svDashboardOwnerHarnessReady
      : null;
    if (ownerHarnessReady && typeof ownerHarnessReady.then === "function") {
      await ownerHarnessReady;
    }
'''



def _patch_frontend(frontend: Path, source: Path) -> str:
    token = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    marker_begin = "/* OWNER-HARNESS-IMPORT-BEGIN */"
    marker_end = "/* OWNER-HARNESS-IMPORT-END */"
    text = frontend.read_text(encoding="utf-8")

    # Re-running the installer must refresh the local module URL and must also
    # clean up the older beta.31 overlay form that inserted the harness import
    # into the critical packageModules Promise.all.
    if marker_begin in text and marker_end in text:
        before, remainder = text.split(marker_begin, 1)
        _, after = remainder.split(marker_end, 1)
        text = before + after.lstrip("\n")
    text = "".join(
        line
        for line in text.splitlines(keepends=True)
        if "owner-test-harness-card.js?v=owner-" not in line
    )

    anchor = "installTransparentMapMarkerCompatibility();\n"
    if anchor not in text:
        raise SystemExit("frontend.js compatibility bootstrap anchor not found")

    # Do not await this promise at frontend top level: the production Strategy
    # must still register immediately. The locally patched Strategy awaits the
    # promise inside generateDashboard(), where it is safe to do so.
    import_block = f'''{marker_begin}
window.__svDashboardOwnerHarnessReady = import("./owner-test-harness-card.js?v=owner-{token}")
  .then(() => true)
  .catch((error) => {{
    console.error("[SV Dashboard owner harness] local module failed to load", error);
    return false;
  }});
{marker_end}
'''
    text = text.replace(anchor, anchor + "\n" + import_block, 1)
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

    if "__svDashboardOwnerHarnessReady" not in text:
        if OWNER_READY_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js generateDashboard readiness anchor not found")
        text = text.replace(OWNER_READY_ANCHOR, OWNER_READY_PATCH, 1)

    if "ownerFixtureActive" not in text:
        if HERO_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js Hero anchor not found")
        text = text.replace(HERO_ANCHOR, HERO_PATCH, 1)

    if "ownerTestSelector" not in text:
        if SELECTOR_DECL_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js overviewSections anchor not found")
        if SELECTOR_CARD_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js LIVE card anchor not found")
        text = text.replace(SELECTOR_DECL_ANCHOR, SELECTOR_DECL_PATCH, 1)
        text = text.replace(SELECTOR_CARD_ANCHOR, SELECTOR_CARD_PATCH, 1)

    # If the owner module failed to register, degrade to the normal product
    # dashboard instead of rendering an unknown custom card.
    text = text.replace(
        '    const ownerFixtureActive = Boolean(ownerFixture);\n',
        '    const ownerHarnessAvailable = typeof customElements !== "undefined"'
        ' && Boolean(customElements.get("sv-dashboard-owner-test-harness-card"))'
        ' && Boolean(customElements.get("sv-dashboard-owner-test-selector-card"));\n'
        '    const ownerFixtureActive = ownerHarnessAvailable && Boolean(ownerFixture);\n',
        1,
    )
    text = text.replace(
        '    const ownerTestSelector = {\n',
        '    const ownerTestSelector = ownerHarnessAvailable ? {\n',
        1,
    )
    text = text.replace(
        '      grid_options: { columns: "full", rows: 1 },\n    };\n\n    const overviewSections = [\n',
        '      grid_options: { columns: "full", rows: 1 },\n    } : null;\n\n    const overviewSections = [\n',
        1,
    )

    strategy.write_text(text, encoding="utf-8")

    print(f"Owner test harness installed (module owner-{token}).")
    print("Full Home Assistant restart required before using the fixture URLs.")
    print("The generated LIVE view now contains an Owner-Testmodus selector.")
    print("URL profiles remain supported:")
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
