# envguard: design & architecture

`envguard` keeps `.env` and `.env.example` in sync so drift gets caught before
it breaks a teammate's machine or a CI run — a key someone adds to `.env`
but forgets to add to `.env.example` (or vice versa).

## Goals

1. Detect drift between `.env.example` (the contract) and real env files.
2. Run in well under 100 ms, with **zero runtime dependencies**.
3. Be CI-first: clear exit codes, JSON output, GitHub Action annotations.
4. Be usable both as a CLI and as a library (`import { buildReport } from "envguard"`).

**Non-goals (v1):** loading env values into `process.env` (that's dotenv's
job), secret scanning, or value-level type validation (URL, number, etc.).

## Architecture

Three layers, one-way dependencies — nothing in `checks/` or `report.ts`
touches the filesystem, `process`, or `console`:

```
            ┌────────────────────────────────────────────┐
  CLI       │ cli.ts  : argv → Config → run → exit code   │
  (I/O)     └───────┬──────────────────────┬─────────────┘
                    │                      │
            ┌───────▼──────┐        ┌──────▼───────┐
  Sources   │ fs.readFile   │        │ reporters/   │  Output
  (read)    │ config.ts     │        │  text.ts     │  (write)
            │               │        │  json.ts     │
            │               │        │  github.ts   │  ::error annotations
            └───────┬──────┘        └──────▲───────┘
                    │ ParsedEnv            │ Report
            ┌───────▼──────────────────────┴───────┐
  Core      │ parse.ts → checks/* → report.ts        │  pure, no I/O
  (pure)    │   missing · undeclared · empty ·      │
            │   placeholder · duplicate             │
            └───────────────────────────────────────┘
```

- **Core is pure.** `parse.ts` turns raw text into a `ParsedEnv`; each file
  in `checks/` is a pure function `(example, actual, ctx) → RawFinding[]`;
  `report.ts` runs the enabled checks, attaches severity, and produces a
  `Report`. None of this touches disk — it's trivial to unit test and safe
  to reuse as a library.
- **Reporters** (`reporters/{text,json,github}.ts`) turn a `Report` into a
  string. They never decide pass/fail — that's `report.ok`, set once in
  `report.ts`.
- **cli.ts** is the only place that reads argv, touches the filesystem,
  writes to stdout/stderr, and calls `process.exit`.

## Data model

```ts
ParsedEnv  { entries: Map<string, EnvEntry>; order: string[];
             duplicates: Map<string, number[]> }
EnvEntry   { key; value; line }

RuleId     "missing" | "undeclared" | "empty" | "placeholder" | "duplicate"
Severity   "error" | "warn" | "off"

Finding    { rule: RuleId; key: string; severity: Severity; message: string;
             value?: string; line?: number; file?: string }

Report     { findings: Finding[]; ok: boolean; summary: Record<RuleId, number> }
```

Checks are pluggable: `CHECKS: Record<RuleId, Check>` in `checks/index.ts`.
Severity is resolved once, in `report.ts`, from (in order) a per-rule
override, `--strict` (which escalates every `warn` to `error`), then the
built-in default. A check never knows its own severity — it just reports
that something is true.

## Rules (v1)

| Rule | Default | Meaning |
| --- | --- | --- |
| `missing` | error | In `.env.example` but absent from the env file |
| `undeclared` | warn | In the env file but not declared in `.env.example` |
| `empty` | warn | `KEY=` with no value |
| `placeholder` | warn | Value still looks unfilled (`changeme`, `your_*`, `<...>`, `xxxx`, `todo`) |
| `duplicate` | warn | Same key defined twice in one file (last one silently wins) |

## CLI surface

```
envguard [check] [options]     # default command
envguard init [options]        # generate .env.example from .env

--env <path>        repeatable; each file is checked independently (default: .env)
--example <path>    (default: .env.example)
--ignore <keys>     comma-separated, repeatable
--strict            escalate every warning to an error
--format text|json|github
--config <path>     explicit .envguardrc.json path
-v / -h
```

Exit codes: `0` nothing at error level · `1` something at error level ·
`2` usage or I/O error (bad flag, missing file, bad config).

## Config: `.envguardrc.json`

```json
{
  "example": ".env.example",
  "env": [".env", ".env.local"],
  "ignore": ["NODE_ENV", "CI"],
  "severity": { "undeclared": "error", "empty": "off" }
}
```

Precedence: **CLI flags > config file > built-in defaults.** Zero config
always works — `config.ts`'s `loadConfig()` returns `{}` when no
`.envguardrc.json` exists and none was explicitly requested.

## Integrations

- **GitHub Action**: `envguard --format github` prints `::error`/`::warning`
  workflow commands, so findings show up as inline PR annotations.
- **Pre-commit / husky**: `envguard --strict` as a commit hook.
- **Library**: `import { buildReport, parseEnv } from "envguard"`.

## Roadmap

- **v0.1** (this release): all five checks, `init`, three reporters, config
  file, multi-file `--env`, full test suite, CI.
- **v0.2**: `sync` command (append missing keys to `.env` as `KEY=`),
  published `action.yml`, docs site.
- **v0.3**: `# @required` annotations in `.env.example`, `--from-process`
  to check the real environment (not just a file) in containers/CI.
