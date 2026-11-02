/**
 * The changelog + context-v corpus: content-farm's own documents plus those of
 * every submodule in its .gitmodules, read from GitHub when the site builds.
 *
 * A new document needs no sync and no commit here, only the next scheduled
 * build (see .github/workflows/pages.yml). A new plugin doesn't either, because
 * .gitmodules is read the same way.
 *
 * Cost per build: two API calls per repo, plus one download per document.
 *
 * Failure: a repo that can't be read fails the build, so Pages keeps the last
 * good site. Building without it would quietly delete that plugin's pages.
 */

import { fetchFileAtCommit, fetchHeadCommit, fetchTree } from './githubContentApi.ts';
import { parseGitmodules } from './parseGitmodules.ts';

const PARENT_REPO = process.env.CONTENT_FARM_REPO ?? 'lossless-group/content-farm';
const PARENT_REF = process.env.CONTENT_FARM_REF ?? 'development';
const PARENT_SLUG = 'content-farm';

const DOWNLOAD_CONCURRENCY = 24;

const CONTENT_ROOTS = ['changelog/', 'context-v/'];

export interface CorpusFile {
  path: string;
  text: string;
}

interface RepoSource {
  slug: string;
  ownerRepo: string;
  ref: string;
}

export interface RepoSnapshot extends RepoSource {
  files: CorpusFile[];
}

let corpus: Promise<RepoSnapshot[]> | null = null;

/** Every repo's documents. Both collections share one read per build. */
export function getCorpus(): Promise<RepoSnapshot[]> {
  corpus ??= readCorpus();
  return corpus;
}

async function readCorpus(): Promise<RepoSnapshot[]> {
  const parent = await readRepo({ slug: PARENT_SLUG, ownerRepo: PARENT_REPO, ref: PARENT_REF });
  if (!parent) throw new Error(`Couldn't find ${PARENT_REPO}@${PARENT_REF}.`);

  const gitmodules = parent.files.find((file) => file.path === '.gitmodules')?.text ?? '';
  const submodules = await Promise.all(
    parseGitmodules(gitmodules).map(({ slug, ownerRepo, branch }) => readRepo({ slug, ownerRepo, ref: branch })),
  );

  return [parent, ...submodules.filter((repo) => repo !== null)];
}

/** One repo's documents, or null if it doesn't have this branch. */
async function readRepo(source: RepoSource): Promise<RepoSnapshot | null> {
  const commit = await fetchHeadCommit(source.ownerRepo, source.ref);
  if (!commit) {
    console.warn(`[corpus] ${source.ownerRepo} has no branch "${source.ref}"; skipping it.`);
    return null;
  }

  const tree = await fetchTree(source.ownerRepo, commit);
  const wanted = tree.filter(
    (path) =>
      (path.endsWith('.md') && CONTENT_ROOTS.some((root) => path.startsWith(root))) ||
      (source.slug === PARENT_SLUG && path === '.gitmodules'),
  );

  const files = await mapWithLimit(wanted, DOWNLOAD_CONCURRENCY, async (path) => ({
    path,
    text: await fetchFileAtCommit(source.ownerRepo, commit, path),
  }));
  return { ...source, files };
}

async function mapWithLimit<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
