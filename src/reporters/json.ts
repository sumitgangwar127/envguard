import type { Report } from "../types.js";

/** Renders a Report as pretty-printed JSON for machine consumption. */
export function formatJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
