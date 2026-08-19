---
title: "Dependency-upgrade loop for the Obsidian plugin family — patch/minor sweep, then researched majors, every build proven"
lede: "One loop that walks every Lossless-owned plugin in content-farm from stale to current: safe bumps first, majors only after reading the upstream release notes, and nothing lands without a green typecheck + esbuild bundle."
date_created: 2026-07-24
date_modified: 2026-07-24
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Fable 5
semantic_version: 0.0.0.2
revisions:
  - "2026-07-24 — v0.0.0.2 — forks split into their own Pass C (gh-verified: only obsidian-git is a true fork); grab-reference held out pending its issues stub; pnpm-preference made explicit."
  - "2026-07-24 — v0.0.0.1 — initial codification from the first dependency survey."
tags:
  - Loop
  - Dependency-Upgrades
  - Obsidian-Plugins
  - Content-Farm
  - Changelog-Conventions
  - Git-Conventions
status: Draft
site_uuid: 4ae5cc7d-cc8a-4aee-8493-65a562976317
hex_code: 5bqe46
date_authored_initial_draft: 2026-07-24
date_authored_current_draft: 2026-07-24
publish: true
---

# Dependency-upgrade loop for the Obsidian plugin family

> `context-v/loops/` is an **experimental** folder (per the context-vigilance
> skill) and this is its first occupant in content-farm. The shape follows
> the first proven loop doc,
> [[../../../ai-labs/augment-it/context-v/loops/Loop-through-Spec-Write-Plans-Implement-Test-Changelog-Commit]].
> Kin to the tree-wide `dependency-upgrade-loop` skill for Astro Knots sites —
> same doctrine (safe → risky, verify every rung, changelog, push), retargeted
> at Obsidian plugin submodules instead of Astro sites.

## What this loop is

A repo-by-repo dependency-currency campaign across the Lossless-owned plugin
modules of `content-farm`, run in **three passes**:

- **Pass A — safe sweep (originals only):** semver patch + minor bumps,
  module by module, each proven green before moving on.
- **Pass B — researched majors (originals only):** each major bump gets its
  upstream changelog/release notes read (web search) *before* the version
  moves, and our code adapts to the new API **with no functional changes** —
  the plugin does exactly what it did before, on the new dependency.
- **Pass C — forks, last:** repos that are true GitHub forks of upstream
  projects are held out of A and B entirely and handled after the originals
  are green (see below — a fork's deps usually move by syncing upstream, not
  by bumping independently).

The loop ends when every in-scope module builds green on current
dependencies, every module's `changelog/` records what moved, the parent
repo's submodule pointers are bumped, and the tracking task on GitHub is
closed.

## Scope — originals, forks, and out-of-scope

"Ours" = the `.gitmodules` URL lives under the `lossless-group` org. Within
ours, **originals** (Passes A+B) are separated from **true GitHub forks**
(Pass C) — fork status verified via `gh repo view --json isFork,parent`
on 2026-07-24, not guessed from repo names (`obsidian-plugin-starter` and
`google-docs-api-plugin` look vendored but are Lossless-original).

| Passes A + B (originals) | Pass C (forks, last) | Out of scope |
|---|---|---|
| `content-farm` umbrella (root `package.json`) | `obsidian-git` (fork of `Vinzent03/obsidian-git`) | `obsidian-textgenerator-plugin` (third-party, not our org) |
| `cite-wide` | | `grab-reference` — held out pending [[../issues/What-To-Do-With-Grab-Reference]] |
| `image-gin` | | |
| `image-wrangler` | | |
| `file-transporter` | | |
| `filestarter` | | |
| `lmstud-yo` | | |
| `metafetch` | | |
| `perplexed` | | |
| `plunk-it` | | |

## Preconditions (once, before iteration 1)

1. **Survey** — `npx npm-check-updates --cwd <module> --format group` for
   every in-scope module. (First survey ran 2026-07-24; raw reports in
   session scratchpad, summarized in the plan.)
2. **Plan** — author `context-v/plans/Dependency-Upgrades-Across-Plugin-Family.md`
   from the survey: full bump inventory grouped patch → minor → major,
   majors annotated with links to upstream release notes / migration guides
   (web-searched), and an explicit **deferred** list for majors judged not
   worth the churn this campaign.
3. **Task** — one tracking task per the `gh-cli-projects-tasks-conventions`
   skill: the body's primary content is the GitHub URL to the plan file in
   the `content-farm` repo (development branch) — not a deep path inside the
   parent monorepo.
4. **Clean start** — each submodule's working tree clean and on
   `development`, aligned with the parent tier per the pseudomonorepos skill.

## The verification ladder (what "didn't break" means here)

Obsidian plugins have no runtime harness an agent can drive — the plugin
loads inside the Obsidian Electron app. So the scriptable rungs are
static + build, and the runtime rung is named, not faked:

```text
cost/risk ▲  ┌────────────────────────────────────────────────────────────┐
         4   │ human rung: load the built plugin in a sandbox vault,      │  humans only
             │ exercise its commands — NAMED in the plan, not automated   │
         ────┼────────────────────────────────────────────────────────────┤ ────────────
         3   │ spec sanity: manifest.json version agrees with versions.json│
             │ and package.json (3-digit semver — marketplace blocker)    │
         2   │ bundle proof: build emits main.js; size delta sane (±20%   │  scripted,
             │ without an explanation is a stop-and-look)                 │  every module,
         1   │ pnpm build (esbuild production bundle)                     │  every pass
         0   │ tsc -noEmit  (+ eslint where the module has a config)      │
             └────────────────────────────────────────────────────────────┘
```

Rungs 0–3 run for **every module on every pass**. A red rung stops the
iteration for that module — never stack a second bump on a red build.

## Pass A — the safe sweep (one module per iteration)

1. `npx npm-check-updates --cwd <module> --target minor -u` then
   `pnpm install`. **pnpm is the preferred package manager wherever
   possible** — a module on npm/bun lockfiles is an opportunity to converge
   on pnpm as part of its iteration, not a reason to deviate.
2. Climb rungs 0–3.
3. Green → `changelog/` entry in **the module's own repo**
   (changelog-conventions shape — marketing artifact, not a commit-message
   punch list; read the skill fresh before drafting).
4. Commit in the submodule per git-conventions
   (`update(deps): …` header, impact-first body), push to `development`.
5. Red → treat as an unexpected break: read the offending dependency's
   release notes, adapt call-sites with no functional change, re-climb.
   If it can't go green in one sitting, revert the single offending bump,
   record it in the plan's deferred list, move on.

## Pass B — researched majors (one bump per iteration)

1. Take the next non-deferred major from the plan. Its release-notes /
   migration-guide links are already in the plan (precondition 2 / step 7 of
   the original dictation); re-read them now.
2. Apply the single bump, `pnpm install`, climb rungs 0–3.
3. Red → adapt our code to the new API following the upstream docs —
   **no functionality changes**, only API-surface adaptation. Re-climb.
4. Green → append to the module's changelog entry (or a second entry if the
   major deserves its own narrative), commit + push per git-conventions.
5. A major that resists adaptation goes to the deferred list with a named
   reason — deferral is a recorded outcome, not a failure.

## Pass C — forks, after the originals are green

Only true GitHub forks (verified with `gh repo view --json isFork,parent`,
never assumed from the repo name). Today that is exactly one repo:
`obsidian-git`, forked from `Vinzent03/obsidian-git`.

Forks get different treatment because independently bumping a fork's
dependencies manufactures merge conflicts against upstream:

1. **Check upstream first** — if upstream has already done the dependency
   work, the right move is `git fetch upstream` + merge/rebase our delta,
   not our own bump.
2. Only bump independently where upstream is dormant or we've diverged
   deliberately — and record that divergence in the module's changelog.
3. Same verification ladder (rungs 0–3), same commit discipline.
4. **Tension to resolve before touching `obsidian-git`:** content-farm's
   CLAUDE.md still marks it "vendored upstream — study, do not modify."
   Pass C supersedes that only with explicit operator sign-off in the
   iteration; update CLAUDE.md in the same commit if the policy changes.

## Closing the loop (once, after the last iteration)

1. Parent roll-up: `content-farm/changelog/` entry for the campaign;
   parent commit bumps all moved submodule pointers
   (`bump(submodules): …` per git-conventions).
2. Human rung: name which plugins the operator should smoke-test in a
   sandbox vault before any release tagging.
3. Close the GitHub task with a comment linking the roll-up changelog entry.
4. Flip the plan's `status` to Shipped / Partially-Shipped (with the
   deferred list as the remaining-work section).

## Known hot spots (from the 2026-07-24 survey — verify against the plan)

- **typescript → 7.x** is the native (Go) port — highest-risk bump in the
  set; modules sit on 5.8 and 6.0. Research confirmed Microsoft's official
  path is a **6.x stop-over** (clean-on-6.x ⇒ identical-on-7.0); this
  campaign goes to 6.x and defers 7 — details in the plan.
- **eslint → 10** everywhere. (`grab-reference`, still on eslint **8**, is
  held out of the loop entirely — see
  [[../issues/What-To-Do-With-Grab-Reference]].)
- **@types/node**: latest (26) is wrong — Obsidian 1.13.3 ships Electron 39
  = **Node 22**, so every module pins `@types/node@^22`, including the ones
  on 24/25 (a deliberate downgrade).
- **typed.js** (metafetch): v3's MIT → GPL-3.0 relicense was resolved by
  **removing the dependency** — the animation is now in-repo
  (`src/utils/typewriter.ts`). One fewer Pass-B iteration.
- **zod 3 → 4** (umbrella), **googleapis 158 → 173** (file-transporter),
  **marked 9 → 18** (plunk-it), **@anthropic-ai/sdk 0.92 → 0.115**
  (perplexed): each is a Pass-B iteration; research attached in the plan.
- **esbuild 0.25.x → 0.28.1** is 0.x-major in name; in practice check the
  esbuild changelog once and apply family-wide.

## Exit conditions

- Every in-scope module: rungs 0–3 green on the new dependency set.
- Every moved module: changelog entry + pushed `development` commit.
- Parent: pointer-bump commit + campaign changelog entry.
- GitHub task closed; plan status flipped; deferred majors recorded with
  reasons.
