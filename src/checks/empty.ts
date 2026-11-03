import type { Check } from "./types.js";

/** Flags keys in .env that are set but have an empty value ("KEY="). */
export const empty: Check = (_example, actual, ctx) => {
  const findings = [];
  for (const key of actual.order) {
    if (ctx.ignore.has(key)) continue;
    const entry = actual.entries.get(key)!;
    if (entry.value === "") {
      findings.push({
        rule: "empty" as const,
        key,
        message: `"${key}" is set but has no value.`,
        line: entry.line,
      });
    }
  }
  return findings;
};
