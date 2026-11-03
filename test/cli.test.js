import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");

function runCli(args, { cwd }) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
  });
  return result;
}

function withTempDir(files, run) {
  const dir = mkdtempSync(join(tmpdir(), "envguard-cli-"));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents, "utf8");
  }
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("exits 0 and prints a success message when env matches example", () => {
  withTempDir({ ".env.example": "FOO=\nBAR=", ".env": "FOO=1\nBAR=2" }, (dir) => {
    const result = runCli([], { cwd: dir });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /matches/);
  });
});

test("exits 1 and lists the missing key when .env is incomplete", () => {
  withTempDir({ ".env.example": "FOO=\nBAR=", ".env": "FOO=1" }, (dir) => {
    const result = runCli([], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Missing/);
    assert.match(result.stdout, /BAR/);
  });
});

test("exits 2 with a clear message when the example file is missing", () => {
  withTempDir({ ".env": "FOO=1" }, (dir) => {
    const result = runCli([], { cwd: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /File not found/);
  });
});

test("--format json prints a valid, parseable report", () => {
  withTempDir({ ".env.example": "FOO=", ".env": "" }, (dir) => {
    const result = runCli(["--format", "json"], { cwd: dir });
    assert.equal(result.status, 1); // FOO is missing
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.equal(report.findings[0].rule, "missing");
  });
});

test("--strict turns an undeclared-key warning into a failing exit code", () => {
  withTempDir({ ".env.example": "FOO=", ".env": "FOO=1\nSTRAY=2" }, (dir) => {
    const lenient = runCli([], { cwd: dir });
    const strict = runCli(["--strict"], { cwd: dir });
    assert.equal(lenient.status, 0);
    assert.equal(strict.status, 1);
  });
});

test("--ignore excludes the named keys from every check", () => {
  withTempDir({ ".env.example": "FOO=\nBAR=", ".env": "FOO=1" }, (dir) => {
    const result = runCli(["--ignore", "BAR"], { cwd: dir });
    assert.equal(result.status, 0);
  });
});

test("init writes .env.example from .env and refuses to overwrite it", () => {
  withTempDir({ ".env": "FOO=secret\nBAR=1" }, (dir) => {
    const first = runCli(["init"], { cwd: dir });
    assert.equal(first.status, 0);
    const written = readFileSync(join(dir, ".env.example"), "utf8");
    assert.equal(written, "FOO=\nBAR=\n");

    const second = runCli(["init"], { cwd: dir });
    assert.equal(second.status, 2);
    assert.match(second.stderr, /already exists/);
  });
});

test("multiple --env flags are each checked against the example", () => {
  withTempDir(
    {
      ".env.example": "FOO=",
      ".env": "FOO=1",
      ".env.test": "FOO=",
    },
    (dir) => {
      const result = runCli(["--env", ".env", "--env", ".env.test"], { cwd: dir });
      assert.equal(result.status, 0); // .env.test has FOO= (empty) -> a warning, not fatal
      const json = runCli(
        ["--env", ".env", "--env", ".env.test", "--format", "json"],
        { cwd: dir },
      );
      const report = JSON.parse(json.stdout);
      const files = new Set(report.findings.map((f) => f.file));
      assert.ok(files.has(".env.test"));
    },
  );
});

test("-h prints help and exits 0", () => {
  withTempDir({}, (dir) => {
    const result = runCli(["-h"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  });
});

test("-v prints the version and exits 0", () => {
  withTempDir({}, (dir) => {
    const result = runCli(["-v"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
  });
});

test("an unknown flag exits 2 with a usage error", () => {
  withTempDir({}, (dir) => {
    const result = runCli(["--nope"], { cwd: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown flag/);
  });
});

test("an .envguardrc.json config file is picked up with zero flags", () => {
  withTempDir(
    {
      ".env.example": "FOO=",
      ".env": "FOO=1\nSTRAY=2",
      ".envguardrc.json": JSON.stringify({ severity: { undeclared: "error" } }),
    },
    (dir) => {
      const result = runCli([], { cwd: dir });
      assert.equal(result.status, 1);
      assert.match(result.stdout, /STRAY/);
    },
  );
});
