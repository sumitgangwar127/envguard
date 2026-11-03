import type { Check } from "./types.js";

export const DEFAULT_PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /^(change.?me|changeme)$/i,
  /^your[-_].*$/i,
  /^<.*>$/,
  /^x{4,}$/i,
  /^(todo|tbd|fixme)$/i,
  /^replace.?me$/i,
];

/** Flags values that still look like an unfilled placeholder (e.g. "changeme"). */
export const placeholder: Check = (_example, actual, ctx) => {
  const findings = [];
  for (const key of actual.order) {
    if (ctx.ignore.has(key)) continue;
    const entry = actual.entries.get(key)!;
    if (entry.value === "") continue; // empty.ts already covers this case
    if (ctx.placeholderPatterns.some((re) => re.test(entry.value))) {
      findings.push({
        rule: "placeholder" as const,
        key,
        message: `"${key}" still looks like a placeholder value.`,
        value: entry.value,
        line: entry.line,
      });
    }
  }
  return findings;
};
