---
title: "Create a Study of the Best Obsidian Plugins"
lede: >-
  Pin the 10–15 most interesting Obsidian plugins as a real study, so we read their code instead of paraphrasing from training data.
date_created: 2026-05-04
date_modified: 2026-05-19
status: Draft
category: Plan
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
tags:
  - Agent-Plans
  - Plan
  - Research
  - Studies
  - Lossless-Studies
  - Obsidian-Plugins
  - Competitive-Study
  - Prior-Art
related_files:
  - plugin-modules/obsidian-git
  - plugin-modules/obsidian-textgenerator-plugin
related_skills:
  - study-repos-first
  - pseudomonorepos
site_uuid: d85185ec-ebe7-4848-8863-77b8e721c21b
hex_code: zzr5rb
date_authored_initial_draft: 2026-05-04
date_authored_current_draft: 2026-05-04
---

# Create a Study of the Best Obsidian Plugins

## Why

Content-farm's plugin set is already opinionated — wide modals, AI-as-ingredient, the unified command pattern. But the Obsidian ecosystem is where most of our prior art lives, and we have not done a deliberate pass through what other authors have shipped. Every time we plan a new feature it would help to know: has someone already solved this? Better than us? Differently than us?

A study fixes that. The output is a written piece (and the supporting research notes) that captures, at a moment in time, what the most interesting Obsidian plugins are doing — and gives us a reference frame for our own roadmap.

## Goals

- **Identify the 10–15 most interesting plugins** in current circulation. "Interesting" beats "popular" — we want plugins that demonstrate a real point of view, not just plugins with high install counts.
- **Document the patterns** they use that are worth copying or studying: modal UX, command surfaces, settings shape, content-collection patterns, integrations with external services.
- **Surface the gaps** — categories or workflows the community has *not* solved well, where content-farm could contribute meaningfully.
- **Output a writeup** suitable for the lossless.group site (Astro Knots) and a structured set of notes in this `context-v/` for ongoing reference.
- **Pin the most relevant plugins as a real study** — actual submodules in content-farm, not just notes. Per the `study-repos-first` skill: read the upstream code, don't paraphrase from training data.

## Prior art already in the tree

Two third-party plugins are already pinned as submodules under `plugin-modules/` as informal reference material:

- **`plugin-modules/obsidian-git`** — the canonical git-in-Obsidian integration. Studied for how it handles long-running background work, auto-commits, and conflict-resolution UX inside the editor.
- **`plugin-modules/obsidian-textgenerator-plugin`** (nhaouari) — a mature template-driven LLM plugin, predates our own perplexed work. Studied for command-surface patterns, prompt-template authoring, and provider-abstraction shape.

Both currently live inside `plugin-modules/` alongside our own plugins, which conflates "we author this" with "we read this." Part of this plan is to give the studies a dedicated home so the distinction is structural, not just a convention to remember.

## Candidate plugins to study (seed list)

Starting list — additions welcome as we research:

- **[Co-Intelligence](https://github.com/Epistemic-Technology/co-intelligence)** by Epistemic Technology — agentic AI in Obsidian, the source URL that originally sat in this stub.
- **Templater** — community templating layer, instructive for how it handles user-authored JS extensions.
- **Dataview** — the query language for vault data; a study in surface design constraints.
- **QuickAdd** — command-and-template chaining; relates to our Filestarter direction.
- **Smart Connections** — semantic search, relates to how we'd build retrieval inside the farm.
- **Obsidian Linter** — prescriptive markdown formatter, useful as a counterpoint to the lenient frontmatter approach we use.
- **Excalidraw** — embeds a non-trivial canvas inside Obsidian; useful for understanding modal limits.
- **Tasks** — task management with embedded query shape; relates to the "any markdown is data" thesis.
- **Periodic Notes** — date-driven note creation, relates to our daily-changelog conventions.
- **Memos** — atomic-note style; instructive for how it handles a parallel surface to the main editor.

## Candidate pins to add (user-flagged, 2026-05-19)

These eight are flagged specifically as pins we'd want to clone into the studies layout, not just write a paragraph about. One-to-three-sentence summary per plugin; deeper notes belong in each pin's own study README once cloned.

- **[github-stats](https://github.com/Developer-Mike/github-stats)** (Developer-Mike) — Obsidian plugin that renders GitHub contribution graphs and per-repo activity inside notes. Of interest for our splash-page rollups and any "Lossless Changelog" aggregator that wants to surface upstream-repo activity alongside our own ship notes.

- **[obsidian-advanced-canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas)** (Developer-Mike) — extends Obsidian's native Canvas with presentation mode, encapsulated subcanvases, and node-level customization. Relevant when we eventually want to use Canvas as a serious authoring surface for fundraise decks and concept maps rather than as a sketch pad.

- **[docxer](https://community.obsidian.md/plugins/docxer)** — community plugin for `.docx` import/export against Obsidian markdown. Worth studying for content-farm's "land in Obsidian, ship to clients" pipeline — clients still live in Word, and the docx round-trip is the lossy boundary we keep bumping into.

- **[fabric](https://github.com/danielmiessler/fabric)** (Daniel Miessler) — not an Obsidian plugin proper; it's a prompt-framework CLI with an opinionated library of named "patterns" (prompts) and a strong community integration story. Read for the patterns-as-files-on-disk discipline and the way fabric structures provider-agnostic LLM workflows — directly comparable to our preambles+partials work in perplexed.

- **[mesh-ai](https://github.com/chasebank87/mesh-ai)** (chasebank87) — Obsidian plugin for composing multi-step AI workflows (chained prompts, multiple providers, intermediate-result handoff) inside the vault. The most direct prior-art comparison for where perplexed could go next once single-shot template runs aren't enough.

- **[slurp](https://community.obsidian.md/plugins/slurp)** — community plugin that fetches a web page and converts it to clean markdown (Mozilla Readability-style extraction) into the vault. Adjacent to our `metafetch` plugin and to perplexed's citation-driven research flow; worth studying for HTML-to-markdown conversion choices and how it handles paywalled / dynamic pages.

- **[obsidian-meta-bind-plugin](https://community.obsidian.md/plugins/obsidian-meta-bind-plugin)** — binds frontmatter fields to inline UI controls (text inputs, toggles, dropdowns) rendered directly in the note body. Highly relevant to content-farm's frontmatter-heavy authoring (perplexed's `cf_last_run`, image-gin's image-size selections) where we currently rely on Obsidian's properties panel or YAML hand-edits.

- **[whisper](https://community.obsidian.md/plugins/whisper)** — voice-to-text transcription via OpenAI Whisper, recording inside Obsidian and inserting transcripts into the active note. Worth studying for the "kick off a long-running async job from a modal and stream results back into the editor" pattern — the same shape perplexed uses for streaming Perplexity responses.

- **[neural-composer](https://github.com/oscampo/obsidian-neural-composer)** (oscampo) — a plugin for searching and context-aware content drafting.


## Evaluation dimensions

For each plugin, capture:

- **Core thesis** — what is the plugin's strongest single idea?
- **Modal/command UX** — how does it expose its surface? What's the keystroke economy?
- **Settings shape** — how complex, how nested, how discoverable?
- **AI footprint, if any** — how do they handle local vs hosted models, streaming, citations?
- **Frontmatter handling** — strict, lenient, ignored?
- **Cross-plugin compatibility** — does it play nicely with Dataview, Templater, the rest?
- **What we'd borrow** — concrete patterns worth lifting into our farm.
- **What we'd skip** — patterns that conflict with our values or that the user shouldn't have to learn.

## Output shape

- **Per-plugin notes** in `context-v/explorations/<plugin-name>.md` — short writeups, frontmatter-tagged so the eventual site can render them.
- **A summary blueprint** at `context-v/blueprints/Patterns-from-the-Obsidian-Plugin-Ecosystem.md` — the cross-cutting takeaways, suitable for any future content-farm plugin author.
- **A public essay** on lossless.group — the same content, edited for an outside reader.
- **A studies/ directory in content-farm** with the most relevant plugins pinned as submodules, each with its own `STUDY.md` capturing what we learned and what we'd lift.

## What still needs to be decided

- **Directory home for studies.** Options: a new top-level `studies/` peer to `plugin-modules/`, or a `plugin-modules/_studies/` subfolder, or keep them in `plugin-modules/` and rely on naming convention. The `study-repos-first` skill prescribes a dedicated `studies/<topic>/` layout — leaning toward that, with the two existing third-party pins (obsidian-git, obsidian-textgenerator-plugin) relocated as part of the move.
- **Submodule vs. shallow clone vs. read-only mirror.** Submodules are heavy; shallow clones lose history; mirrors require maintenance. The `study-repos-first` skill defaults to submodules — should hold that line unless any pinned repo is large enough to make CI / clone-time painful.
- **Cadence for refreshing the pins.** Studies decay — upstream evolves, our notes get stale. Need a documented "refresh check" rhythm (quarterly? on-demand when a related project starts?).
- **Where the study NOTES live.** Each pinned repo gets a sibling `STUDY.md` (or similar) inside content-farm's `context-v/studies/` that captures what we learned and what we'd lift. Distinct from the upstream README and from the per-plugin `explorations/` writeups.

## Scope guards (what this plan is *not*)

- Not a popularity contest. Install count and star count are inputs, not the decision.
- Not exhaustive. 10–15 plugins is plenty; reading 50 doesn't produce 50× the insight.
- Not a benchmark. We're studying ideas and patterns, not measuring performance.

## Status

**Draft.** Seed list captured; the 2026-05-19 user-flagged pins are tagged for the studies/ layout but not yet cloned. Next steps: (1) decide the studies/ directory home, (2) pick the first three plugins (from either list) and write their `explorations/` notes, (3) clone the user-flagged set as a batch once the layout is settled.

## Cross-references

- `astro-knots` skill — patterns we'd want to teach future plugin authors are also future Astro Knots blueprint material.
- `pseudomonorepos/references/content-rollup.md` — the `explorations/` notes will roll up to the splash via the same loader pattern.
- `study-repos-first` skill — the discipline this plan implements.
