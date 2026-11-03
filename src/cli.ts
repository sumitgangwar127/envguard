#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseEnv } from "./parse.js";
import { buildReport } from "./report.js";
import { formatText, formatJson, formatGithub } from "./reporters/index.js";
import { loadConfig, resolveOptions } from "./config.js";
import type { Report, RuleId, Severity } from "./types.js";

const VERSION = "0.1.0";
type Format = "text" | "json" | "github";

interface Flags {
  command: "check" | "init";
  env: string[];
  example?: string;
  ignore: string[];
  strict: boolean;
  format: Format;
  config?: string;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = {
    command: "check",
    env: [],
    ignore: [],
    strict: false,
    format: "text",
    help: false,
    version: false,
  };

  let sawCommand = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (!sawCommand && !arg.startsWith("-")) {
      if (arg === "init" || arg === "check") {
        flags.command = arg;
      } else {
        fail(`Unknown command: ${arg}\nRun "envguard --help" for usage.`);
      }
      sawCommand = true;
      continue;
    }

    switch (arg) {
      case "--env":
        flags.env.push(requireValue(argv, ++i, "--env"));
        break;
      case "--example":
        flags.example = requireValue(argv, ++i, "--example");
        break;
      case "--ignore":
        flags.ignore.push(
          ...requireValue(argv, ++i, "--ignore")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
        break;
      case "--strict":
        flags.strict = true;
        break;
      case "--format":
        flags.format = requireFormat(requireValue(argv, ++i, "--format"));
        break;
      case "--json": // alias for --format json, kept for convenience
        flags.format = "json";
        break;
      case "--config":
        flags.config = requireValue(argv, ++i, "--config");
        break;
      case "--no-color":
        // Accepted for compatibility with CI scripts; output has no color codes yet.
        break;
      case "--init": // deprecated alias for the `init` command
        flags.command = "init";
        break;
      case "-h":
      case "--help":
        flags.help = true;
        break;
      case "-v":
      case "--version":
        flags.version = true;
        break;
      default:
        fail(`Unknown flag: ${arg}\nRun "envguard --help" for usage.`);
    }
  }

  return flags;
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (value === undefined) fail(`Missing value for ${flag}`);
  return value;
}

function requireFormat(value: string): Format {
  if (value === "text" || value === "json" || value === "github") return value;
  fail(`Invalid --format "${value}". Expected one of: text, json, github.`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const HELP = `envguard — keep .env and .env.example in sync

Usage:
  envguard [check] [options]
  envguard init [options]

Commands:
  check (default)    Compare env file(s) against the example file
  init               Generate .env.example from an env file and exit

Options:
  --env <path>        Path to a real env file (repeatable)   (default: .env)
  --example <path>    Path to the example env file            (default: .env.example)
  --ignore <keys>     Comma-separated keys to skip, repeatable (default: none)
  --strict            Treat every warning as an error
  --format <fmt>       text | json | github                   (default: text)
  --json               Shorthand for --format json
  --config <path>      Path to a .envguardrc.json config file
  -v, --version         Print the version number
  -h, --help            Print this message

Exit codes:
  0  no error-level findings
  1  at least one error-level finding
  2  usage error (bad flags, missing file, bad config, etc.)

Examples:
  envguard
  envguard --env .env.local --env .env.test --example .env.example
  envguard --strict --ignore NODE_ENV,CI
  envguard --format github   # for use inside a GitHub Actions workflow
  envguard init
`;

function readFileOrFail(path: string): string {
  if (!existsSync(path)) fail(`File not found: ${path}`);
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(`Could not read ${path}: ${message}`);
  }
}

function runInit(envPath: string, examplePath: string): void {
  if (!existsSync(envPath)) fail(`Cannot run init: ${envPath} does not exist.`);
  if (existsSync(examplePath)) {
    fail(
      `${examplePath} already exists. Remove it first if you want envguard to regenerate it.`,
    );
  }
  const parsed = parseEnv(readFileSync(envPath, "utf8"));
  const lines = parsed.order.map((key) => `${key}=`);
  writeFileSync(examplePath, lines.join("\n") + "\n", "utf8");
  console.log(
    `Wrote ${examplePath} with ${parsed.order.length} key${parsed.order.length === 1 ? "" : "s"} (values stripped).`,
  );
}

/** Merges one Report per env file into a single Report, tagging each finding with its source file. */
function mergeReports(reports: Array<{ file: string; report: Report }>): Report {
  const findings = reports.flatMap(({ file, report }) =>
    report.findings.map((f) => ({ ...f, file: f.file ?? file })),
  );
  const summary: Record<RuleId, number> = {
    missing: 0,
    undeclared: 0,
    empty: 0,
    placeholder: 0,
    duplicate: 0,
  };
  for (const f of findings) summary[f.rule]++;
  return { findings, ok: findings.every((f) => f.severity !== "error"), summary };
}

export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseArgs(argv);

  if (flags.help) return console.log(HELP);
  if (flags.version) return console.log(VERSION);

  let fileConfig;
  try {
    fileConfig = loadConfig(flags.config);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  const severity: Partial<Record<RuleId, Severity>> = fileConfig.severity ?? {};
  const resolved = resolveOptions(
    {
      example: flags.example,
      env: flags.env,
      ignore: flags.ignore,
      strict: flags.strict || undefined,
      severity,
    },
    fileConfig,
  );

  if (flags.command === "init") {
    runInit(resolved.env[0]!, resolved.example);
    return;
  }

  const example = parseEnv(readFileOrFail(resolved.example));
  const perFile = resolved.env.map((envPath) => ({
    file: envPath,
    report: buildReport(example, parseEnv(readFileOrFail(envPath)), {
      ignore: resolved.ignore,
      severity: resolved.severity,
      strict: resolved.strict,
    }),
  }));
  const report = mergeReports(perFile);

  if (flags.format === "json") {
    console.log(formatJson(report));
  } else if (flags.format === "github") {
    process.stdout.write(formatGithub(report, resolved.env[0]!));
  } else {
    process.stdout.write(
      formatText(report, { env: resolved.env.join(", "), example: resolved.example }),
    );
  }

  if (!report.ok) process.exitCode = 1;
}

/**
 * True when this module was run directly (`node cli.js` / the installed
 * `envguard` bin), as opposed to merely imported (e.g. by the test suite).
 * `process.argv[1]` is resolved with realpathSync before comparing, because
 * npm installs the bin as a symlink (`node_modules/.bin/envguard`) — Node
 * resolves that symlink when computing `import.meta.url` but leaves
 * `process.argv[1]` as the symlink path, so a naive string comparison
 * never matches and the CLI would silently do nothing when run the exact
 * way a real install invokes it (`npx envguard`, or the bin directly).
 */
function isDirectRun(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
