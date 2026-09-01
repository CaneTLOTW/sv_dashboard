import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const languages = ["de", "en", "fr", "it", "es", "pt", "nl", "da", "nb", "sv", "fi", "pl", "cs", "sk", "hu", "ro", "sl", "hr"];

const load = (path) => JSON.parse(fs.readFileSync(new URL(path, root), "utf8"));

function leaves(value, prefix = "", result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) leaves(child, path, result);
    else result.set(path, child);
  }
  return result;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

const strings = load("strings.json");
const english = load("translations/en.json");
const canonical = leaves(english);

test("HA canonical strings and English translation expose identical leaves", () => {
  const source = leaves(strings);
  assert.deepEqual([...source.keys()].sort(), [...canonical.keys()].sort());
  for (const [path, value] of canonical) {
    assert.equal(typeof value, "string", `non-string English leaf ${path}`);
    assert.ok(value.trim(), `empty English leaf ${path}`);
    assert.deepEqual(placeholders(source.get(path)), placeholders(value), `placeholder mismatch strings/en at ${path}`);
  }
});

test("all 18 HA catalogs cover config, options and entities with valid placeholders", () => {
  for (const language of languages) {
    const catalog = leaves(load(`translations/${language}.json`));
    assert.deepEqual([...catalog.keys()].sort(), [...canonical.keys()].sort(), `${language} HA key mismatch`);
    for (const [path, englishValue] of canonical) {
      const value = catalog.get(path);
      assert.equal(typeof value, "string", `non-string ${language}:${path}`);
      assert.ok(value.trim(), `empty ${language}:${path}`);
      assert.deepEqual(placeholders(value), placeholders(englishValue), `${language}:${path} placeholder mismatch`);
    }
  }
});

test("all HA menu surfaces are represented in every catalog", () => {
  const requiredPrefixes = ["config.step.", "config.error.", "config.abort.", "options.step.", "entity."];
  for (const language of languages) {
    const keys = [...leaves(load(`translations/${language}.json`)).keys()];
    for (const prefix of requiredPrefixes) {
      assert.ok(keys.some((key) => key.startsWith(prefix)), `${language} missing ${prefix}`);
    }
  }
});
