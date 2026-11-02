/**
 * Minimal GitHub client for reading repo content at build time.
 *
 * - Authenticated via GITHUB_TOKEN or GITHUB_API_TOKEN when available.
 * - Falls back to anonymous (60 req/hr) when no token is present.
 * - Files are read at an exact commit, so a new file doesn't wait on the
 *   5-minute cache that raw.githubusercontent.com keeps for branch URLs.
 */

const API_BASE = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

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

/**
 * Resolve a branch to its commit. Returns null on 404, because a repo without
 * this branch is a valid state (a vendored upstream, for example).
 */
export async function fetchHeadCommit(ownerRepo: string, ref: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/repos/${ownerRepo}/commits/${encodeURIComponent(ref)}`, {
    headers: authHeaders('application/vnd.github.sha'),
  });
  if (res.status === 404 || res.status === 422) return null;
  if (!res.ok) throw new Error(describeFailure(res, `${ownerRepo}@${ref}`));
  return (await res.text()).trim();
}

/** List every file in a commit. One API call, however deep the repo goes. */
export async function fetchTree(ownerRepo: string, commit: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/repos/${ownerRepo}/git/trees/${commit}?recursive=1`, {
    headers: authHeaders('application/vnd.github+json'),
  });
  if (!res.ok) throw new Error(describeFailure(res, `the file list of ${ownerRepo}@${commit}`));

  const body = (await res.json()) as {
    truncated: boolean;
    tree: Array<{ path: string; type: string }>;
  };
  if (body.truncated) throw new Error(`GitHub truncated the file list of ${ownerRepo}.`);
  return body.tree.filter((node) => node.type === 'blob').map((node) => node.path);
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
