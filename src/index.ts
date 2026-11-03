export { parseEnv } from "./parse.js";
export type { EnvEntry, ParsedEnv } from "./parse.js";

export { buildReport } from "./report.js";
export type { ReportOptions } from "./report.js";

export type { Finding, Report, RuleId, Severity } from "./types.js";

export { loadConfig, resolveOptions } from "./config.js";
export type { EnvguardConfig, ResolvedOptions } from "./config.js";

export { formatText, formatJson, formatGithub } from "./reporters/index.js";

/**
 * @deprecated Use {@link buildReport} instead — it also covers the
 * "duplicate" rule and per-rule severity. Kept for a simpler call site.
 */
export { compareEnv } from "./compare.js";
export type { CompareOptions, CompareResult } from "./compare.js";
