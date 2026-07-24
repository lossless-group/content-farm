---
title: "What to do with grab-reference — a citation-manager web stack living in the Obsidian plugin family"
lede: "grab-reference turns out not to be an Obsidian plugin: it's a private 'citation-manager' pnpm workspace (web app + Prisma API + Docker) on a 2024-era toolchain. Decide its fate before spending any upgrade effort on it."
date_created: 2026-07-24
date_modified: 2026-07-24
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Fable 5
semantic_version: 0.0.0.1
status: Draft
tags:
  - Issue-Resolution
  - Grab-Reference
  - Content-Farm
  - Dependency-Upgrades
---

# What to do with grab-reference

> Stub — opened while scoping the
> [[../loops/Dependency-Upgrade-Loop-For-Obsidian-Plugin-Family]] so the
> dependency campaign doesn't stall on a module whose identity is unsettled.
> **grab-reference is held out of that loop until this issue resolves.**

## Why care?

Every other Lossless module in `plugin-modules/` is an esbuild-bundled
Obsidian plugin. `grab-reference` is not: its root `package.json` is a
**private pnpm workspace named `citation-manager`** with a web frontend
(`@citation-manager/web`), a Prisma-backed `citation-service` API, Docker /
docker-compose scaffolding, and a `setup.sh` that scaffolds the project
structure. There is no `manifest.json` at the root — nothing for Obsidian to
load. The dependency-upgrade playbook for the plugin family (tsc → esbuild →
manifest sanity) simply doesn't apply to it.

## Observed state (2026-07-24)

- Toolchain is the family laggard: eslint `^8.56.0` (pre-flat-config),
  typescript `^5.3.3`, dotenv `^16.4.7`, `packageManager` pinned to
  pnpm `10.4.1`.
- `@types/dotenv@^8.2.3` sits in **dependencies** (it's a deprecated stub
  package — dotenv ships its own types).
- Recent commits are context-v/changelog housekeeping; the last substance
  commit message is "it's working again".
- CLAUDE.md's module table describes it as "Capture references (URLs,
  papers, etc.) into a vault structure" — which no longer matches what's in
  the repo.
- Confirmed via `gh repo view`: Lossless-original, **not** a fork.

## Options on the table (none chosen yet)

1. **Rehome** — it's a web service, not a plugin; move it out of
   `plugin-modules/` (e.g., under `ai-labs/` or its own child) — noting the
   HARD-STOP relocation preconditions in the root CLAUDE.md.
2. **Rebuild as an actual plugin** — the name and CLAUDE.md description
   suggest an Obsidian capture plugin was the intent; the citation-manager
   stack may overlap with what [[../../plugin-modules/cite-wide|cite-wide]]
   and `metafetch` already do.
3. **Archive** — if the citation-manager experiment is superseded, archive
   the repo and drop the submodule.
4. **Keep + modernize in place** — accept the shape, give it its own
   (web-stack) upgrade path: eslint 8→10 flat-config migration, TS bump,
   drop `@types/dotenv`.

## Next step

Operator decision on the four options. Until then: excluded from the
dependency-upgrade loop; no toolchain effort spent.
