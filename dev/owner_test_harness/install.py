#!/usr/bin/env python3
"""Install the owner-only whole-dashboard PHEV fixture overlay.

The installer always starts from the canonical frontend/Strategy files in the
same repository checkout. This prevents patch-on-patch accumulation. It refuses
to mix repository and installed package versions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
import shutil

OWNER_CONTEXT_ANCHOR = '''    const strategyConfig = config?.strategy?.options ?? config?.strategy ?? config ?? {};
    return SvDashboardStrategy.generate(strategyConfig, hass);
'''
OWNER_CONTEXT_PATCH = '''    const strategyConfig = config?.strategy?.options ?? config?.strategy ?? config ?? {};
    const ownerHarness = typeof window !== "undefined"
      ? window.__svDashboardOwnerHarness
      : null;
    const ownerProfile = ownerHarness?.activeProfile?.() || "";
    const ownerHarnessAvailable = Boolean(
      ownerHarness
      && typeof ownerHarness.fixtureHass === "function"
      && typeof ownerHarness.decorateDashboard === "function"
      && typeof customElements !== "undefined"
      && customElements.get(ownerHarness.selectorTag)
      && customElements.get(ownerHarness.contextTag)
    );
    const generationHass = ownerHarnessAvailable && ownerProfile
      ? ownerHarness.fixtureHass(hass, strategyConfig.entry_id, ownerProfile)
      : hass;
    const dashboard = await SvDashboardStrategy.generate(strategyConfig, generationHass);
    return ownerHarnessAvailable
      ? ownerHarness.decorateDashboard(dashboard, strategyConfig.entry_id, ownerProfile)
      : dashboard;
'''

OWNER_READY_ANCHOR = '''    if (readiness && typeof readiness.then === "function") {
      await readiness;
    }
'''
OWNER_READY_PATCH = '''    if (readiness && typeof readiness.then === "function") {
      await readiness;
    }
    const ownerHarnessReady = typeof window !== "undefined"
      ? window.__svDashboardOwnerHarnessReady
      : null;
    if (ownerHarnessReady && typeof ownerHarnessReady.then === "function") {
      await ownerHarnessReady;
    }
'''


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


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _version(path: Path) -> str:
    return str(json.loads(path.read_text(encoding="utf-8"))["version"])


def _reset_product_static(target: Path) -> None:
    root = _repo_root()
    source_static = root / "custom_components" / "sv_dashboard" / "static"
    repo_manifest = root / "custom_components" / "sv_dashboard" / "manifest.json"
    installed_manifest = target.parent / "manifest.json"
    if not installed_manifest.exists():
        raise SystemExit(f"Installed manifest missing: {installed_manifest}")
    repo_version = _version(repo_manifest)
    installed_version = _version(installed_manifest)
    if repo_version != installed_version:
        raise SystemExit(
            f"Version mismatch: repository={repo_version}, installed={installed_version}. "
            "Install the exact product candidate before applying the owner harness."
        )
    for name in ("frontend.js", "sv_dashboard.js"):
        shutil.copy2(source_static / name, target / name)
    shutil.copy2(
        root / "custom_components" / "sv_dashboard" / "const.py",
        target.parent / "const.py",
    )


def _patch_frontend_resource_version(integration_root: Path, token: str) -> str:
    """Give the locally patched frontend entry point its own resource URL."""
    manifest = integration_root / "manifest.json"
    constants = integration_root / "const.py"
    product_version = _version(manifest)
    owner_version = f"{product_version}-owner-{token}"

    text = constants.read_text(encoding="utf-8")
    pattern = re.compile(r'^FRONTEND_VERSION = "[^"]+"$', re.MULTILINE)
    text, count = pattern.subn(
        f'FRONTEND_VERSION = "{owner_version}"',
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit("const.py FRONTEND_VERSION anchor not found")
    constants.write_text(text, encoding="utf-8")
    return owner_version


def _owner_token(source: Path) -> str:
    digest = hashlib.sha256()
    digest.update(source.read_bytes())
    digest.update(Path(__file__).read_bytes())
    return digest.hexdigest()[:12]


def _patch_frontend(frontend: Path, token: str) -> None:
    anchor = "installTransparentMapMarkerCompatibility();\n"
    if anchor not in frontend.read_text(encoding="utf-8"):
        raise SystemExit("frontend.js compatibility bootstrap anchor not found")
    import_block = f'''/* OWNER-HARNESS-IMPORT-BEGIN */
window.__svDashboardOwnerHarnessReady = import("./owner-test-harness-card.js?v=owner-{token}")
  .then(() => true)
  .catch((error) => {{
    console.error("[SV Dashboard owner harness] local module failed to load", error);
    return false;
  }});
/* OWNER-HARNESS-IMPORT-END */
'''
    text = frontend.read_text(encoding="utf-8").replace(anchor, anchor + "\n" + import_block, 1)

    # The owner harness also patches sv_dashboard.js locally. The production
    # Strategy import may keep an older content/version key when the product
    # Strategy itself did not change, so reusing that URL can make the browser
    # execute a cached unpatched Strategy and silently hide the selector.
    # Give the locally patched Strategy its own content-addressed module URL.
    strategy_import_pattern = re.compile(
        r'await import\("\./sv_dashboard\.js\?v=[^"]+"\);'
    )
    replacement = f'await import("./sv_dashboard.js?v=owner-{token}");'
    text, count = strategy_import_pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("frontend.js Strategy import anchor not found")

    frontend.write_text(text, encoding="utf-8")


def install(target: Path) -> None:
    source = Path(__file__).with_name("owner-test-harness-card.js")
    frontend = target / "frontend.js"
    strategy = target / "sv_dashboard.js"
    if not frontend.exists() or not strategy.exists():
        raise SystemExit(f"SV Dashboard static directory not found/complete: {target}")

    _reset_product_static(target)
    shutil.copy2(source, target / source.name)
    token = _owner_token(source)
    _patch_frontend(frontend, token)
    owner_frontend_version = _patch_frontend_resource_version(target.parent, token)

    text = strategy.read_text(encoding="utf-8")
    if OWNER_READY_ANCHOR not in text:
        raise SystemExit("sv_dashboard.js generateDashboard readiness anchor not found")
    text = text.replace(OWNER_READY_ANCHOR, OWNER_READY_PATCH, 1)
    if OWNER_CONTEXT_ANCHOR not in text:
        raise SystemExit("sv_dashboard.js Strategy generation anchor not found")
    text = text.replace(OWNER_CONTEXT_ANCHOR, OWNER_CONTEXT_PATCH, 1)

    # Keep the selector injection on the proven beta.30/beta.31 path: patch it
    # directly into the generated Vehicle/LIVE layout before the Hero. The
    # whole-dashboard decorator remains responsible only for fixture context.
    if "const ownerTestSelector = {" not in text:
        if SELECTOR_DECL_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js overviewSections anchor not found")
        if SELECTOR_CARD_ANCHOR not in text:
            raise SystemExit("sv_dashboard.js LIVE card anchor not found")
        text = text.replace(SELECTOR_DECL_ANCHOR, SELECTOR_DECL_PATCH, 1)
        text = text.replace(SELECTOR_CARD_ANCHOR, SELECTOR_CARD_PATCH, 1)

    strategy.write_text(text, encoding="utf-8")

    print(f"Owner whole-dashboard PHEV harness installed (module owner-{token}).")
    print(f"Owner frontend resource version: {owner_frontend_version}")
    print(
        "Full Home Assistant restart required so Lovelace registers "
        "the owner-specific frontend resource URL."
    )
    print("The generated Vehicle view contains the Owner-Testmodus selector.")
    print("Fixture profiles:")
    for profile in ("phev", "phev-fresh", "phev-idle", "phev-driving", "phev-charging", "phev-stale"):
        print(f"  ?sv_owner_fixture={profile}")


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
