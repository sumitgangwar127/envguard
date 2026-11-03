import type { Check } from "./types.js";

/** Flags keys defined more than once in the same .env file. */
export const duplicate: Check = (_example, actual, ctx) => {
  const findings = [];
  for (const [key, lines] of actual.duplicates) {
    if (ctx.ignore.has(key)) continue;
    findings.push({
      rule: "duplicate" as const,
      key,
      message: `"${key}" is defined ${lines.length} times (lines ${lines.join(", ")}); the last one wins.`,
      line: lines[lines.length - 1],
    });
  }
  return findings;
};
