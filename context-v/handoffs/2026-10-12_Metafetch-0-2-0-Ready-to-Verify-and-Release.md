---
title: "Handoff — Metafetch 0.2.0: Built, Pushed, Waiting on an In-Obsidian Check and a Release"
lede: "Metafetch 0.2.0 is on development: the og:image fix, the 1.13 upgrade, folder profiles with socials, and any-model fields. Nothing is released yet."
summary: "Session handoff for Metafetch after the 2026-10-08 session. Records what 0.2.0 contains (the og:image fix, the Obsidian 1.13 upgrade, Cite Wide's extractor fixes, folder profiles and social links, model recipes for any LLM API), the exact repo state, what was verified and how, the two things only the operator can confirm inside Obsidian, the release steps, the open decisions, and the follow-ups. Pair with the 2026-10-07 family-migration handoff for the release procedure, and with content-farm/context-v/blueprints/Model-Recipes-for-Any-LLM-API.md for the cross-plugin pattern."
publish: true
date_created: 2026-10-12
date_modified: 2026-10-12
date_authored_initial_draft: 2026-10-12
date_authored_current_draft: 2026-10-12
date_authored_final_draft:
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5.5
at_semantic_version: 0.0.0.1
site_uuid: 73489c57-421e-44ac-b191-d9c8fab258b5
hex_code: bcof7p
status: Active
tags:
  - Handoff
  - Obsidian-Plugin
  - Metafetch
  - Release-0-2-0
  - LLM
related:
  - "[[2026-10-07_Upgrading-Plugins-to-Obsidian-1-13-and-the-Current-Stack]]"
  - "[[Model-Recipes-for-Any-LLM-API]]"
  - "[[Folder-Aware-Frontmatter-Templates-and-Fetch-Recipes]]"
type: Handoffs
---

# Handoff — Metafetch 0.2.0: Built, Pushed, Waiting on an In-Obsidian Check and a Release

## Where things stand (2026-10-12)

| | State |
|---|---|
| Metafetch `development` | `71160c6`, pushed, clean. 16 commits ahead of `main` and `master`. |
| Version | `0.2.0` in `manifest.json`, `package.json`, `versions.json`; `minAppVersion` `1.13.0` |
| Last tag / release | `0.1.7`. **0.2.0 is not tagged or released.** |
| content-farm `development` | `dc6c7dd`, pushed, clean. Submodule pointer is on Metafetch `71160c6`. |
| Gates | 158 tests pass; `tsc` clean; `eslint .` 0 errors, 0 warnings; production build loads with all 8 commands (the handoff loader); CI's `pnpm@10 install --frozen-lockfile` and build pass. |
| Vault | Loads Metafetch through a symlink to the repo, so the built `main.js` is what Obsidian runs after a Cmd+Q restart. |

## What 0.2.0 contains

1. **The og:image bug (the original report).** Direct Fetch read only `<meta property="og:image">` with quoted attributes, and wrote `og_image: null` over a stored image whenever a page had none. It now reads `og:image` / `twitter:image` under `property=` or `name=` (Filmora), `og:image:url`, `og:image:secure_url`, `twitter:image:src`, `itemprop="image"` (Google), `<link rel="image_src">`, and JSON-LD `image`, quoted or not. A missing value never blanks a stored one.
   - Probing the vault's 50 image-less notes showed most of those pages publish no image at all; for them, empty is correct.
2. **The Obsidian 1.13 upgrade**, per the family checklist: own `pnpm-workspace.yaml` with `allowBuilds`, pinned toolchain, Cite Wide's test harness, declarative settings tab, sentence-case UI, lint clean under `eslint-plugin-obsidianmd`, `pnpm build` runs ESLint.
3. **Cite Wide's extractor fixes**, copied back: quote-aware attributes, named entities, the right favicon, JSON-LD / labelled `twitter:data1` / byline author fallbacks with a plausibility filter, and bot-check titles treated as a failed fetch.
4. **Folder profiles and social links.** New command **Fill frontmatter from folder profile**.
   - **Profiles:** files in `zz-cf-lib/frontmatter/`, with `applies-to-paths` globs and a `metafetch-profile` block. The most specific glob wins; a tie asks.
   - **Socials filled:** a Tooling note's `github_profile_url` (the org), `github_repo_url`, `linkedin_url`, `x_url`, `youtube_channel_url`, Discord, Instagram, Facebook, Bluesky, Crunchbase, all read from the company's homepage.
   - **Link ranking:** JSON-LD `sameAs`, then footer, then nav, with credit for a handle that resembles the brand. A body-only, unbranded link is never used, and a tie writes nothing.
   - **Fills empty fields only:** aliases are read, never renamed. `github_url` is deliberately never read or written; the operator is sorting those by hand.
   - **Writes:** go through `processFrontMatter`.
   - **Dry run:** on 20 real Tooling notes, 16 gained links. Three sites refused a plain fetch (403/429/525).
5. **Model recipes: any LLM API.**
   - **Model fields:** a profile field with `from: [model]` and a `describe:` instruction (optionally `type: enum` / `list` with `values`) is filled after the free parse, in one call per note, from the page's text. The reply is validated per field before anything is written, and URLs are never asked of a model.
   - **Built-in providers:**
     - Claude: `claude-opus-5-5`, JSON-schema reply, server-side fallback.
     - OpenAI: `gpt-6-astra`, strict schema.
     - TrustedRouter: `openai/gpt-6-astra`.
     - OpenAI-compatible: any base URL.
   - **Any other API:** a `cf-recipe` file in `zz-cf-lib/recipes/`. **Create example model recipe** writes one for Gemini's native API.
   - **Keys:** picked from Obsidian's vault-wide keychain (`SecretComponent` + `app.secretStorage`). Only the secret's name sits in settings.
   - **Where keys may go:** a bundled recipe's key only to its own host; a vault recipe's key nowhere until its host is approved in settings. Plain http only to localhost.
   - **Live-verified 2026-10-08:** one call each to `claude-opus-5-5` and `gpt-6-astra` returned valid JSON for tina.io.

## Next session, in order

### 1. Verify inside Obsidian (only the operator can)

Quit Obsidian with **Cmd+Q** (a window close leaves the old `main.js` running), reopen, then:

- [ ] **Settings → Metafetch:** settings search finds rows (try "LinkedIn"); each provider group shows an **API key** row. Pick or create a secret (e.g. `anthropic`) under **Claude (Anthropic)**. This is the one row the tests could only stand in for.
- [ ] Add the model field to the existing `zz-cf-lib/frontmatter/tooling-socials.md` (it was created before model fields existed), at the end of `fields:`:
  ```yaml
    zinger:
      from: [model]
      describe: "One punchy sentence, under 90 characters, saying what this does and for whom."
  ```
- [ ] Run **Fill frontmatter from folder profile** on a Tooling note with a `url`. Check that **only new lines are added** to its frontmatter, with existing lines untouched. This is `processFrontMatter`'s job, untestable outside Obsidian.
- [ ] Run **Direct fetch from script** on a page known to have an image (Filmora: `https://filmora.wondershare.com/`) and on one without (Founders Fund). The image is filled, or the stored one is kept.

If anything misbehaves, the developer console (Cmd+Opt+I) shows Metafetch's errors; recipe problems log as `Metafetch recipe: …`.

### 2. Release 0.2.0

Follow step 8 of [[2026-10-07_Upgrading-Plugins-to-Obsidian-1-13-and-the-Current-Stack]]:

1. In `changelog/releases/0.2.0.md`, set `status: Published` and `date_first_published`.
2. Fast-forward `development` → `main` → `master` (`git merge-base --is-ancestor` first; Metafetch's default branch is `master`).
3. `git tag -a 0.2.0 -m "…"` (no `v`), push the tag, `gh run watch` on `release.yml`.
4. Verify the assets (exactly `main.js`, `manifest.json`, `styles.css`) and `gh attestation verify` each one.
5. Update the GitHub "About" text to match the manifest: `gh repo edit lossless-group/metafetch --description "Pull OpenGraph metadata from any URL into note frontmatter — title, image, description, publisher — directly, or via OpenGraph.io or Microlink."` Consider adding "socials and any model" now that it does both.
6. Bump the content-farm submodule pointer at wrap-up.

## Decisions still open

- **One release or two?** Everything shipped in 0.2.0 by choice: the socials and model features were added to the unreleased version rather than starting 0.3.0. Splitting means moving those changelog sections and bumping to 0.3.0 for the later commits.
- **Default models.** `claude-opus-5-5` and `gpt-6-astra` are the most capable defaults. A homepage is about 6,000 tokens, so a model fill costs a few cents a note, and a run over ~1,200 Tooling notes is real money. Cheaper choices (`claude-sonnet-5-5`, `claude-haiku-4-5`, `gpt-6.1-sol`, `gpt-6-luna`) are one settings field each.
- **Exploration questions 1–3** were settled provisionally for slice 1: the parser is copied into Metafetch, aliases are read-through only, and no provenance property is written. Revisit if renaming drifted keys (`github_profle_url` → `github_profile_url`) or tracking which source filled a field becomes wanted.

## Follow-ups (not started)

- **Folder batch** for "Fill frontmatter from folder profile", with concurrency, a cost preview before model calls, and a per-note report.
- **Firecrawl fallback** for sites that refuse a plain fetch (Uiverse, Contentful, Mocha in the dry run), as a recipe with its key in the keychain. This is slice 2 of the exploration.
- **Direct fetch from script** (`runFetchScript`) still rewrites the whole frontmatter block, re-quoting every value. Moving it to `processFrontMatter` is a small change, but it changes behavior, so it was left for a decision.
- **Brand assets.** The extractor parses app icon, logo, mask icon, and brand color but only writes the favicon. Writing the rest needs field-name settings.
- **The rest of the family:**
  - Six plugins still need the 1.13 upgrade (stenographer, plunk-it, lmstud-yo, file-transporter, filestarter, image-wrangler); see the 2026-10-07 handoff.
  - Plugins with model keys can adopt model recipes from the blueprint.
  - Moving every plugin's plaintext keys into the keychain is worth doing now.

## Where to look

| What | Path (under `plugin-modules/metafetch/` unless noted) |
|---|---|
| The plan for the upgrade and image fix | `context-v/plans/2026-10-08_Upgrade-Metafetch-to-Obsidian-1-13.md` |
| The plan for profiles and socials | `context-v/plans/2026-10-08_Folder-Profiles-and-Social-Links.md` |
| The design exploration (profiles, recipes, three command kinds) | `context-v/explorations/Folder-Aware-Frontmatter-Templates-and-Fetch-Recipes.md` |
| The family pattern for model calls | `content-farm/context-v/blueprints/Model-Recipes-for-Any-LLM-API.md` |
| Release notes (draft) | `changelog/releases/0.2.0.md` |
| Changelog entries | `changelog/2026-10-08_01.md` (image + upgrade), `_02` (socials), `_03` (models) |
| Code | `src/services/directFetchService.ts`, `socialLinks.ts`, `frontmatterProfiles.ts`, `modelRecipes.ts`, `modelProviderSettings.ts`; `src/commands/fillFromProfile.ts` |

## Gotchas from this session

| Gotcha | Fix |
|---|---|
| The `yaml` devDependency's CommonJS build breaks esbuild ESM test bundles ("Dynamic require of process") | `external: ['yaml']` in `scripts/run-tests.mjs`; it never reaches `main.js` |
| Rewriting the whole frontmatter block re-quotes every value | New writes go through `app.fileManager.processFrontMatter` |
| `String.replace(regex, string)` expands `$&` / `$1` inside values | `withFrontmatter()` uses a replacer function |
| Facebook `profile.php?id=…` lost its id when query strings were stripped | Special-cased in `classifySocialUrl()` |
| A blocked homepage's footer offered the CDN's own X account | A homepage whose title is a bot check contributes no socials |
| Heredocs that write TypeScript template literals double the backslash before backticks | Fix with `sed`, or write the file with the Write tool |
| `ls` and `cat` are aliased (`eza`, `bat`) in this shell | Use `command ls`; `bat` rejects `cat -v` |
