---
title: "Create a Study of the Best Obsidian Plugins"
lede: "Before we ship more plugins of our own, take a deliberate read of what's working in the Obsidian community. Catalog the plugins doing the most interesting work, what they get right, what we'd do differently, and which ideas are worth borrowing."
date_created: 2026-05-04
date_modified: 2026-05-05
status: Draft
category: Plan
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
tags:
  - Plan
  - Research
  - Obsidian-Plugins
  - Competitive-Study
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

## Scope guards (what this plan is *not*)

- Not a popularity contest. Install count and star count are inputs, not the decision.
- Not exhaustive. 10–15 plugins is plenty; reading 50 doesn't produce 50× the insight.
- Not a benchmark. We're studying ideas and patterns, not measuring performance.

## Status

**Draft.** Seed list captured; no plugins studied yet. Next step is picking the first three and writing their `explorations/` notes.

## Cross-references

- `astro-knots` skill — patterns we'd want to teach future plugin authors are also future Astro Knots blueprint material.
- `pseudomonorepos/references/content-rollup.md` — the `explorations/` notes will roll up to the splash via the same loader pattern.
