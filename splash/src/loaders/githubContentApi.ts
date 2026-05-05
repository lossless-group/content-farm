/**
 * Minimal GitHub Content API client for build-time content roll-up.
 *
 * - Authenticated via GITHUB_TOKEN (CI) or GITHUB_API_TOKEN (local) when available.
 * - Falls back to anonymous (60 req/hr rate limit) when no token is present.
 * - Treats 404s as "directory missing" — never throws on missing content.
 *
 * See `pseudomonorepos/references/content-rollup.md` for the convention.
 */

const API_BASE = 'https://api.github.com';

export interface ContentEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url: string | null;
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GITHUB_API_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'content-farm-rollup-loader',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Returns true if running with an authenticated token (vs anonymous). */
export function isAuthenticated(): boolean {
  return Boolean(process.env.GITHUB_TOKEN ?? process.env.GITHUB_API_TOKEN);
}

/**
 * List directory contents at a given path. Returns null on 404 (missing dir
 * is a valid state for a submodule that hasn't adopted our conventions yet).
 * Throws on other unexpected errors so the build fails loudly when something
 * is genuinely broken (network, auth, rate limit).
 */
export async function listDirectory(
  ownerRepo: string,
  path: string,
  ref: string,
): Promise<ContentEntry[] | null> {
  const url = `${API_BASE}/repos/${ownerRepo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: authHeaders() });

  if (res.status === 404) return null;
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw new Error(
        `GitHub API rate limit exhausted while listing ${ownerRepo}/${path}@${ref}. ${
          isAuthenticated() ? 'Authenticated quota' : 'Anonymous quota — set GITHUB_TOKEN to raise the limit'
        }.`,
      );
    }
    throw new Error(`GitHub API 403 while listing ${ownerRepo}/${path}@${ref}: ${await safeText(res)}`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} while listing ${ownerRepo}/${path}@${ref}: ${await safeText(res)}`);
  }

  const body = (await res.json()) as ContentEntry | ContentEntry[];
  return Array.isArray(body) ? body : [body];
}

/**
 * Recursively list all `.md` files under a path. Walks subdirectories.
 * Returns an empty array when the root path is missing (404).
 */
export async function listMarkdownRecursive(
  ownerRepo: string,
  path: string,
  ref: string,
): Promise<ContentEntry[]> {
  const top = await listDirectory(ownerRepo, path, ref);
  if (!top) return [];
  const files: ContentEntry[] = [];
  for (const entry of top) {
    if (entry.type === 'file' && entry.name.endsWith('.md')) {
      files.push(entry);
    } else if (entry.type === 'dir') {
      const nested = await listMarkdownRecursive(ownerRepo, entry.path, ref);
      files.push(...nested);
    }
  }
  return files;
}

/** Fetch the raw text of a file via its `download_url`. */
export async function fetchRawFile(downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch raw file ${downloadUrl}: ${res.status} ${await safeText(res)}`);
  }
  return res.text();
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<unreadable response body>';
  }
}
