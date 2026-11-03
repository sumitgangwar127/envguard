import type { ParsedEnv } from "./parse.js";
import { buildReport } from "./report.js";

export interface CompareOptions {
  /** Keys to exclude from every check (e.g. "NODE_ENV"). */
  ignore?: readonly string[];
  /** Flag values in .env that still look like unfilled placeholders. */
  placeholderPatterns?: readonly RegExp[];
}

export interface CompareResult {
  /** In .env.example but missing from .env entirely. */
  missing: string[];
  /** In .env but not declared in .env.example — may be stale or a typo. */
  undeclared: string[];
  /** Present in .env but with an empty value ("" or unset after KEY=). */
  empty: string[];
  /** Present in .env but the value still looks like a placeholder. */
  placeholder: Array<{ key: string; value: string }>;
  /** True when there is nothing to report. */
  ok: boolean;
}

/**
 * @deprecated Thin convenience wrapper over {@link buildReport} that reshapes
 * its output into flat key lists, kept for a simple call site / backward
 * compatibility. Prefer `buildReport` for new code — it also covers the
 * "duplicate" rule and per-rule severity, which this wrapper does not expose.
 */
export function compareEnv(
  example: ParsedEnv,
  actual: ParsedEnv,
  options: CompareOptions = {},
): CompareResult {
  const report = buildReport(example, actual, {
    ignore: options.ignore,
    placeholderPatterns: options.placeholderPatterns,
    rules: ["missing", "undeclared", "empty", "placeholder"],
  });

  const missing: string[] = [];
  const undeclared: string[] = [];
  const empty: string[] = [];
  const placeholder: Array<{ key: string; value: string }> = [];

  for (const f of report.findings) {
    if (f.rule === "missing") missing.push(f.key);
    else if (f.rule === "undeclared") undeclared.push(f.key);
    else if (f.rule === "empty") empty.push(f.key);
    else if (f.rule === "placeholder") placeholder.push({ key: f.key, value: f.value ?? "" });
  }

  return {
    missing,
    undeclared,
    empty,
    placeholder,
    ok: missing.length === 0 && undeclared.length === 0 && empty.length === 0 && placeholder.length === 0,
  };
}
