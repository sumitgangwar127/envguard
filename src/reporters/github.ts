import type { Report } from "../types.js";

/**
 * Renders a Report as GitHub Actions workflow commands
 * (`::error ...` / `::warning ...`), so each finding shows as an inline
 * annotation on the PR diff when printed inside a workflow run.
 * See: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions
 */
export function formatGithub(report: Report, defaultFile: string): string {
  if (report.findings.length === 0) return "";

  const lines: string[] = [];
  for (const f of report.findings) {
    if (f.severity === "off") continue;
    const command = f.severity === "error" ? "error" : "warning";
    const params = [`file=${escape(f.file ?? defaultFile)}`];
    if (f.line !== undefined) params.push(`line=${f.line}`);
    const message = escape(f.message);
    lines.push(`::${command} ${params.join(",")}::${message}`);
  }
  return lines.join("\n") + "\n";
}

function escape(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}
