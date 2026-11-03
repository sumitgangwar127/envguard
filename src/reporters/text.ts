import type { Report, RuleId } from "../types.js";

const TITLES: Record<RuleId, string> = {
  missing: "Missing (in example, not in env)",
  undeclared: "Undeclared (in env, not in example)",
  empty: "Empty values",
  placeholder: "Placeholder-looking values",
  duplicate: "Duplicate keys",
};

const ICONS: Record<"error" | "warn", string> = {
  error: "✖",
  warn: "⚠",
};

/** Renders a Report as human-readable, grouped, colorless text for a terminal. */
export function formatText(report: Report, context?: { env: string; example: string }): string {
  if (report.findings.length === 0) {
    return context
      ? `✔ ${context.env} matches ${context.example}\n`
      : "✔ No problems found.\n";
  }

  const byRule = new Map<RuleId, typeof report.findings>();
  for (const finding of report.findings) {
    const list = byRule.get(finding.rule) ?? [];
    list.push(finding);
    byRule.set(finding.rule, list);
  }

  const lines: string[] = [];
  for (const [rule, findings] of byRule) {
    if (findings.length === 0) continue;
    const icon = ICONS[findings[0]!.severity === "error" ? "error" : "warn"];
    lines.push(`\n${icon} ${TITLES[rule]}:`);
    for (const f of findings) {
      const suffix = f.value !== undefined ? `=${f.value}` : "";
      lines.push(`  - ${f.key}${suffix}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
