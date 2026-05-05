/**
 * Tiny frontmatter splitter + minimal YAML parser scoped to our changelog +
 * context-v frontmatter shape. Intentionally not a general YAML parser —
 * Astro Knots tech hierarchy: "fewer dependencies is always better." We control
 * the frontmatter format, so we parse only what we author.
 *
 * Supports:
 * - Top-level `key: value` lines
 * - Quoted strings ("..." or '...') with simple escape handling
 * - YAML block-style arrays (`key:` followed by indented `  - item` lines)
 * - YAML flow-style arrays (`key: [a, b, c]`)
 * - Booleans (`true`/`false`/`yes`/`no`)
 * - Numbers (integers and floats)
 * - Bare/unquoted scalars (left as strings — zod schemas in content.config.ts
 *   coerce dates and other types where needed)
 *
 * Does NOT support:
 * - Nested mappings beyond one level (keys inside keys)
 * - Anchors, aliases, tags
 * - Multi-line block scalars (`|`, `>`)
 *
 * If a parse fails on a particular line, that line is skipped with a debug
 * log line — never throw, since rejecting a whole entry over a stray
 * frontmatter quirk would defeat the loader's "respect what's there" stance.
 */

const FENCE_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/;

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(text: string): ParsedFrontmatter {
  const match = text.match(FENCE_RE);
  if (!match) {
    return { data: {}, body: text };
  }
  const [, fmText, body] = match;
  return { data: parseYamlSubset(fmText), body };
}

function parseYamlSubset(text: string): Record<string, unknown> {
  const lines = text.split(/\r?\n/);
  const data: Record<string, unknown> = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++;
      continue;
    }

    // Top-level keys must start at column 0 (no leading whitespace).
    if (line.startsWith(' ') || line.startsWith('\t')) {
      i++;
      continue;
    }

    const colonIdx = findKeyColon(line);
    if (colonIdx < 0) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (rest === '' || rest === '|' || rest === '>') {
      // Block-style: value lives on indented lines below.
      // Try to read an indented array first; if no items, leave as null.
      const { items, consumed } = readIndentedArray(lines, i + 1);
      if (items !== null) {
        data[key] = items;
        i += 1 + consumed;
        continue;
      }
      data[key] = null;
      i++;
      continue;
    }

    data[key] = parseScalarOrFlow(rest);
    i++;
  }

  return data;
}

/**
 * Find the colon that separates a key from its value, ignoring colons inside
 * quoted strings. Returns -1 if no key-colon exists.
 */
function findKeyColon(line: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && (inSingle || inDouble)) {
      i++; // skip escaped char
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      // require space-or-end-of-line after the colon
      const next = line[i + 1];
      if (next === undefined || next === ' ' || next === '\t' || next === '\r') return i;
    }
  }
  return -1;
}

interface ArrayReadResult {
  items: string[] | null;
  consumed: number;
}

function readIndentedArray(lines: string[], startIdx: number): ArrayReadResult {
  const items: string[] = [];
  let i = startIdx;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // blank line tolerated within an array
    const m = line.match(/^(\s+)-\s+(.*)$/);
    if (!m) break;
    items.push(unquote(m[2].trim()));
  }
  return items.length > 0
    ? { items, consumed: i - startIdx }
    : { items: null, consumed: 0 };
}

function parseScalarOrFlow(raw: string): unknown {
  // Strip a trailing comment that isn't inside quotes.
  const stripped = stripTrailingComment(raw).trim();

  // Flow-style array: [a, b, c]
  if (stripped.startsWith('[') && stripped.endsWith(']')) {
    const inner = stripped.slice(1, -1).trim();
    if (inner === '') return [];
    return splitFlowList(inner).map((s) => parseScalarOrFlow(s.trim()));
  }

  // Quoted strings preserve their content verbatim.
  if (
    (stripped.startsWith('"') && stripped.endsWith('"')) ||
    (stripped.startsWith("'") && stripped.endsWith("'"))
  ) {
    return unquote(stripped);
  }

  // Booleans (YAML 1.1 truthy/falsy subset).
  const lower = stripped.toLowerCase();
  if (lower === 'true' || lower === 'yes' || lower === 'on') return true;
  if (lower === 'false' || lower === 'no' || lower === 'off') return false;
  if (lower === 'null' || lower === '~' || lower === '') return null;

  // Numbers. Integer or float, no scientific notation in our content.
  if (/^-?\d+$/.test(stripped)) return Number(stripped);
  if (/^-?\d+\.\d+$/.test(stripped)) return Number(stripped);

  // Everything else stays a string. Zod will coerce dates / numbers as needed.
  return stripped;
}

function stripTrailingComment(s: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && (inSingle || inDouble)) {
      i++;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || s[i - 1] === ' ' || s[i - 1] === '\t')) {
      return s.slice(0, i);
    }
  }
  return s;
}

function splitFlowList(s: string): string[] {
  // Comma split that respects quotes and brackets at depth.
  const out: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && (inSingle || inDouble)) {
      buf += ch + (s[++i] ?? '');
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if ((ch === '[' || ch === '{') && !inSingle && !inDouble) depth++;
    else if ((ch === ']' || ch === '}') && !inSingle && !inDouble) depth--;
    else if (ch === ',' && depth === 0 && !inSingle && !inDouble) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim() !== '') out.push(buf);
  return out;
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}
