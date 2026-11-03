import type { ParsedEnv } from "../parse.js";
import type { Finding } from "../types.js";

export interface CheckContext {
  ignore: ReadonlySet<string>;
  placeholderPatterns: readonly RegExp[];
}

/** What a Check produces, before report.ts attaches a severity to it. */
export type RawFinding = Omit<Finding, "severity">;

/**
 * A Check inspects the example and actual env files and returns zero or
 * more findings. Checks never assign severity — report.ts does that
 * afterwards, based on config — so a check only needs to report that
 * something is true, not how bad it is.
 */
export type Check = (
  example: ParsedEnv,
  actual: ParsedEnv,
  ctx: CheckContext,
) => RawFinding[];
