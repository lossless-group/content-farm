/**
 * The changelog + context-v corpus: content-farm's own documents plus those of
 * every submodule in its .gitmodules, read live from GitHub.
 *
 * A new document needs no rebuild and no sync. A new plugin doesn't either,
 * because .gitmodules is read the same way.
 *
 * Cost per refresh: one free conditional request per repo when nothing moved.
 * A repo that moved costs one more API call for its file list, and only the
 * files whose blob changed are downloaded again.
 *
 * Failure: a repo that can't be read keeps its last good copy and marks the
 * corpus degraded, so a GitHub hiccup can't drop pages or get cached by the CDN
 * (see src/middleware.ts). A cold instance has no last good copy to fall back
 * on, and that repo stays empty until a refresh succeeds.
 */

import { fetchFileAtCommit, fetchHeadCommit, fetchTree } from './githubContentApi.ts';
import { parseGitmodules } from './parseGitmodules.ts';

const PARENT_REPO = process.env.CONTENT_FARM_REPO ?? 'lossless-group/content-farm';
const PARENT_REF = process.env.CONTENT_FARM_REF ?? 'development';
const PARENT_SLUG = 'content-farm';

/** How long one instance trusts what it knows before asking GitHub again. */
const REFRESH_MS = 60_000;
const DOWNLOAD_CONCURRENCY = 24;

const CONTENT_ROOTS = ['changelog/', 'context-v/'];

export interface CorpusFile {
  path: string;
  sha: string;
  text: string;
}

interface RepoSource {
  slug: string;
  ownerRepo: string;
  ref: string;
}

interface RepoState {
  commit: string;
  etag: string | null;
  files: CorpusFile[];
}

export interface RepoSnapshot extends RepoSource {
  files: CorpusFile[];
}

export interface Corpus {
  /** Changes whenever any repo's content changes. */
  version: number;
  repos: RepoSnapshot[];
}

const repoStates = new Map<string, RepoState>();
let corpus: Corpus | null = null;
let checkedAt = 0;
let refreshing: Promise<Corpus> | null = null;
let degraded = false;

/** True when the last refresh couldn't read at least one repo. */
export function corpusIsDegraded(): boolean {
  return degraded;
}

/** The current corpus, refreshed if this instance hasn't checked lately. */
export async function getCorpusSnapshot(): Promise<Corpus> {
  if (corpus && Date.now() - checkedAt < REFRESH_MS) return corpus;
  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function refresh(): Promise<Corpus> {
  const parent: RepoSource = { slug: PARENT_SLUG, ownerRepo: PARENT_REPO, ref: PARENT_REF };
  const failures: string[] = [];

  let moved = await refreshRepo(parent, failures);

  // Without the parent there is no list of submodules. Keep whatever we had.
  const parentState = repoStates.get(parent.ownerRepo);
  if (!parentState) {
    degraded = true;
    throw new Error(`Couldn't read ${parent.ownerRepo}: ${failures.join(' ')}`);
  }

  const gitmodules = parentState.files.find((file) => file.path === '.gitmodules')?.text ?? '';
  const submodules: RepoSource[] = parseGitmodules(gitmodules).map(({ slug, ownerRepo, branch }) => ({
    slug,
    ownerRepo,
    ref: branch,
  }));

  const results = await Promise.all(submodules.map((sub) => refreshRepo(sub, failures)));
  moved ||= results.some(Boolean);

  degraded = failures.length > 0;
  if (degraded) console.warn(`[corpus] ${failures.join(' ')}`);

  checkedAt = Date.now();
  if (!corpus || moved) {
    corpus = {
      version: (corpus?.version ?? 0) + 1,
      repos: [parent, ...submodules].map((source) => ({
        ...source,
        files: repoStates.get(source.ownerRepo)?.files ?? [],
      })),
    };
  }
  return corpus;
}

/** Bring one repo up to date. Returns true if its content changed. */
async function refreshRepo(source: RepoSource, failures: string[]): Promise<boolean> {
  const previous = repoStates.get(source.ownerRepo);
  try {
    const head = await fetchHeadCommit(source.ownerRepo, source.ref, previous?.etag ?? null);
    if (head.status === 'unchanged') return false;
    if (head.status === 'missing') {
      repoStates.delete(source.ownerRepo);
      return Boolean(previous);
    }
    if (head.commit === previous?.commit) return false;

    const tree = await fetchTree(source.ownerRepo, head.commit);
    const wanted = tree.filter(
      ({ path }) =>
        (path.endsWith('.md') && CONTENT_ROOTS.some((root) => path.startsWith(root))) ||
        (source.slug === PARENT_SLUG && path === '.gitmodules'),
    );

    const known = new Map(previous?.files.map((file) => [file.sha, file.text]));
    const files = await mapWithLimit(wanted, DOWNLOAD_CONCURRENCY, async ({ path, sha }) => ({
      path,
      sha,
      text: known.get(sha) ?? (await fetchFileAtCommit(source.ownerRepo, head.commit, path)),
    }));

    repoStates.set(source.ownerRepo, { commit: head.commit, etag: head.etag, files });
    return true;
  } catch (err) {
    failures.push(`${source.slug}: ${(err as Error).message}`);
    return false;
  }
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
