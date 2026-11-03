import type { RuleId } from "../types.js";
import type { Check } from "./types.js";
import { missing } from "./missing.js";
import { undeclared } from "./undeclared.js";
import { empty } from "./empty.js";
import { placeholder } from "./placeholder.js";
import { duplicate } from "./duplicate.js";

export type { Check, CheckContext, RawFinding } from "./types.js";
export { DEFAULT_PLACEHOLDER_PATTERNS } from "./placeholder.js";

/** Every built-in check, keyed by the RuleId it produces findings for. */
export const CHECKS: Record<RuleId, Check> = {
  missing,
  undeclared,
  empty,
  placeholder,
  duplicate,
};
