import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, resolveOptions } from "../dist/config.js";

function withTempDir(run) {
  const dir = mkdtempSync(join(tmpdir(), "envguard-config-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    run(dir);
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
}

test("loadConfig returns {} when no config file exists and none was requested", () => {
  withTempDir(() => {
    assert.deepEqual(loadConfig(), {});
  });
});

test("loadConfig throws when an explicitly-named config file is missing", () => {
  withTempDir(() => {
    assert.throws(() => loadConfig("missing.json"), /not found/i);
  });
});

test("loadConfig reads and parses .envguardrc.json by default", () => {
  withTempDir((dir) => {
    writeFileSync(
      join(dir, ".envguardrc.json"),
      JSON.stringify({ example: ".env.sample", ignore: ["CI"] }),
    );
    const config = loadConfig();
    assert.equal(config.example, ".env.sample");
    assert.deepEqual(config.ignore, ["CI"]);
  });
});

test("loadConfig rejects invalid JSON with a helpful message", () => {
  withTempDir((dir) => {
    writeFileSync(join(dir, ".envguardrc.json"), "{ not json");
    assert.throws(() => loadConfig(), /not valid JSON/i);
  });
});

test("loadConfig rejects a config that isn't a JSON object", () => {
  withTempDir((dir) => {
    writeFileSync(join(dir, ".envguardrc.json"), "[1,2,3]");
    assert.throws(() => loadConfig(), /must contain a JSON object/i);
  });
});

test("resolveOptions: CLI flags win over config, which wins over defaults", () => {
  const resolved = resolveOptions(
    { example: "from-cli.env" },
    { example: "from-config.env", ignore: ["FROM_CONFIG"] },
  );
  assert.equal(resolved.example, "from-cli.env");
  assert.deepEqual(resolved.ignore, ["FROM_CONFIG"]);
});

test("resolveOptions falls back to built-in defaults when nothing is set", () => {
  const resolved = resolveOptions({}, {});
  assert.equal(resolved.example, ".env.example");
  assert.deepEqual(resolved.env, [".env"]);
  assert.equal(resolved.strict, false);
});

test("resolveOptions merges severity maps, CLI keys overriding config keys", () => {
  const resolved = resolveOptions(
    { severity: { empty: "error" } },
    { severity: { empty: "off", undeclared: "error" } },
  );
  assert.deepEqual(resolved.severity, { empty: "error", undeclared: "error" });
});
