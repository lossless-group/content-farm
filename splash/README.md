# content-farm/splash

GitHub Pages splash for the [content-farm](https://github.com/lossless-group/content-farm) pseudomonorepo.

Live: <https://lossless-group.github.io/content-farm/>

## What this is

A small Astro site that:

1. Greets visitors with a hero, philosophy, and a curated gallery of the nine plugins under `plugin-modules/`.
2. Renders the parent's `context-v/` and (when present) `changelog/` as readable archives.
3. Deploys for free off GitHub Pages on push to `main`.

It is **not** the eventual marketing site for content-farm — when that exists, it'll live elsewhere with its own custom domain. The directory is named `splash/` precisely to keep that linguistic space open.

## Local dev

```bash
pnpm install
pnpm dev
```

The dev server respects `base: '/content-farm/'`, so visit <http://localhost:4321/content-farm/>.

## Build

```bash
pnpm build
pnpm preview
```

Static output lands in `dist/`.

## Where things live

| Path | Purpose |
|---|---|
| `src/pages/index.astro` | Hero, plugin gallery, philosophy, latest changelog |
| `src/pages/changelog/` | List + detail for `../changelog/*.md` |
| `src/pages/context-v/` | List + detail for `../context-v/**/*.md` (publishable items) |
| `src/content/plugin-highlights/*.md` | Curated plugin cards. Edit these to update the gallery. |
| `src/layouts/BaseLayout.astro` | Global tokens, fonts, head, body shell |
| `src/components/` | PluginCard, Section, etc. |

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

`.github/workflows/pages.yml` (in the parent repo root) builds this site on push to `main` and deploys via the `actions/deploy-pages` action. Configure GitHub Pages on the `content-farm` repo to "GitHub Actions" as the source.

## See also

- `content-farm/context-v/specs/Github-Splash-Page-for-Content-Farm.md` — the spec this site implements
- `lossless-monorepo/context-v/habits/Maintain-a-Github-Splash-Page-for-each-Repo.md` — the habit calling for one of these per repo
- `ai-labs/memopop-ai/apps/memopop-site/` — the first instance of the pattern
