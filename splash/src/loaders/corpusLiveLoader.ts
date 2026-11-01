/**
 * Astro live loader over the GitHub corpus. Turns the files of each repo into
 * collection entries, with the ids and provenance the routes have always used:
 *
 *   content-farm/<path>   the parent repo's own documents
 *   <plugin>/<path>       a submodule's documents
 */

import type { ZodType } from 'astro/zod';
import { parseFrontmatter } from './frontmatter.ts';
import { getCorpusSnapshot, type CorpusFile, type RepoSnapshot } from './corpus.ts';

export interface CorpusEntryData extends Record<string, unknown> {
  /** Markdown body. Live entries have no `body` of their own, so it rides here. */
  body: string;
}

interface CorpusEntry {
  id: string;
  data: CorpusEntryData;
}

interface Located {
  relPath: string;
  legacy: boolean;
}

/** Decide whether a file belongs in this collection, and under which path. */
type Locate = (file: CorpusFile, repo: RepoSnapshot) => Located | null;

interface CorpusLoaderOptions {
  name: string;
  schema: ZodType;
  locate: Locate;
}

function isParent(repo: RepoSnapshot): boolean {
  return repo.slug === 'content-farm';
}

function under(path: string, root: string): string | null {
  return path.startsWith(root) ? path.slice(root.length) : null;
}

export const locateChangelog: Locate = ({ path }, repo) => {
  const relPath = under(path, 'changelog/');
  if (relPath !== null) return { relPath, legacy: false };
  if (isParent(repo)) return null;
  // Older plugins kept their ship notes inside context-v.
  const legacyPath = under(path, 'context-v/changelogs/');
  return legacyPath === null ? null : { relPath: legacyPath, legacy: true };
};

export const locateContextV: Locate = ({ path }, repo) => {
  const relPath = under(path, 'context-v/');
  if (relPath === null) return null;
  // Those legacy ship notes belong to the changelog feed, not here.
  if (!isParent(repo) && relPath.startsWith('changelogs/')) return null;
  return { relPath, legacy: false };
};

/** OKF folder indexes are navigation for agents, not pages. */
function isPage(relPath: string, repo: RepoSnapshot): boolean {
  const fileName = relPath.split('/').pop();
  if (fileName === 'index.md') return false;
  return isParent(repo) || fileName !== 'README.md';
}

function buildEntry(file: CorpusFile, repo: RepoSnapshot, located: Located, schema: ZodType): CorpusEntry | null {
  const { data, body } = parseFrontmatter(file.text);
  if (data.publish === false) return null;

  const merged: Record<string, unknown> = {
    ...data,
    from: isParent(repo) ? (data.from ?? repo.slug) : repo.slug,
    from_path: isParent(repo) ? (data.from_path ?? located.relPath) : located.relPath,
    ...(located.legacy ? { legacy: true } : {}),
  };

  const id = `${repo.slug}/${located.relPath.replace(/\.md$/, '')}`;

  // Frontmatter spans many months and many hands. An odd field never costs a
  // document its page, so a failed validation keeps the raw frontmatter.
  const parsed = schema.safeParse(merged);
  if (!parsed.success) {
    console.warn(`[corpus] schema couldn't validate ${id}; keeping raw frontmatter.`);
  }
  return {
    id,
    data: { ...((parsed.success ? parsed.data : merged) as Record<string, unknown>), body },
  };
}

export function corpusLiveLoader({ name, schema, locate }: CorpusLoaderOptions) {
  let builtFrom = -1;
  let entries: CorpusEntry[] = [];

  async function currentEntries(): Promise<CorpusEntry[]> {
    const corpus = await getCorpusSnapshot();
    if (corpus.version !== builtFrom) {
      entries = corpus.repos.flatMap((repo) =>
        repo.files.flatMap((file) => {
          const located = locate(file, repo);
          if (!located || !isPage(located.relPath, repo)) return [];
          return buildEntry(file, repo, located, schema) ?? [];
        }),
      );
      builtFrom = corpus.version;
    }
    return entries;
  }

  return {
    name: `corpus-live-loader:${name}`,
    loadCollection: async () => {
      try {
        return { entries: await currentEntries() };
      } catch (err) {
        return { error: err as Error };
      }
    },
    loadEntry: async ({ filter }: { filter: { id?: string } | string }) => {
      const id = typeof filter === 'string' ? filter : filter.id;
      try {
        const entry = (await currentEntries()).find((candidate) => candidate.id === id);
        return entry ?? { error: new Error(`No ${name} entry "${id}".`) };
      } catch (err) {
        return { error: err as Error };
      }
    },
  };
}
