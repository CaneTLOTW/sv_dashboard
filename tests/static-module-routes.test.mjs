import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const componentRoot = new URL("../custom_components/sv_dashboard/", import.meta.url);
const staticDir = new URL("static/", componentRoot);
const init = fs.readFileSync(new URL("__init__.py", componentRoot), "utf8");

test("every bundled JavaScript module is exposed through the SV static route", () => {
  assert.match(init, /static_dir\.glob\("\*\.js"\)/);
  assert.match(init, /for filename in static_paths/);

  const bundled = fs.readdirSync(staticDir).filter((name) => name.endsWith(".js"));
  const bundledSet = new Set(bundled);
  const relativeImport = /(?:from\s+|import\s*\()\s*["']\.\/([^"'?]+\.js)(?:\?[^"']*)?["']/g;

  for (const filename of bundled) {
    const source = fs.readFileSync(new URL(filename, staticDir), "utf8");
    for (const match of source.matchAll(relativeImport)) {
      assert.ok(
        bundledSet.has(match[1]),
        `${filename} imports missing bundled module ${match[1]}`,
      );
    }
  }
});
