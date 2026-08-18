---
title: Auto-Hyperlink Feature Names in Generated Tables
date_created: 2026-05-09
type: plan
status: deferred
related:
  - "[[Per-Directory-Profile-Templates]]"
  - "[[Moving-Beyond-Simple-API-Calls]]"
site_uuid: 62b67384-03c3-4a25-8883-b968ca6be302
hex_code: vrbzut
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
---

# Auto-Hyperlink Feature Names in Generated Tables

## Motivation

When the directory-template runtime calls Perplexity Deep Research for a Tooling profile, the model often emits a clean feature table — for example, on `Tooling/AI-Toolkit/Agentic AI/Agentic Workspaces/Adopt AI.md`:

```
| Feature | Description | Primary Benefit |
|---------|-------------|-----------------|
| ZAPI (Zero-Shot API Ingestion) | Automated discovery and cataloging of all APIs in live applications within 24-48 hours | Eliminates manual API inventory work; ensures current, accurate integration points |
| ZACTION (Zero-Shot Action Generation) | Transforms discovered APIs into validated, composable actions using LLM reasoning | Moves agents from fragile to production-ready; reduces integration brittleness |
| No-Code Multi-Agent Builder | Visual canvas for designing agent networks, triggers, and orchestration without coding | Democratizes agent development; reduces dependency on engineering teams |
| Security & Governance | Built-in authorization, audit logging, isolation, and policy enforcement | Enables enterprise deployment; supports compliance requirements |
| Model Agnosticism | Support for OpenAI, Azure OpenAI, Hugging Face, and other foundation models | Prevents vendor lock-in; enables cost and capability optimization |
| Session & State Management | Built-in persistence and human-in-the-loop controls | Enables long-running workflows; maintains regulatory compliance |
| Private Cloud-Native Runtime | Data never leaves customer environment | Addresses regulated industry security requirements |
| Framework Augmentation | Works alongside LangGraph, CrewAI, MetaGPT, and other frameworks | Preserves existing investments; extends capabilities |
```

The leftmost column — feature names — is the highest-value content. Each named feature usually has a dedicated page on the entity's site (`/zapi`, `/features/no-code-builder`, etc.). Right now those names are plain text. They should be **markdown links to the most likely explanation page on the entity's domain**, so a reader (or downstream LFM renderer) can jump directly to the source.

## Proposed behavior

After the directory-template streaming write completes, run a post-filter that:

1. **Detects feature-table-like markdown tables** in the streamed content. Heuristic: a GFM table whose first column header is one of `Feature`, `Capability`, `Module`, `Pillar`, `Product` (configurable list); and whose left-column cells are short noun phrases (≤ 6 words, ≥1 capitalized word, no terminal punctuation).
2. **Extracts left-column candidates** as `featureName` strings.
3. **Crawls the entity's domain** (from the active file's `url` frontmatter) to find the most likely explanation page per feature:
   - Fetch the entity homepage.
   - Parse for `<a href>` whose anchor text or surrounding context contains the feature name (case-insensitive, accepting acronym variants like "ZAPI" matching both bare token and parenthetical expansion).
   - Recurse one level into discovered nav/footer links if the homepage doesn't yield enough matches; cap at depth 1.
   - Score candidates by anchor-text overlap, URL-slug overlap, and proximity to the feature name in surrounding text.
4. **Rewrites the table cells**: replace `ZAPI (Zero-Shot API Ingestion)` with `[ZAPI (Zero-Shot API Ingestion)](https://adopt.ai/zapi)` when a confident match exists. When no confident match, leave the cell unchanged.
5. **Logs unmatched names** as a `> [!cf-info]` callout below the table (or in a debug log) so the user can see which features the crawler couldn't anchor.

## Technical considerations

- **Use Obsidian's `request()`** for the homepage fetch (no CORS concerns inside Electron). Same pattern as the future headless-screenshot service.
- **Reuse the glob/URL helpers** already in `directoryTemplateService.ts` (`extractDomain`).
- **Confidence threshold**: require either an exact-match anchor text or a URL slug containing ≥ 2 of the feature name's tokens. Below threshold, no link.
- **Cache** per-entity-URL crawl results in plugin state for the duration of a single batch run, so 30 files in `Tooling/Agentic AI/Agentic Workspaces/` don't re-crawl `adopt.ai` 30 times.
- **Respect robots.txt** at minimum. We're a small consumer; no need for aggressive crawling.
- **JS-rendered sites** (the same SVG/Lottie problem we hit for image discovery) won't expose links via plain HTTP fetch. Either accept the miss for those, or escalate to the headless-browser service planned for screenshots — same infrastructure.

## Where this fits in the iteration order

This is a **v0.4-or-later** feature, after:

- Streaming + cleanup filters land cleanly. ✓ (already in v0.3 — done.)
- The headless screenshot service exists for SVG/Lottie sites (next iteration).

The table-link enhancement is *cheap to add once the crawler exists* — it shares the entity-page-fetch infrastructure with screenshots. So the natural order is:

1. Build the headless screenshot service (next).
2. Layer table auto-linking on top of it as a small post-filter.

## Out of scope (not now)

- Auto-linking arbitrary noun phrases in body prose. This plan is **table-only** to keep the heuristic tight and the noise low.
- Cross-referencing `[[wikilinks]]` to vault entities. That belongs to a separate "auto-linking known entities" feature already noted in `[[Moving-Beyond-Simple-API-Calls]]` as deferred.
- Validating link freshness over time. If `adopt.ai/zapi` 404s a year later, that's a vault-maintenance problem, not a generation-time problem.

## Acceptance criteria (when implemented)

1. Re-running the toolkit-profile template against `Adopt AI.md` produces a `Features` table whose first-column cells are markdown links pointing into `adopt.ai/*` paths, where such pages exist.
2. Features without a confident match remain plain text (no fabricated links).
3. Within a single batch run, the entity homepage is fetched at most once per entity.
4. The full file is otherwise byte-identical to a non-linked run, modulo the cell rewrites.
