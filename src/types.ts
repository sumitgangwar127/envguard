export type RuleId =
  | "missing"
  | "undeclared"
  | "empty"
  | "placeholder"
  | "duplicate";

export type Severity = "error" | "warn" | "off";

export interface Finding {
  rule: RuleId;
  key: string;
  severity: Severity;
  message: string;
  /** Extra detail specific to the rule, e.g. the offending value. */
  value?: string;
  line?: number;
  /** Which env file this finding came from. Set by the CLI when checking multiple files. */
  file?: string;
}

export interface Report {
  findings: Finding[];
  ok: boolean;
  /** Count of findings per rule, for summaries. */
  summary: Record<RuleId, number>;
}

export const ALL_RULES: readonly RuleId[] = [
  "missing",
  "undeclared",
  "empty",
  "placeholder",
  "duplicate",
];

export const DEFAULT_SEVERITY: Record<RuleId, Severity> = {
  missing: "error",
  undeclared: "warn",
  empty: "warn",
  placeholder: "warn",
  duplicate: "warn",
};
