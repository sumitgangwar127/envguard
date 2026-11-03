import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../dist/parse.js";
import { buildReport } from "../dist/report.js";

test("buildReport is ok with no findings", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1");
  const report = buildReport(example, actual);
  assert.equal(report.ok, true);
  assert.deepEqual(report.findings, []);
  assert.equal(report.summary.missing, 0);
});

test("missing is an error by default; undeclared/empty/placeholder are warnings", () => {
  const example = parseEnv("FOO=\nBAR=");
  const actual = parseEnv("BAZ=\nQUX=changeme");
  const report = buildReport(example, actual);

  assert.equal(report.ok, false); // "missing" present -> error -> not ok
  const bySeverity = Object.fromEntries(
    report.findings.map((f) => [f.rule, f.severity]),
  );
  assert.equal(bySeverity.missing, "error");
  assert.equal(bySeverity.undeclared, "warn");
  assert.equal(bySeverity.empty, "warn");
});

test("strict escalates every warning to an error", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1\nSECRET=shh"); // SECRET is only "undeclared" (a warning)
  const normal = buildReport(example, actual);
  const strict = buildReport(example, actual, { strict: true });

  assert.equal(normal.ok, true);
  assert.equal(strict.ok, false);
  assert.equal(strict.findings[0].severity, "error");
});

test("severity: 'off' disables a rule entirely", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1\nSECRET=shh");
  const report = buildReport(example, actual, {
    severity: { undeclared: "off" },
  });
  assert.deepEqual(report.findings, []);
  assert.equal(report.summary.undeclared, 0);
});

test("severity overrides can turn a warning into an error without --strict", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=");
  const report = buildReport(example, actual, { severity: { empty: "error" } });
  assert.equal(report.ok, false);
  assert.equal(report.findings[0].severity, "error");
});

test("detects duplicate keys within the actual env file", () => {
  const example = parseEnv("FOO=");
  const actual = parseEnv("FOO=1\nFOO=2");
  const report = buildReport(example, actual);
  const dup = report.findings.find((f) => f.rule === "duplicate");
  assert.ok(dup, "expected a duplicate finding");
  assert.equal(dup.key, "FOO");
  assert.match(dup.message, /lines 1, 2/);
});

test("rules option restricts which checks run", () => {
  const example = parseEnv("FOO=\nBAR=");
  const actual = parseEnv("FOO=1\nFOO=1\nSECRET=shh"); // would trigger duplicate + undeclared + missing
  const report = buildReport(example, actual, { rules: ["missing"] });
  assert.deepEqual(
    report.findings.map((f) => f.rule),
    ["missing"],
  );
});

test("ignore list applies across every rule", () => {
  const example = parseEnv("FOO=\nBAR=");
  const actual = parseEnv("BAR=1\nFOO=\nFOO=changeme-ish"); // FOO duplicated + bad value, both ignored
  const report = buildReport(example, actual, { ignore: ["FOO"] });
  assert.deepEqual(report.findings, []);
});
