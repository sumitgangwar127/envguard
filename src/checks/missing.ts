import type { Check } from "./types.js";

/** Flags keys declared in .env.example that have no entry at all in .env. */
export const missing: Check = (example, actual, ctx) => {
  const findings = [];
  for (const key of example.order) {
    if (ctx.ignore.has(key)) continue;
    if (!actual.entries.has(key)) {
      findings.push({
        rule: "missing" as const,
        key,
        message: `"${key}" is declared in the example file but missing from the env file.`,
        line: example.entries.get(key)?.line,
      });
    }
  }
  return findings;
};
