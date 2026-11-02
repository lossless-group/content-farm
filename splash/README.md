# content-farm/splash

Splash for the [content-farm](https://github.com/lossless-group/content-farm) pseudomonorepo.

## What this is

A small Astro site that:

1. Greets visitors with a hero, philosophy, and a curated gallery of the nine plugins under `plugin-modules/`.
2. Renders the parent's `context-v/` and (when present) `changelog/` as readable archives.
3. Reads every plugin's `changelog/` and `context-v/` from GitHub when it builds, and rebuilds itself every 15 minutes so new documents appear on their own.

It is **not** the eventual marketing site for content-farm — when that exists, it'll live elsewhere with its own custom domain. The directory is named `splash/` precisely to keep that linguistic space open.

## Local dev

```bash
pnpm install
pnpm dev
```

Then visit <http://localhost:4321/>.

The dev server reads content from GitHub once at startup, so restart it to pick up new documents.

> `splash/pnpm-workspace.yaml` makes this site its own workspace root, so it installs its own deps independently of the parents. It also approves the `esbuild` and `sharp` build scripts. Don't pass `--ignore-workspace`, which skips those approvals and fails the install.

## How new content appears

Push a markdown file to `changelog/` or `context-v/` in content-farm or any repo in its `.gitmodules`, on the branch `.gitmodules` names. It appears on the site after the next scheduled build, with no sync or commit here. A new plugin works the same way: add the submodule and its documents appear.

`.github/workflows/pages.yml` (in the parent repo root) builds and deploys every 15 minutes, and on every push to `main`. To publish sooner, run the workflow by hand from the Actions tab. GitHub can delay scheduled runs, and it pauses them after 60 days without activity in the repo.

`src/content.config.ts` defines the collections, and `src/loaders/corpus.ts` reads them through the GitHub API. Documents come from each repo's branch tip, while the site's own code comes from `main`.

If a repo can't be read, the build fails and Pages keeps the last good site, so a GitHub hiccup can't delete a plugin's pages.

### Token

GitHub Actions passes its own `GITHUB_TOKEN`, so the deployed site needs no setup. Locally, anonymous requests get 60 calls an hour and a build needs about 30, which is usually enough. If you hit the limit, set `GITHUB_API_TOKEN` as an environment variable:

```bash
GITHUB_API_TOKEN=$(gh auth token) pnpm build
```

## Build

```bash
pnpm build
```

Output lands in `dist/`. Preview with `pnpm preview`.

## Where things live

| Path | Purpose |
|---|---|
| `src/pages/index.astro` | Hero, plugin gallery, philosophy, latest changelog |
| `src/pages/changelog/` | List + detail for every repo's `changelog/` |
| `src/pages/context-v/` | List + detail for every repo's `context-v/` |
| `src/content/plugin-highlights/*.md` | Curated plugin cards. Edit these to update the gallery. |
| `src/content.config.ts` | The `changelog`, `context-v` and `plugin-highlights` collections and their schemas. |
| `src/loaders/` | The content loader and corpus reader, GitHub client, `.gitmodules` parser, and minimal frontmatter parser (no `gray-matter`). |
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

GitHub Pages hosts the site at <https://lossless-group.github.io/content-farm/>. `.github/workflows/pages.yml` needs one repo variable, `OPENPANEL_CLIENT_ID`, the public analytics ID.

## See also

- `content-farm/context-v/specs/Github-Splash-Page-for-Content-Farm.md` — the spec this site implements
- `lossless-monorepo/context-v/habits/Maintain-a-Github-Splash-Page-for-each-Repo.md` — the habit calling for one of these per repo
- `ai-labs/memopop-ai/apps/memopop-site/` — the first instance of the pattern
