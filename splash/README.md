# content-farm/splash

Splash for the [content-farm](https://github.com/lossless-group/content-farm) pseudomonorepo.

## What this is

A small Astro site that:

1. Greets visitors with a hero, philosophy, and a curated gallery of the nine plugins under `plugin-modules/`.
2. Renders the parent's `context-v/` and (when present) `changelog/` as readable archives.
3. Reads every plugin's `changelog/` and `context-v/` from GitHub when a page is requested, so new documents appear without a rebuild.

It is **not** the eventual marketing site for content-farm — when that exists, it'll live elsewhere with its own custom domain. The directory is named `splash/` precisely to keep that linguistic space open.

## Local dev

```bash
pnpm install --ignore-workspace
pnpm dev
```

Then visit <http://localhost:4321/>.

The dev server reads content from GitHub too, so it needs a token (see below).

> `--ignore-workspace` is required because the parent `lossless-monorepo` declares a pnpm workspace that doesn't include this site; the splash installs its own deps independently.

## How new content appears

Push a markdown file to `changelog/` or `context-v/` in content-farm or any repo in its `.gitmodules`, on the branch `.gitmodules` names. It appears on the site with no rebuild, sync, or commit here. A new plugin works the same way: add the submodule and its documents appear.

`src/live.config.ts` defines `changelog` and `context-v` as [live collections](https://docs.astro.build/en/guides/content-collections/), and `src/loaders/corpus.ts` keeps them current:

- **Checking is free.** Each server instance asks GitHub whether each repo's branch has moved, at most once a minute. These are conditional requests, and a 304 doesn't count against the rate limit.
- **Only changes are downloaded.** A repo that moved costs one more API call for its file list. Only files whose blob changed are fetched again.
- **Files are read at an exact commit,** so they skip the 5-minute cache on branch URLs.
- **The CDN keeps pages fast.** `src/middleware.ts` caches a page for 60 seconds, then keeps serving it for up to an hour while fetching a fresh copy. After a quiet spell, the first visitor can see the older copy and the next one sees the new content.

If a repo can't be read, the instance keeps its last good copy of that repo. Entry pages return 503 only if there's nothing to serve, and nothing built during a failure is cached.

`plugin-highlights` is still a build-time collection, so editing a card needs a deploy.

### Token

Reading from GitHub needs a token: anonymous requests get 60 calls an hour, and a fresh instance needs about 30. Set `GITHUB_API_TOKEN` in Vercel and in `splash/.env`. It only needs read access to public repositories. A fine-grained token with no extra permissions is enough.

```bash
echo "GITHUB_API_TOKEN=$(gh auth token)" >> splash/.env   # local dev only
```

## Build

```bash
pnpm build
```

Output lands in `.vercel/output/`. `astro preview` doesn't work with the Vercel adapter, so use `pnpm dev` or a preview deployment.

## Where things live

| Path | Purpose |
|---|---|
| `src/pages/index.astro` | Hero, plugin gallery, philosophy, latest changelog |
| `src/pages/changelog/` | List + detail for every repo's `changelog/`, rendered per request |
| `src/pages/context-v/` | List + detail for every repo's `context-v/`, rendered per request |
| `src/content/plugin-highlights/*.md` | Curated plugin cards. Edit these to update the gallery. |
| `src/live.config.ts` | The `changelog` and `context-v` live collections and their schemas. |
| `src/content.config.ts` | The build-time `plugin-highlights` collection. |
| `src/loaders/` | The live loader and corpus cache, GitHub client, `.gitmodules` parser, and minimal frontmatter parser (no `gray-matter`). |
| `src/layouts/BaseLayout.astro` | Global tokens, fonts, head, body shell |
| `src/components/` | PluginCard, etc. |

### Path aliases

`tsconfig.json` declares short aliases so loader code never needs guesswork relative paths: `@components/*`, `@layouts/*`, `@loaders/*`, `@content/*`, `@pages/*`, `@/*`. Use them.

## Curating the plugin gallery

Each plugin gets one markdown file under `src/content/plugin-highlights/`. Frontmatter:

```yaml
---
title: cite-wide              # display name
lede: One-sentence pitch.     # appears under the title
order: 10                     # integer, lower sorts first
status: Stable                # Stable | Beta | Alpha | Experiment
repo: https://github.com/lossless-group/cite-wide
icon: 📚                      # emoji or path under public/
featured: true                # featured cards take a wider tile in the grid
tags: [Citations, Research]
---

Long-form description in markdown. Renders as the card's expanded body.
```

`order` ties are broken alphabetically by filename — never throws.

## Deploy

Vercel builds this directory (`output: 'server'`, `@astrojs/vercel`). Set these in the project:

| Variable | Purpose |
|---|---|
| `GITHUB_API_TOKEN` | Reads content from GitHub at request time |
| `OPENPANEL_CLIENT_ID` | Public analytics ID, read at build time |
| `SITE_URL` | Optional. Set it when a custom domain is added; otherwise the Vercel production URL is used |

GitHub Pages no longer hosts the site. `.github/workflows/pages.yml` (in the parent repo root) publishes `pages-redirect/` so old `lossless-group.github.io/content-farm/` links land on the same page at the new address. Set the repo variable `SPLASH_URL` to the new address first. Without it the workflow fails on purpose, and Pages keeps serving what it already has.

## See also

- `content-farm/context-v/specs/Github-Splash-Page-for-Content-Farm.md` — the spec this site implements
- `lossless-monorepo/context-v/habits/Maintain-a-Github-Splash-Page-for-each-Repo.md` — the habit calling for one of these per repo
- `ai-labs/memopop-ai/apps/memopop-site/` — the first instance of the pattern
