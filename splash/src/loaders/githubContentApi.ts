/**
 * Minimal GitHub client for reading repo content at request time.
 *
 * - Authenticated via GITHUB_TOKEN or GITHUB_API_TOKEN when available.
 * - Falls back to anonymous (60 req/hr) when no token is present.
 * - Asking "has this branch moved?" is a conditional request, and GitHub does
 *   not count a 304 against the rate limit, so checking is free when nothing
 *   changed.
 * - Files are read at an exact commit, so a new file doesn't wait on the
 *   5-minute cache that raw.githubusercontent.com keeps for branch URLs.
 */

const API_BASE = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

export interface TreeFile {
  path: string;
  sha: string;
}

function githubToken(): string | undefined {
  return (
    process.env.GITHUB_TOKEN ??
    process.env.GITHUB_API_TOKEN ??
    // `astro dev` loads .env into import.meta.env, not process.env.
    (import.meta.env.DEV ? import.meta.env.GITHUB_API_TOKEN : undefined)
  );
}

function authHeaders(accept: string): Record<string, string> {
  const token = githubToken();
  const headers: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'content-farm-splash',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function describeFailure(res: Response, what: string): string {
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get('x-ratelimit-remaining') === '0') {
      return `GitHub rate limit exhausted while reading ${what}. ${
        githubToken() ? 'Authenticated quota' : 'Anonymous quota: set GITHUB_API_TOKEN to raise the limit'
      }.`;
    }
  }
  return `GitHub ${res.status} while reading ${what}.`;
}

export type HeadCommit =
  | { status: 'unchanged' }
  | { status: 'missing' }
  | { status: 'found'; commit: string; etag: string | null };

/**
 * Resolve a branch to its commit. Returns `missing` on 404, because a repo
 * without this branch is a valid state (a vendored upstream, for example).
 */
export async function fetchHeadCommit(
  ownerRepo: string,
  ref: string,
  etag: string | null,
): Promise<HeadCommit> {
  const headers = authHeaders('application/vnd.github.sha');
  if (etag) headers['If-None-Match'] = etag;

  const res = await fetch(`${API_BASE}/repos/${ownerRepo}/commits/${encodeURIComponent(ref)}`, { headers });
  if (res.status === 304) return { status: 'unchanged' };
  if (res.status === 404 || res.status === 422) return { status: 'missing' };
  if (!res.ok) throw new Error(describeFailure(res, `${ownerRepo}@${ref}`));

  return {
    status: 'found',
    commit: (await res.text()).trim(),
    etag: res.headers.get('etag'),
  };
}

/** List every file in a commit. One API call, however deep the repo goes. */
export async function fetchTree(ownerRepo: string, commit: string): Promise<TreeFile[]> {
  const res = await fetch(`${API_BASE}/repos/${ownerRepo}/git/trees/${commit}?recursive=1`, {
    headers: authHeaders('application/vnd.github+json'),
  });
  if (!res.ok) throw new Error(describeFailure(res, `the file list of ${ownerRepo}@${commit}`));

  const body = (await res.json()) as {
    truncated: boolean;
    tree: Array<{ path: string; sha: string; type: string }>;
  };
  if (body.truncated) {
    console.warn(`[corpus] GitHub truncated the file list of ${ownerRepo}; some entries may be missing.`);
  }
  return body.tree
    .filter((node) => node.type === 'blob')
    .map(({ path, sha }) => ({ path, sha }));
}

/** Fetch one file's text as it was at a commit. */
export async function fetchFileAtCommit(ownerRepo: string, commit: string, path: string): Promise<string> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${RAW_BASE}/${ownerRepo}/${commit}/${encodedPath}`, {
    headers: authHeaders('text/plain'),
  });
  if (!res.ok) throw new Error(describeFailure(res, `${ownerRepo}/${path}@${commit}`));
  return res.text();
}
