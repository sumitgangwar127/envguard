import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../dist/parse.js";
import { buildReport } from "../dist/report.js";
import { formatText } from "../dist/reporters/text.js";
import { formatJson } from "../dist/reporters/json.js";
import { formatGithub } from "../dist/reporters/github.js";

function sampleReport() {
  const example = parseEnv("FOO=\nBAR=");
  const actual = parseEnv("BAR=changeme");
  return buildReport(example, actual);
}

test("formatText prints a success line when ok", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1");
  const report = buildReport(example, actual);
  const text = formatText(report, { env: ".env", example: ".env.example" });
  assert.match(text, /matches/);
});

test("formatText groups findings under rule headings", () => {
  const text = formatText(sampleReport());
  assert.match(text, /Missing/);
  assert.match(text, /Placeholder/);
  assert.match(text, /FOO/);
  assert.match(text, /BAR=changeme/);
});

test("formatJson round-trips the report structure", () => {
  const report = sampleReport();
  const parsed = JSON.parse(formatJson(report));
  assert.equal(parsed.ok, report.ok);
  assert.equal(parsed.findings.length, report.findings.length);
});

test("formatGithub emits one workflow command per finding", () => {
  const report = sampleReport();
  const out = formatGithub(report, ".env");
  const lines = out.trim().split("\n");
  assert.equal(lines.length, report.findings.length);
  assert.ok(lines.some((l) => l.startsWith("::error file=.env")));
  assert.ok(lines.some((l) => l.startsWith("::warning file=.env")));
});

test("formatGithub returns an empty string when there are no findings", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1");
  const report = buildReport(example, actual);
  assert.equal(formatGithub(report, ".env"), "");
});

test("formatGithub escalates to '::error' when severity is overridden", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=");
  const report = buildReport(example, actual, { severity: { empty: "error" } });
  const out = formatGithub(report, ".env");
  const lines = out.trim().split("\n");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^::error file=\.env,line=1::/);
});
