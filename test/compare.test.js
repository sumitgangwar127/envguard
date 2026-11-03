import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../dist/parse.js";
import { compareEnv } from "../dist/compare.js";

test("reports ok when env matches example exactly", () => {
  const example = parseEnv("FOO=\nBAR=");
  const actual = parseEnv("FOO=1\nBAR=2");
  const result = compareEnv(example, actual);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.undeclared, []);
});

test("flags keys declared in example but missing from env", () => {
  const example = parseEnv("FOO=\nBAR=");
  const actual = parseEnv("FOO=1");
  const result = compareEnv(example, actual);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["BAR"]);
});

test("flags keys present in env but not declared in example", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1\nSECRET=shh");
  const result = compareEnv(example, actual);
  assert.deepEqual(result.undeclared, ["SECRET"]);
});

test("flags empty values in env", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=");
  const result = compareEnv(example, actual);
  assert.deepEqual(result.empty, ["FOO"]);
  assert.equal(result.ok, false);
});

test("flags placeholder-looking values", () => {
  const example = parseEnv("API_KEY=\nURL=\nTOKEN=");
  const actual = parseEnv(
    "API_KEY=changeme\nURL=your-url-here\nTOKEN=xxxxxxxx",
  );
  const result = compareEnv(example, actual);
  const flagged = result.placeholder.map((p) => p.key).sort();
  assert.deepEqual(flagged, ["API_KEY", "TOKEN", "URL"]);
});

test("does not flag a normal-looking secret as a placeholder", () => {
  const example = parseEnv("API_KEY=");
  const actual = parseEnv("API_KEY=sk_live_51Hq8x9JYZ3abc");
  const result = compareEnv(example, actual);
  assert.deepEqual(result.placeholder, []);
});

test("respects the ignore list for missing and undeclared checks", () => {
  const example = parseEnv("FOO=\nNODE_ENV=");
  const actual = parseEnv("FOO=1\nCI=true");
  const result = compareEnv(example, actual, { ignore: ["NODE_ENV", "CI"] });
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.undeclared, []);
});

test("custom placeholder patterns override the defaults", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=changeme");
  const result = compareEnv(example, actual, { placeholderPatterns: [/^nope$/] });
  assert.deepEqual(result.placeholder, []);
});
