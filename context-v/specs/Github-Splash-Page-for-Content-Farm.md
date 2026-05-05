---
title: "Github Splash Page for Content Farm"
lede: "An in-repo Astro site that turns the content-farm pseudomonorepo into a public landing page — hero, plugin gallery, changelog and context-v rendering — deployed for free off GitHub Pages while we wait for a real marketing surface."
date_created: 2026-05-04
date_modified: 2026-05-04
authors:
  - Michael Staton
augmented_with:
  - Pi on Claude Opus 4.7 (1M context)
semantic_version: 0.0.0.1
tags:
  - Spec
  - Astro-Knots
  - Github-Pages
  - Content-Farm
status: Draft
---

# Github Splash Page for Content Farm

<!-- developing -->

## Locked decisions

- **Location:** `content-farm/splash/` at the pseudomonorepo root. Named `splash` (not `site`, not `apps/<name>`) to leave linguistic space for a future custom-domain marketing site without renaming this one.
- **Deploy URL:** `https://lossless-group.github.io/content-farm/` — preferred over a custom domain so external pages can point back to the GitHub Pages URL.
- **Build trigger:** push to `main`. Aligns with the development → main → master tier model: things land on `main` when they're noteworthy enough to publish.
- **Plugin gallery:** hand-curated by coding agents; no algorithmic manifest pulling. Agents will edit the curated list when the plugin set changes.
- **Gallery source-of-truth:** an Astro content collection at `splash/src/content/plugin-highlights/*.md`. One markdown file per plugin; YAML frontmatter carries the display props (title, lede, repo URL, icon, status, tags, etc.). The `order` property (integer) drives sort. On ties, fall back to alphabetical by filename — never throw. The body of each .md is rendered as the long-form description (LFM where applicable).

## Prior art

- `lossless-monorepo/context-v/habits/Maintain-a-Github-Splash-Page-for-each-Repo.md` — the habit this spec implements. Calls for splash + changelog + context-v rendering, with LFM.
- `ai-labs/memopop-ai/apps/memopop-site/` — first instance of the pattern. Astro + Tailwind, `base: '/memopop-ai/'`, content collections globbing `../../changelog/`. LFM not yet wired in.
- `lossless-monorepo/site/src/pages/projects/gallery/content-farm.astro` — existing gallery copy. Source for hero text ("Content Farm: a Suite of Plugins for Obsidian — Streamlined content creation and data preparation for AI-powered workflows") and the alternating-side feature pattern.

## Phase 1 — what got built

Layout improvised (per "just go" direction): asymmetric 6-col grid where `featured: true` cards span 4 columns and others span 2; falls to single-column on narrow viewports. Hover state uses pointer-tracked radial highlight via vanilla JS — no framework.

Sections on the index: hero, plugin gallery, four-card philosophy, latest-changelog teaser (renders only when entries exist), notes CTA.

LFM punted to a follow-up. Markdown rendering uses Astro's built-in `render(entry).Content`. The `prose` class in detail pages is the styling target where LFM-rendered components will eventually plug in. Frontmatter schema is lenient (z.preprocess) so adding LFM-specific fields later won't break existing files.

context-v rendering scope: defaults to "everything except `publish: false`" — list view groups by top-level subdirectory (specs, blueprints, plans, prompts, chores, reminders, explorations, issues, habits) with a stable sort order. Files at the root of context-v/ fall into a "general" group.

Build trigger wired: `.github/workflows/pages.yml` at `content-farm/.github/workflows/`, triggered on push to `main`, deploys via `actions/deploy-pages@v4`. Submodules fetched recursively in case a future iteration surfaces plugin-level changelogs.

## File layout (Phase 1)

```
content-farm/
├── splash/
│   ├── astro.config.mjs        # base: '/content-farm/'
│   ├── package.json            # astro + @astrojs/tailwind + tailwindcss
│   ├── README.md               # local dev / deploy / curation notes
│   ├── tsconfig.json
│   ├── public/favicon.svg      # gradient-stroked content-farm mark
│   └── src/
│       ├── content.config.ts   # plugin-highlights, changelog, context-v collections
│       ├── content/plugin-highlights/
│       │   ├── image-gin.md (featured)
│       │   ├── cite-wide.md (featured)
│       │   ├── perplexed.md (featured)
│       │   ├── lmstud-yo.md
│       │   ├── grab-reference.md
│       │   ├── plunk-it.md
│       │   ├── file-transporter.md
│       │   ├── filestarter.md
│       │   └── obsidian-git.md
│       ├── layouts/BaseLayout.astro    # tokens, fonts, mesh background
│       ├── components/PluginCard.astro # pointer-tracked hover, status pill
│       └── pages/
│           ├── index.astro
│           ├── changelog/index.astro
│           ├── changelog/[...slug].astro
│           ├── context-v/index.astro
│           └── context-v/[...slug].astro
└── .github/workflows/pages.yml         # build splash + deploy on push to main
```

## Phase 1 acceptance

- `pnpm install --ignore-workspace` succeeds (parent monorepo's pnpm-workspace.yaml does not include content-farm; ignore-workspace flag is required)
- `pnpm build` produces 8 pages from current content (1 index, 1 changelog list with empty state, 1 context-v list, 5 context-v detail pages — including this spec)
- All routes resolve under `/content-farm/` base path

## Follow-ups (for future phases)

- **Content roll-up from submodules** (priority). The `/changelog` and `/context-v` listings currently surface only content-farm's own files. The intent is to roll up each plugin submodule's `changelog/` and `context-v/` into the same feeds via the GitHub Content API at build time, with provenance on each card so a reader can filter to a specific plugin. Authenticated calls keyed off `.gitmodules` (`url =` → `{owner}/{repo}`, `branch =` → `ref`). Token from `GITHUB_TOKEN` in CI, a local PAT in dev. See `pseudomonorepos/references/content-rollup.md` for the loader sketch and failure modes.
- **LFM integration.** Add `@lossless-group/lfm` as a dep and wire the renderer for `.prose` content. Once the `lfm` skill ships, follow that for component-trigger syntax.
- **Plugin-modules pages.** Optional: per-plugin detail page that aggregates the plugin's own README + changelog (read from the submodule directory). Subsumed by roll-up if we also expose `/changelog?from=<plugin>` filters.
- **OG image generation.** Static OG card generated at build time per-page. Currently only the global one is emitted.
- **Refactor candidate.** This is the second instance of the splash pattern (memopop-site is the first). When a third repo wants the same thing, generalize a template — likely as an `astro-knots/sites/` stub or a CLI scaffold.

