---
title: "A Component Inserter"
lede: >-
  An Obsidian command that scaffolds the right block — HTML, codefence, callout, embed — at the cursor, with frontmatter-driven defaults.
date_created: 2025-08-11
date_modified: 2026-05-05
status: Draft
category: Plan
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
tags:
  - Plan
  - Obsidian-Plugins
  - LFM
  - Editor-UX
  - Component-Authoring
site_uuid: c5299b4d-0f94-4c47-a9f6-5f6041a17863
hex_code: pk8wnv
date_authored_initial_draft: 2025-08-11
date_authored_current_draft: 2025-08-11
---

# A Component Inserter

## Why

Obsidian's editor is markdown-first by design — which is great until you want to drop in a structured block (a callout, an embed, an HTML snippet, a code fence with the right language) and find yourself typing the syntax from memory. Authors who know the patterns are fine; authors who don't either skip the structured block or reach for a snippet plugin that has its own learning curve.

A component inserter fixes the friction. One command, a typeahead-like picker of available blocks, and the right scaffold lands at the cursor with sensible defaults.

This is also the right surface for **LFM (Lossless Flavored Markdown)** to feel native inside Obsidian. LFM's whole premise is that "any syntax can be added as a trigger to render a component" — so the inserter is the editor-side complement to the rendering pipeline. You author with the inserter; you read with LFM.

## Two near-term targets

The shortest path to value is the two block types that come up most:

### 1. HTML block

Some content needs raw HTML — embeds, custom layouts, signed-off marketing surfaces. Markdown allows it inline, but the editor doesn't help you scaffold:

```html
<div class="callout-wrapper">
  <!-- your content -->
</div>
```

The inserter offers a small set of curated HTML scaffolds (figure, aside, section with class, anchor with rel) and drops them at cursor with a placeholder ready to replace.

### 2. Code fence

The right fence is `\`\`\`<lang>` with a hint at the language. The inserter offers the language picker:

````
```typescript

```
````

Plus shortcut variants for the languages we actually use (TS, Astro, JSON, YAML, Bash, Markdown).

Both of these shave 5–15 seconds per insertion, which adds up across a long-form draft.

## Future targets

Once the two-block version ships, the same surface extends naturally:

- **Callouts** — Obsidian's `> [!note]` family, with options for type (note, warning, tip, etc.) and an editable title.
- **Embeds** — `![[...]]` with autocomplete against the vault's index.
- **LFM components** — once an LFM component registry exists, every registered shortcode/wrapper becomes a candidate scaffold.
- **Frontmatter snippets** — common frontmatter blocks (changelog entry, spec stub, blueprint stub) that match our `context-v/` conventions.

## How it should feel

- One command (`Cmd-Shift-/` is the working binding), discoverable from the command palette.
- A modal/picker (using the wide-modal pattern from `filestarter`) with two columns: type on the left, preview on the right.
- Cursor lands inside the placeholder when the scaffold is inserted — no manual navigation.
- Settings tab lets the user disable categories they don't use, reorder the picker.
- **Snappy.** No async work between keystroke and modal open.

## Tech notes

- Lives in its own plugin (`component-inserter`) eventually — bundle is small, surface is contained.
- Draws scaffolds from a versioned registry — initially in-tree as a TS module; eventually pulled from a content collection so additions don't require a release.
- Reuses Filestarter's modal pattern; reuses Image-Gin's command-palette wiring conventions.
- For HTML scaffolds, validate that what we insert won't be sanitized away by Obsidian's rendering — some attributes are stripped at render time.

## Open questions

- **Scope: a new plugin, or a feature inside Filestarter?** Filestarter's evolving identity (per the May 2026 retrospective) is "patterns for starting *files*" — and inserting a structured block is adjacent to that. Could be one plugin.
- **Snippet engine integration.** Templater and QuickAdd already handle some of this. Worth deciding early whether we coexist with those or replace them in our flow.
- **LFM round-trip.** When LFM ships and the inserter starts emitting LFM-shaped blocks, the registry has to stay in sync between the two packages. Possibly the same data file consumed by both.

## Cross-references

- `astro-knots` skill — LFM is the rendering counterpart to whatever the inserter authors.
- `filestarter` — modal pattern reference, possible host plugin.
- `cite-wide/context-v/specs/Modal-for-Pasting-LLM-Native-Content.md` — sibling pattern: modal that accepts paste content and converts to a structured block. Some shared shape.
