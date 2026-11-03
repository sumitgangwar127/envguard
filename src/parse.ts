export interface EnvEntry {
  key: string;
  /** Raw value exactly as written on the right-hand side, after unquoting. */
  value: string;
  /** Line number in the source file (1-indexed), for error messages. */
  line: number;
}

export interface ParsedEnv {
  /** Insertion-ordered map of key -> entry. Later duplicate keys win, matching dotenv. */
  entries: Map<string, EnvEntry>;
  /** Keys in the order they first appeared. */
  order: string[];
  /** key -> every line number it was defined on, only present for keys defined more than once. */
  duplicates: Map<string, number[]>;
}

const LINE_RE =
  /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;

/**
 * Parses dotenv-style text into key/value entries.
 *
 * Supports: `KEY=value`, `export KEY=value`, single/double-quoted values,
 * `#` comments (both full-line and trailing on unquoted values), and blank lines.
 * Unlike a runtime dotenv loader, this never touches `process.env` and never
 * expands `${VAR}` references — envguard only cares about which keys exist.
 */
export function parseEnv(source: string): ParsedEnv {
  const entries = new Map<string, EnvEntry>();
  const order: string[] = [];
  const lineNumbers = new Map<string, number[]>();
  const lines = source.split(/\r\n|\n|\r/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const match = LINE_RE.exec(rawLine);
    if (!match) continue;

    const key = match[1]!;
    let value = match[2] ?? "";
    value = stripInlineComment(value);
    value = unquote(value);

    if (!entries.has(key)) order.push(key);
    entries.set(key, { key, value, line: i + 1 });

    const seenAt = lineNumbers.get(key);
    if (seenAt) seenAt.push(i + 1);
    else lineNumbers.set(key, [i + 1]);
  }

  const duplicates = new Map<string, number[]>();
  for (const [key, lineNums] of lineNumbers) {
    if (lineNums.length > 1) duplicates.set(key, lineNums);
  }

  return { entries, order, duplicates };
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      const inner = value.slice(1, -1);
      return first === '"' ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"') : inner;
    }
  }
  return value;
}

/** Strips a trailing unquoted `# comment`, respecting quoted values. */
function stripInlineComment(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    // Quoted values are returned as-is; unquote() handles the quotes and
    // anything after the closing quote is ignored by design (dotenv parity).
    const quote = trimmed[0];
    const closeIdx = trimmed.indexOf(quote!, 1);
    if (closeIdx !== -1) return trimmed.slice(0, closeIdx + 1);
    return trimmed;
  }
  const hashIdx = trimmed.indexOf("#");
  if (hashIdx === -1) return trimmed;
  return trimmed.slice(0, hashIdx).trim();
}
