import { existsSync, readFileSync } from "node:fs";
import type { RuleId, Severity } from "./types.js";

export interface EnvguardConfig {
  example?: string;
  env?: string[];
  ignore?: string[];
  strict?: boolean;
  severity?: Partial<Record<RuleId, Severity>>;
}

const DEFAULT_CONFIG_NAME = ".envguardrc.json";

/**
 * Loads an optional JSON config file. Returns `{}` (not an error) when no
 * path was given and the default file does not exist — zero-config usage
 * must keep working. Throws a plain Error with a message meant to be shown
 * to the user as-is when an explicitly-named file is missing or invalid.
 */
export function loadConfig(path?: string): EnvguardConfig {
  const target = path ?? DEFAULT_CONFIG_NAME;
  const wasExplicit = path !== undefined;

  if (!existsSync(target)) {
    if (wasExplicit) {
      throw new Error(`Config file not found: ${target}`);
    }
    return {};
  }

  let raw: string;
  try {
    raw = readFileSync(target, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read config file ${target}: ${message}`);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return validateConfig(parsed, target);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Config file ${target} is not valid JSON: ${err.message}`);
    }
    throw err;
  }
}

function validateConfig(value: unknown, target: string): EnvguardConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Config file ${target} must contain a JSON object.`);
  }
  // Intentionally permissive at the type level — unknown keys are ignored
  // rather than rejected, so older configs keep working as new options are
  // added. CLI flags always take precedence over whatever is here.
  return value as EnvguardConfig;
}

export interface ResolvedOptions {
  example: string;
  env: string[];
  ignore: string[];
  strict: boolean;
  severity: Partial<Record<RuleId, Severity>>;
}

/** Merges CLI flags over a loaded config over built-in defaults. CLI wins. */
export function resolveOptions(
  cli: Partial<ResolvedOptions>,
  config: EnvguardConfig,
): ResolvedOptions {
  return {
    example: cli.example ?? config.example ?? ".env.example",
    env: cli.env?.length ? cli.env : config.env?.length ? config.env : [".env"],
    ignore: cli.ignore?.length ? cli.ignore : config.ignore ?? [],
    strict: cli.strict ?? config.strict ?? false,
    severity: { ...config.severity, ...cli.severity },
  };
}
