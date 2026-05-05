import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface SubmoduleEntry {
  /** Section name from `[submodule "..."]`, e.g. `plugin-modules/cite-wide`. */
  name: string;
  /** Local path relative to the .gitmodules file. */
  path: string;
  /** GitHub repo URL — `https://github.com/{owner}/{repo}.git`. */
  url: string;
  /** Branch the parent expects the submodule to track. Defaults to `development`. */
  branch: string;
  /** Derived `{owner}/{repo}` (no .git suffix) for use with the GitHub Content API. */
  ownerRepo: string;
  /** The on-disk leaf name, e.g. `cite-wide` from `plugin-modules/cite-wide`. */
  slug: string;
}

const SECTION_RE = /^\[submodule\s+"([^"]+)"\]\s*$/;
const KEY_VALUE_RE = /^\s*([^=\s]+)\s*=\s*(.+?)\s*$/;
const GITHUB_URL_RE = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/;

/**
 * Parse a `.gitmodules` file at the given absolute path and return the list of
 * submodule entries. Returns an empty array when the file is missing — that's
 * a valid state for a fresh repo.
 */
export async function parseGitmodules(gitmodulesPath: string): Promise<SubmoduleEntry[]> {
  let text: string;
  try {
    text = await readFile(gitmodulesPath, 'utf8');
  } catch {
    return [];
  }

  const entries: SubmoduleEntry[] = [];
  let current: Partial<SubmoduleEntry> | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/^﻿/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      if (current) flushCurrent(entries, current);
      current = { name: sectionMatch[1] };
      continue;
    }

    if (!current) continue;
    const kv = line.match(KEY_VALUE_RE);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === 'path') current.path = value;
    else if (key === 'url') current.url = value;
    else if (key === 'branch') current.branch = value;
  }
  if (current) flushCurrent(entries, current);

  return entries;
}

function flushCurrent(entries: SubmoduleEntry[], partial: Partial<SubmoduleEntry>): void {
  if (!partial.name || !partial.path || !partial.url) return;
  const branch = partial.branch ?? 'development';
  const match = partial.url.match(GITHUB_URL_RE);
  if (!match) return; // Skip non-github remotes — out of scope for this loader.
  const ownerRepo = match[1];
  const slug = partial.path.split('/').pop() ?? partial.path;
  entries.push({
    name: partial.name,
    path: partial.path,
    url: partial.url,
    branch,
    ownerRepo,
    slug,
  });
}

/** Resolve `<repo-root>/.gitmodules` by walking up from a starting directory. */
export function resolveGitmodulesPath(startDir: string): string {
  return resolve(startDir, '..', '.gitmodules');
}
