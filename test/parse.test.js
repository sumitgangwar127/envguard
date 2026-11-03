import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../dist/parse.js";

test("parses simple KEY=value pairs", () => {
  const { entries, order } = parseEnv("FOO=bar\nBAZ=qux\n");
  assert.deepEqual(order, ["FOO", "BAZ"]);
  assert.equal(entries.get("FOO").value, "bar");
  assert.equal(entries.get("BAZ").value, "qux");
});

test("skips blank lines and full-line comments", () => {
  const { order } = parseEnv("\n# a comment\nFOO=bar\n\n#another\n");
  assert.deepEqual(order, ["FOO"]);
});

test("handles export prefix", () => {
  const { entries } = parseEnv("export FOO=bar");
  assert.equal(entries.get("FOO").value, "bar");
});

test("strips trailing unquoted comments", () => {
  const { entries } = parseEnv("FOO=bar # trailing comment");
  assert.equal(entries.get("FOO").value, "bar");
});

test("preserves # inside quoted values", () => {
  const { entries } = parseEnv('FOO="bar#baz"');
  assert.equal(entries.get("FOO").value, "bar#baz");
});

test("unquotes single and double quoted values", () => {
  const { entries } = parseEnv(`A="double"\nB='single'`);
  assert.equal(entries.get("A").value, "double");
  assert.equal(entries.get("B").value, "single");
});

test("treats KEY= as an empty value", () => {
  const { entries } = parseEnv("FOO=");
  assert.equal(entries.get("FOO").value, "");
});

test("last duplicate key wins, keeps first-seen order", () => {
  const { entries, order } = parseEnv("FOO=1\nBAR=2\nFOO=3\n");
  assert.deepEqual(order, ["FOO", "BAR"]);
  assert.equal(entries.get("FOO").value, "3");
});

test("ignores lines that are not KEY=value", () => {
  const { order } = parseEnv("this is not valid\nFOO=bar\n   \n");
  assert.deepEqual(order, ["FOO"]);
});

test("records 1-indexed line numbers", () => {
  const { entries } = parseEnv("# comment\nFOO=bar\nBAZ=qux");
  assert.equal(entries.get("FOO").line, 2);
  assert.equal(entries.get("BAZ").line, 3);
});
