/**
 * Astro content loader over the GitHub corpus. Turns the files of each repo into
 * collection entries, with the ids and provenance the routes have always used:
 *
 *   content-farm/<path>   the parent repo's own documents
 *   <plugin>/<path>       a submodule's documents
 */

import { parseFrontmatter } from './frontmatter.ts';
import { getCorpus, type CorpusFile, type RepoSnapshot } from './corpus.ts';

interface Located {
  relPath: string;
  legacy: boolean;
}

/** Decide whether a file belongs in this collection, and under which path. */
type Locate = (file: CorpusFile, repo: RepoSnapshot) => Located | null;

interface CorpusLoaderOptions {
  name: string;
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

export function corpusLoader({ name, locate }: CorpusLoaderOptions) {
  return {
    name: `corpus-loader:${name}`,
    load: async ({ store, parseData, logger }: any): Promise<void> => {
      const repos = await getCorpus();
      store.clear();

      let loaded = 0;
      let skipped = 0;
      for (const repo of repos) {
        for (const file of repo.files) {
          const located = locate(file, repo);
          if (!located || !isPage(located.relPath, repo)) continue;

          const { data, body } = parseFrontmatter(file.text);
          if (data.publish === false) {
            skipped++;
            continue;
          }

          const merged: Record<string, unknown> = {
            ...data,
            from: isParent(repo) ? (data.from ?? repo.slug) : repo.slug,
            from_path: isParent(repo) ? (data.from_path ?? located.relPath) : located.relPath,
            ...(located.legacy ? { legacy: true } : {}),
          };
          const id = `${repo.slug}/${located.relPath.replace(/\.md$/, '')}`;

          store.set({ id, data: await safeParse({ id, data: merged }, parseData, logger), body });
          loaded++;
        }
      }

      logger.info(`[corpus:${name}] ${loaded} entries from ${repos.length} repos, ${skipped} skipped (publish:false).`);
    },
  };
}

// Frontmatter spans many months and many hands. An odd field never costs a
// document its page, so a failed validation keeps the raw frontmatter.
async function safeParse(
  args: { id: string; data: Record<string, unknown> },
  parseData: (a: { id: string; data: unknown }) => Promise<unknown>,
  logger: { warn: (msg: string) => void },
): Promise<Record<string, unknown>> {
  try {
    return (await parseData(args)) as Record<string, unknown>;
  } catch (err) {
    logger.warn(`schema couldn't validate ${args.id} (${(err as Error).message}); storing raw frontmatter.`);
    return args.data;
  }
}
