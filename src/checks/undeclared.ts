import type { Check } from "./types.js";

/** Flags keys present in .env that the example file never mentions. */
export const undeclared: Check = (example, actual, ctx) => {
  const findings = [];
  for (const key of actual.order) {
    if (ctx.ignore.has(key)) continue;
    if (!example.entries.has(key)) {
      findings.push({
        rule: "undeclared" as const,
        key,
        message: `"${key}" is set in the env file but not declared in the example file.`,
        line: actual.entries.get(key)?.line,
      });
    }
  }
  return findings;
};
