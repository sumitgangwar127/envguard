# envguard

[![npm version](https://img.shields.io/npm/v/envguard?color=CB3837&logo=npm)](https://www.npmjs.com/package/envguard)
[![CI](https://github.com/sumitgangwar127/envguard/actions/workflows/ci.yml/badge.svg)](https://github.com/sumitgangwar127/envguard/actions/workflows/ci.yml)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-2ea44f)](package.json)
[![license: MIT](https://img.shields.io/npm/l/envguard)](LICENSE)

**Catch `.env` drift before it breaks someone's machine or your CI run.**

`envguard` checks a real env file against `.env.example` and flags keys
that are missing, undeclared, empty, still a placeholder (`changeme`), or
accidentally duplicated — in under 100 ms, with **zero runtime dependencies**.

```
$ envguard

✖ Missing (in example, not in env):
  - STRIPE_SECRET_KEY

⚠ Undeclared (in env, not in example):
  - OLD_FEATURE_FLAG

⚠ Placeholder-looking values:
  - DATABASE_URL=your-database-url-here
```

## Why

Someone adds `STRIPE_SECRET_KEY` to their code and their own `.env`, but
forgets `.env.example`. A teammate pulls the branch, the app crashes with a
cryptic runtime error, and they burn twenty minutes figuring out why.
`envguard` catches that in CI, before it reaches them.

## Install

```bash
npm install --save-dev envguard
```

Or run it without installing:

```bash
npx envguard
```

## Usage

```bash
envguard                                   # checks .env against .env.example
envguard --env .env.local --env .env.test  # check several files, one report
envguard --strict                          # treat warnings as failures too
envguard --ignore NODE_ENV,CI              # skip specific keys everywhere
envguard --format json                     # machine-readable output
envguard init                              # generate .env.example from .env
```

Exit codes: `0` nothing wrong · `1` a problem at error level (fails CI) ·
`2` usage error (bad flag, missing file).

### What it checks

| Check | Default | Meaning |
| --- | --- | --- |
| `missing` | error | Declared in `.env.example`, absent from the env file |
| `undeclared` | warning | In the env file, never declared in `.env.example` |
| `empty` | warning | `KEY=` with no value |
| `placeholder` | warning | Still looks unfilled — `changeme`, `your_api_key`, `<...>`, `xxxx`, `todo` |
| `duplicate` | warning | Same key defined twice in one file — the last one silently wins |

`--strict` turns every warning into an error, so `undeclared` / `empty` /
`placeholder` / `duplicate` fail the build too.

### Config file (optional)

Drop a `.envguardrc.json` in your project root so teammates and CI don't
need to remember flags:

```json
{
  "example": ".env.example",
  "env": [".env", ".env.local"],
  "ignore": ["NODE_ENV", "CI"],
  "severity": { "undeclared": "error", "empty": "off" }
}
```

CLI flags always win over the config file, which wins over the built-in
defaults. No config file is required — `envguard` works with zero setup.

### GitHub Actions

```yaml
- uses: sumitgangwar127/envguard@v1
  with:
    env: .env.example   # whatever you commit — see note below
    strict: "true"
```

Findings appear as inline `::error` / `::warning` annotations on the PR
diff. (Never check a real `.env` into CI — run envguard against your
`.env.example` plus a `.env.ci` built from repository secrets instead.) You
can also call the CLI directly inside any workflow:

```yaml
- run: npx envguard --format github
```

### As a library

```ts
import { parseEnv, buildReport } from "envguard";

const example = parseEnv(await readFile(".env.example", "utf8"));
const actual = parseEnv(await readFile(".env", "utf8"));

const report = buildReport(example, actual, { strict: true });
console.log(report.ok, report.findings);
```

See [DESIGN.md](./DESIGN.md) for the full architecture — `envguard`'s core
(`parse.ts`, `checks/`, `report.ts`) is pure and has no filesystem or
`process` dependency, so it's safe to reuse in other tools.

## Comparison

`envguard` does one thing: keep `.env` and `.env.example` in sync. It does
not load env vars into `process.env` (use [dotenv](https://www.npmjs.com/package/dotenv)
for that), scan for leaked secrets (use [gitleaks](https://github.com/gitleaks/gitleaks)),
or validate value *types* (use [zod](https://www.npmjs.com/package/zod) /
[envalid](https://www.npmjs.com/package/envalid) for that). It composes
cleanly with all three.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT © [Sumit Gangwar](https://github.com/sumitgangwar127)
