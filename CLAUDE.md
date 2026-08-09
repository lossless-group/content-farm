# Agent instructions for `content-farm` (the Obsidian plugin family pseudomonorepo)

## What this is

`content-farm` is a child of `lossless-monorepo` and itself a pseudomonorepo —
a parent that aggregates child repos primarily to host a parent-level
`context-v/`. It is the **home for The Lossless Group's family of Obsidian
plugins**: image generation, citation formatting, web-research integration,
local-LLM bridging, metadata fetching, file transport, and the other
content-authoring affordances we keep extending.

The directory is two things at once and both shapes matter:

1. **A standalone Obsidian plugin in its own right** — the top-level
   `main.ts` / `manifest.json` / `esbuild.config.mjs` ship the umbrella
   "Content Farm" plugin that bundles the most stable modules into one
   installable package for end users.
2. **A pseudomonorepo of individual plugins** — `plugin-modules/`
   contains each Lossless plugin as its own git submodule, plus a few
   vendored upstream plugins we study or extend.

When adding a new plugin, default to writing it as its own
`plugin-modules/<name>/` submodule first, with its own `manifest.json`,
`changelog/`, `context-v/`, and Obsidian-plugin scaffold. Promote into
the umbrella plugin only when the module has earned independent users
and is stable enough that bundling it doesn't churn the umbrella's
release cadence.

## Children of this tree

Current children of `plugin-modules/` (run `cat .gitmodules` for the
authoritative list — this is a snapshot):

| Plugin | Purpose |
|---|---|
| `image-gin/` | AI image generation (Recraft, Freepik, ImageKit upload/CDN) — modal-driven from Obsidian commands |
| `cite-wide/` | Citation formatting with hex-coded unique markers, designed for cross-vault citation tracking |
| `perplexed/` | Local Perplexica integration for citation-driven web research |
| `lmstud-yo/` | LM Studio bridge — call local models from Obsidian commands |
| `metafetch/` | OpenGraph / metadata fetcher for URLs pasted into Obsidian |
| `file-transporter/` | Move and reorganize files within a vault with rules |
| `filestarter/` | Scaffold new content files from templates with frontmatter |
| `grab-reference/` | Capture references (URLs, papers, etc.) into a vault structure |
| `plunk-it/` | (check the module README) |
| `obsidian-git/` | Vendored upstream — study, do not modify |
| `obsidian-textgenerator-plugin/` | Vendored upstream — study, do not modify |

The Lossless plugins above are Lossless-authored; the two `obsidian-*`
plugins are vendored upstream as reference material and should not be
edited here.

## Language & build conventions

- **TypeScript-first** for every plugin module. Plain JS only when
  patching legacy code or interop with non-TS Obsidian APIs.
- **`pnpm`** at the workspace level; each plugin module may have its
  own `package.json` with `pnpm` or `bun` per its own conventions.
- **`esbuild`** is the build tool for the umbrella plugin and the
  default for new plugin modules (`esbuild.config.mjs` at the module
  root produces `main.js` from `main.ts`).
- **Obsidian plugin spec discipline**:
  - `manifest.json` is the source of truth for plugin version, name,
    `minAppVersion`, and `isDesktopOnly` flag
  - `versions.json` tracks compatibility per Obsidian version; the
    `version-bump.mjs` script keeps `manifest.json` and `versions.json`
    aligned — run it from inside each module, not from here
  - Never commit a `main.js` whose version field disagrees with
    `manifest.json`

## Branch tier model

Three tiers, mirrored from the root: **`development` → `main` → `master`**.

Parent on tier X → all submodules on tier X. See the root `CLAUDE.md`
and `context-v/skills/pseudomonorepos/references/branch-alignment.md` for
the FF mechanics, divergence checks, and push-to-default-branch caveats.

Some plugin modules have their own `CLAUDE.md` with module-specific
guidance — those override anything here for their own scope.

## Local RAG over the Lossless corpus (ChromaDB)

A local Chroma database is wired into Claude Code via the `chroma` MCP server. Four collections aggregate prior Lossless work across the whole tree:

- `context-vigilance-corpus` — section-chunked `context-v/` files across every repo
- `lossless-changelog`        — every `<repo>/changelog/` entry, cross-repo
- `claude-code-sessions`      — every prior Claude Code message turn
- `claude-code-tool-traces`   — every prior tool invocation, with success/error flag

**Use it before answering from training data.** When the user asks a question that prior work might answer — *"what did we decide about X"*, *"when did we ship X"*, *"why did we choose X over Y"*, *"has this errored before"*, *"where did we put X"* — call `mcp__chroma__chroma_query_documents` against the most relevant collection (start with `n_results=5`). If results cover the question, synthesize an answer and cite `source_path` + timestamp + `source_repo_slug` for every claim. If there is a gap, run one more focused query. **Cap at 5 chroma queries per question** — if the corpus has no answer, say so explicitly rather than silently falling back to training data.

The full algorithm (decompose → execute → evaluate → synthesize, plus `where`-filter patterns, anti-patterns, and when NOT to use it) lives in the `search-lossless-corpus` skill, which auto-loads when the question matches the trigger shapes. This block is the backstop so the corpus is known to exist even when the skill description does not match.

Ingestion lives under `ai-labs/context-vigilance-kit/scripts/` (`ingest-all.sh` is the master). Do not re-ingest as a side effect of unrelated work — the user runs it deliberately.

## Dependabot alerts on plugin repos — read this before triaging

GitHub Dependabot will surface "N high / M moderate / K low vulnerabilities" on every push to a plugin repo's default branch. Almost all of these are dev-toolchain transitives (ESLint / TypeScript / esbuild → minimatch / picomatch / brace-expansion / flatted / ajv / js-yaml) or stale alerts for packages we removed long ago (fastify, MCP SDK, body-parser, qs, path-to-regexp from the starter-template fork lineage). **The Obsidian plugins ship only the esbuild-bundled `main.js` + `manifest.json` + `styles.css`** — dev-tool transitives never reach end users.

The full triage playbook (three buckets — removed / already-fixed / dev-tool-transitive — plus the bulk-dismiss `gh api` script with categorized rationales, the 280-char comment cap and other API gotchas, and the historical 86-alert dismissal from 2026-05-17) lives at `../context-v/issues/Dependabot-Alerts-Triage-Playbook-For-Lossless-Repos.md`. Read it before manually clicking dismiss in the GitHub UI; the script handles all three plugins in one pass with categorized comments. Do not propose `pnpm.overrides` as a Dependabot-shutup strategy — see the "What We Don't Recommend" section of the playbook for why.

## Skills sync — opening & closing habit

Lossless skills live in `context-v/skills/<name>/` at the anchor monorepo root
(`/Users/mpstaton/code/lossless-monorepo/context-v/skills`). Claude Code only
discovers a skill when it has its **own** direct-child symlink at
`~/.claude/skills/<name>` — a symlinked *parent* dir does **not** expose the
skills nested inside it. A skill that's authored but never linked is invisible
to every session.

- **Opening (session start):** sync so any skills added since last session are linked.
- **Closing (after authoring or editing any skill):** sync again — newly-linked
  skills load in the *next* session, not the current one.

```bash
bash /Users/mpstaton/code/lossless-monorepo/context-v/skills/sync-skills-symlinks.sh
```

Idempotent: links every `context-v/skills/*` dir with a top-level `SKILL.md`
that isn't already linked; never clobbers a non-symlink. Re-run it freely.

## See also

- `../CLAUDE.md` — root, the HARD STOP relocation rules and tree-wide guidance
- `README.md` — the public-facing description of the umbrella plugin
- `plugin-modules/cite-wide/CLAUDE.md`, `plugin-modules/image-gin/CLAUDE.md` —
  module-specific guidance that overrides this file for those scopes
- `context-v/skills/search-lossless-corpus/SKILL.md` — full Chroma querying discipline (via the parent skills tree)
- `../context-v/issues/Dependabot-Alerts-Triage-Playbook-For-Lossless-Repos.md` — the standing playbook for the recurring "what is Dependabot saying" question across every plugin repo

<!-- lossless:browser-drive:start -->
## Browser-drive verification (Playwright MCP + Claude Chrome)

Agents verify UI work by driving a real browser BEFORE asking a human to walk the surface. Two tiers:

- **Codified (default): Playwright MCP** — navigate/click/type, accessibility-tree snapshots, DOM assertions; headless-capable, runs unwatched. Wire it per repo at **project scope** (config lands in the committed `.mcp.json`):

  ```bash
  claude mcp add -s project playwright -- npx @playwright/mcp@latest
  ```

- **Interactive: `claude --chrome`** (or `/chrome` → enable by default) — Claude drives the operator's real Chrome while they watch; screenshots/GIFs + console and network logs.

Rules that make it safe and cheap:

1. Newly added MCP servers load in the **next** session, not the current one (same rule as skills symlinks).
2. Prefer **accessibility snapshots over screenshots** — raster is token-expensive; use it only for visual questions (layout, theme).
3. Browser-driven **reads are unrestricted; writes only against the repo's designated safe target** — never mint test entities in shared/canonical data.
4. The drive's click-path is **named in the phase plan before implementation**; a drive that lives only in a session transcript is not codified.
5. A browser drive proves the buttons **work**; the human walk-through still judges whether the surface is **usable**. It augments the human rung, never replaces it.

Full pattern: `context-v/blueprints/Browser-Drive-Verification-For-Agent-Sessions.md` at the anchor monorepo root (kit rollout draft: `ai-labs/context-vigilance-kit/context-v/blueprints/`). Loop integration proven in `ai-labs/augment-it/context-v/loops/`.
<!-- lossless:browser-drive:end -->
