import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const allowedHistoricalProductName = new Set([
  "README.md",
  "CHANGELOG.md",
  "docs/CONCEPT.md",
  "docs/INSTALLATION.en.md",
]);

function collect(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if ([".git", "custom_components", "tests", ".github/workflows"].includes(relative)) continue;
      collect(full, result);
    } else if (/\.(md|yml|yaml|json)$/.test(entry.name)) {
      result.push(full);
    }
  }
  return result;
}

test("repository-facing docs do not present e-C3 Dashboard as the active product", () => {
  for (const file of collect(root)) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    const text = fs.readFileSync(file, "utf8");
    if (!allowedHistoricalProductName.has(relative)) {
      assert.doesNotMatch(text, /e-C3 Dashboard/i, `stale product name in ${relative}`);
      assert.doesNotMatch(text, /e_c3_dashboard/i, `stale integration domain in ${relative}`);
    }
  }
});

test("active documentation does not claim the old two-language matrix", () => {
  for (const file of collect(path.join(root, "docs"))) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    const text = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(text, /supports German \(`de`\) and English \(`en`\)/i, `stale language claim in ${relative}`);
    assert.doesNotMatch(text, /German and English strings are present/i, `stale release language gate in ${relative}`);
  }
});
