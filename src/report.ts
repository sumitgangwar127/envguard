import type { ParsedEnv } from "./parse.js";
import { CHECKS, DEFAULT_PLACEHOLDER_PATTERNS } from "./checks/index.js";
import {
  ALL_RULES,
  DEFAULT_SEVERITY,
  type Finding,
  type Report,
  type RuleId,
  type Severity,
} from "./types.js";

export interface ReportOptions {
  /** Keys to exclude from every check (e.g. "NODE_ENV"). */
  ignore?: readonly string[];
  /** Override the regexes used by the "placeholder" check. */
  placeholderPatterns?: readonly RegExp[];
  /** Per-rule severity overrides. "off" disables a rule entirely. */
  severity?: Partial<Record<RuleId, Severity>>;
  /** When true, every "warn" finding is reported as "error" instead. */
  strict?: boolean;
  /** Restrict to a subset of rules. Defaults to all rules. */
  rules?: readonly RuleId[];
}

/**
 * Runs every (enabled) check against an example/actual pair of parsed env
 * files and returns a single Report. This is the one function the CLI and
 * the public library API both call — it is the sole place severity and
 * --strict are resolved, so a check implementation never needs to know
 * about either.
 */
export function buildReport(
  example: ParsedEnv,
  actual: ParsedEnv,
  options: ReportOptions = {},
): Report {
  const ignore = new Set(options.ignore ?? []);
  const placeholderPatterns =
    options.placeholderPatterns ?? DEFAULT_PLACEHOLDER_PATTERNS;
  const rules = options.rules ?? ALL_RULES;

  const findings: Finding[] = [];
  const summary: Record<RuleId, number> = {
    missing: 0,
    undeclared: 0,
    empty: 0,
    placeholder: 0,
    duplicate: 0,
  };

  for (const rule of rules) {
    const severity = resolveSeverity(rule, options);
    if (severity === "off") continue;

    const check = CHECKS[rule];
    const raw = check(example, actual, { ignore, placeholderPatterns });
    for (const item of raw) {
      findings.push({ ...item, severity });
      summary[rule]++;
    }
  }

  const ok = findings.every((f) => f.severity !== "error");
  return { findings, ok, summary };
}

function resolveSeverity(rule: RuleId, options: ReportOptions): Severity {
  const configured = options.severity?.[rule] ?? DEFAULT_SEVERITY[rule];
  if (configured === "off") return "off";
  if (configured === "warn" && options.strict) return "error";
  return configured;
}
