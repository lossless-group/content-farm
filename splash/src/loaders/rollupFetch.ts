/**
 * Roll-up fetcher: hits the GitHub Content API for every submodule registered
 * in the parent .gitmodules and returns the merged set of entries with
 * provenance metadata. Build-target-agnostic — used by the rollup-sync CLI
 * script that writes results to disk; not used at Astro build time anymore.
 *
 * Architectural note: we used to call this loader live from Astro at build
 * time. That made every build hit ~60 API calls and required GITHUB_TOKEN
 * plumbing in CI. We moved to a deliberate-sync model — `pnpm rollup:sync`
 * fetches and writes files; subsequent builds are pure file IO.
 *
 * See:
 * - pseudomonorepos/references/content-rollup.md
 * - splash/scripts/rollup-sync.ts (the CLI consumer)
 */

import { parseFrontmatter } from './frontmatter.ts';
import {
  fetchRawFile,
  isAuthenticated,
  listMarkdownRecursive,
} from './githubContentApi.ts';
import { parseGitmodules, type SubmoduleEntry } from './parseGitmodules.ts';

export interface RollupFetchOptions {
  /** Path inside each submodule to query (e.g. 'changelog' or 'context-v'). */
  remotePath: string;
  /** Additional fallback paths (e.g. legacy 'context-v/changelogs/'). */
  remoteFallbackPaths?: string[];
  /** Absolute path to the parent .gitmodules file. */
  gitmodulesPath: string;
  /** Logical name for log lines. */
  collectionName: string;
  /** Filter (relative path within the source's content root, returns true to keep). */
  filter?: (relPath: string) => boolean;
}

export interface FetchedEntry {
  /** Submodule slug (e.g. 'cite-wide'). */
  from: string;
  /** Path inside the source repo's content root, relative. */
  fromPath: string;
  /** Full file path on the source repo (relative to source repo root). */
  sourcePath: string;
  /** True when the entry was found at a legacy fallback path. */
  legacy: boolean;
  /** Frontmatter as parsed. */
  data: Record<string, unknown>;
  /** Markdown body (after the frontmatter fence). */
  body: string;
  /** Raw file contents (frontmatter + body) as fetched. */
  raw: string;
}

export interface FetchResult {
  authenticated: boolean;
  perSubmodule: Array<{
    submodule: SubmoduleEntry;
    entries: FetchedEntry[];
    error?: string;
  }>;
  /** Flattened list. */
  entries: FetchedEntry[];
}

/**
 * Fetch rolled-up content for one logical collection (changelog or context-v).
 * Never throws on a per-submodule failure — that submodule is skipped with an
 * error in the per-submodule report and the rest of the fetch continues.
 */
export async function fetchRolledUp(options: RollupFetchOptions): Promise<FetchResult> {
  const submodules = await parseGitmodules(options.gitmodulesPath);
  const perSubmodule: FetchResult['perSubmodule'] = [];
  const entries: FetchedEntry[] = [];

  for (const sub of submodules) {
    try {
      const subEntries = await collectFromSubmodule(sub, options);
      perSubmodule.push({ submodule: sub, entries: subEntries });
      entries.push(...subEntries);
    } catch (err) {
      perSubmodule.push({
        submodule: sub,
        entries: [],
        error: (err as Error).message,
      });
    }
  }

  return {
    authenticated: isAuthenticated(),
    perSubmodule,
    entries,
  };
}

async function collectFromSubmodule(
  sub: SubmoduleEntry,
  options: RollupFetchOptions,
): Promise<FetchedEntry[]> {
  const out: FetchedEntry[] = [];

  const paths: { path: string; legacy: boolean }[] = [
    { path: options.remotePath, legacy: false },
    ...(options.remoteFallbackPaths ?? []).map((p) => ({ path: p, legacy: true })),
  ];

  for (const { path, legacy } of paths) {
    const files = await listMarkdownRecursive(sub.ownerRepo, path, sub.branch);
    for (const file of files) {
      if (!file.download_url) continue;

      const relPath = stripPrefix(file.path, path);
      if (options.filter && !options.filter(relPath)) continue;

      const raw = await fetchRawFile(file.download_url);
      const { data, body } = parseFrontmatter(raw);

      out.push({
        from: sub.slug,
        fromPath: relPath,
        sourcePath: file.path,
        legacy,
        data,
        body,
        raw,
      });
    }
  }
  return out;
}

function stripPrefix(filePath: string, prefix: string): string {
  const norm = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return filePath.startsWith(norm) ? filePath.slice(norm.length) : filePath;
}
