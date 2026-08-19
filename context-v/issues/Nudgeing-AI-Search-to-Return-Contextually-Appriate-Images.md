---
title: Nudging AI search to return contextually appropriate images
date_created: 2026-05-09
type: issue
status: open
target_repo: perplexed
related:
  - "[[Auto-Hyperlink-Feature-Names-In-Tables]]"
  - "[[Per-Directory-Profile-Templates]]"
site_uuid: 44bd58c8-97c7-411c-8b90-dcea3ef29168
hex_code: acit3e
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
lede: "The streaming pipeline silently drops Perplexity's images array — port the [IMAGE N] marker pattern the article generator already uses."
summary: "Open issue against perplexed explaining why generated profiles come back image-less or carrying marketing hero shots instead of illustrative screenshots. Names the exact code paths (directoryTemplateService.ts, findImagesService.ts, perplexityService.ts processContentWithImages) and ranks mitigations in three tiers. An agent working image acquisition should implement Tier 1 only — the port of the already-working article-generator pattern — and stop there; Tiers 2 and 3 are explicitly flagged as premature. Acceptance criteria and open questions are at the bottom."
publish: true
---

# Hotfix:

The star around the underscore

```md
*_AI agents autonomously negotiate contracts by scanning clauses, flagging risks, suggesting edits, and coordinating multi-party changes, slashing review times from days to hours while enhancing compliance and strategic focus._*
```

# Nudging AI search to return contextually appropriate images

## Symptom

Image acquisition across perplexed-driven content generation is producing two distinct failure modes:

**Failure mode 1 — no images returned at all.**
Concept-profile and vocabulary-profile runs come back text-only. The streaming pipeline ignores the `images` array Perplexity returns when `return_images: true` is set; the fallback is the `[Image embed placeholder — run "Find images for selection" on this section to populate.]` bullet, which leaves the work to a manual post-step. For abstract content (concepts, vocabulary terms) the manual command also struggles because there is no entity domain to anchor the search.

**Failure mode 2 — the "most findable" image, not the best one.**
When images ARE returned (toolkit-profile flow with `findImagesService.ts` doing entity-domain-restricted search), they tend to be the most generically findable image on the domain — homepage hero banners, brand graphics, social-sharing OG cards — rather than images that genuinely illustrate the specific feature, dashboard, or workflow being described in the passage. A ZAPI-discovery passage gets a marketing hero image of a smiling product photo, not a screenshot of the ZAPI dashboard.

## Why this happens

### Technical reasons

1. **Streaming pipeline does not consume the `images` array.** `directoryTemplateService.ts` writes the streamed text body and stamps frontmatter, but the response's `images` array is dropped. Concept-profile and vocabulary-profile templates are wired to request `return_images: true`, but downstream nothing acts on the data.
2. **`findImagesService.ts` filters by domain only, not by URL pattern within the domain.** A strict `search_domain_filter: [entityDomain]` plus client-side rejection ensures we get *only* on-domain images — but a marketing hero on `adopt.ai/` and a dashboard screenshot on `adopt.ai/docs/zapi/` are both on-domain. We have no path-level preference.
3. **Image-bearing pages are themselves biased.** Marketing/landing pages are SEO-optimized: rich alt text, polished OG tags, fat sitemap weight. Documentation pages and product-detail pages — where the genuinely illustrative screenshots live — tend to have less search-friendly metadata and rank lower in image-search candidates.
4. **No multimodal re-ranking.** Once Perplexity returns 10–20 image candidates, we hand them straight to placement logic. A vision model handed the passage and the candidates would re-rank dramatically better, but we don't do this round-trip.
5. **Lottie/SVG-rendered sites return nothing usable.** Sites like adopt.ai render their feature visuals as Lottie animations; HTTP image search finds no raster image to surface. This is a structural problem, not a search-quality problem.

### LLM-bias reasons

1. **Image search is keyword-matched, not semantically matched.** The query "find images that illustrate the ZAPI passage" matches "ZAPI" against alt text, captions, and OG tags. Marketing pages mention "ZAPI" in marketing copy with rich surrounding context; the dashboard screenshot is at `adopt.ai/dashboard.png` with `alt="dashboard"` and ranks below the hero.
2. **Models prefer images that confidently match keywords over images that meaningfully illustrate.** When asked "which of these images best fits this passage," the model picks the candidate whose alt text most echoes the passage — which is almost always the marketing hero, because marketing copy is keyword-dense in exactly the same way the passage is.
3. **For abstract content (concepts, vocabulary), there is no canonical on-domain illustration.** "Platform" doesn't have an entity domain. "Moat" doesn't either. Image search across the open web for these terms returns either literal interpretations (a real moat) or generic abstract illustrations (handshakes, growth charts, gears) — neither of which adds insight.

## What "good" looks like, per content type

| Content type | What an ideal image is | Why generic search fails |
|---|---|---|
| Toolkit profile (Tooling/**) | Dashboard screenshot of the feature being described, in-product UI, architecture diagram from docs | Marketing-page hero outranks docs screenshots in image search |
| Concept profile (concepts/**) | Diagram showing relationships (mermaid auto-generated when applicable), or a Stratechery-style diagram, or a quote-graphic with a founder citation | No canonical on-domain image; abstract concepts don't have a single visual referent |
| Vocabulary profile (Vocabulary/**) | Quote-graphic citing the term's coiner, or a generated illustration with the term's definition baked in (Ideogram-style), or a small diagram for terms with relational structure (e.g., two-sided marketplace) | Same — abstract terms don't have a canonical photo |
| Source profile (Sources/**) | Author headshot from publisher page, book cover, podcast cover art, podcast guest photo | Generally well-served by entity-domain image search; not a major problem here |

## Mitigations, ranked by complexity

### Tier 1 — port the pattern that already works

The "Generate one-page article" command (`ArticleGeneratorModal` → `PerplexityService.queryPerplexity`) already solves this and has been working in perplexed for a while. The pattern, end-to-end:

1. **Append a directive to the user prompt** telling the model to insert `[IMAGE N: <description>]` markers throughout its prose where images would help. Source: `main.ts:295` (the user-editable `imageReferencesPrompt` setting).
2. **Set `return_images: true`** on the API call. Perplexity returns a flat `images` array on the response (each entry has `image_url`, `origin_url`).
3. **Post-stream regex replacement** swaps each `[IMAGE N: description]` in the streamed content for `![description](images[N-1].image_url)`. Source: `perplexityService.ts:101` `processContentWithImages`.
4. **Fallback when no markers were emitted**: dump available images at the top of the response. Source: `perplexityService.ts:807`.

That's it. The "Google image search with reasoning" the user described is exactly what this delivers — Perplexity does the search; the model that wrote the prose decides where the markers belong; post-processing wires up the markdown. There is no client-side ranking, no multimodal re-rank, no headless screenshots, no Ideogram generation.

The job is to **port this pattern into `directoryTemplateService.ts`'s streaming flow**, since that's the path concept-profile and vocabulary-profile take. Concretely:

- **Capture `images` from the SSE stream.** `streamPerplexityToFile` already extracts `search_results`; add the same extraction for `images` and return it alongside `sources`.
- **Auto-append the image-marker directive** to the user prompt when `return-images: true` is set in the cft block, the same way `INLINE_CITATION_DIRECTIVE` is auto-prepended to the system prompt today. Templates do not need to know about this — it's a runtime concern.
- **Run `processContentWithImages`-equivalent on the streamed content** before the sources footer is appended. Either lift the function into `directoryTemplateService.ts` or factor it into a shared util both services import. The latter is cleaner; one regex shouldn't be duplicated.

### Tier 2 — only if Tier 1 isn't good enough

These are NOT needed if Tier 1 produces acceptable results. List them here so we don't reach for them prematurely:

- URL-path preference (`/docs/`, `/features/` boost over `/blog/`, `/about/`).
- Tighter image-acquisition prompt (explicitly reject hero banners, OG cards, stock photography).
- Multimodal re-ranking via vision model.
- Filename + dimension heuristics.

### Tier 3 — only for known-failing content types

- Headless-screenshot service for Lottie/SVG sites where image search returns nothing because everything is animated. Required for adopt.ai-style entities.
- Generated illustrations via Ideogram for abstract concepts/vocabulary if Perplexity image search returns nothing useful for those terms (likely, since abstract terms have no canonical visual referent).
- Auto-mermaid for concepts with clear relational structure.

### Tier 2 — medium effort, real quality lift

4. **Multimodal re-ranking via vision model.** After Perplexity returns N candidates, send the passage + candidate URLs to a vision model (Claude, Gemini) with the prompt "rank these images by how concretely they illustrate the passage; reject any that are marketing imagery or stock photography." Quality jump is significant; cost is one extra API call per template run.
5. **Image-type detection from filename + dimensions.** Heuristic: filenames containing `screenshot`, `dashboard`, `<feature-slug>`, `diagram`, `architecture` boost; `hero`, `banner`, `og`, `social` demote. Wide images (>16:9) more likely to be screenshots; square images (1:1) more likely to be OG/social cards.

### Tier 3 — bigger lifts, deferred

6. **Headless-screenshot service for Lottie/SVG-rendered sites.** Render the entity's feature page in headless Chromium, screenshot specific viewport regions, store as raster. Same infrastructure as the auto-hyperlink crawler in `[[Auto-Hyperlink-Feature-Names-In-Tables]]`. Solves adopt.ai-style cases where image search returns nothing because everything is animated.
7. **Generated illustrations via Ideogram** for concept and vocabulary entries. Per project memory, Ideogram is the preferred image-generation tool for any image task (correctly bakes in-image text where DALL-E / Flux / SD don't). Concept and vocabulary entries are exactly the use case — abstract content with no canonical illustration. A small post-step would generate a definition-graphic or relationship-diagram per entry.
8. **Auto-mermaid detection.** When the concept involves clear relational structure (parts-of-a-whole, taxonomy, sequence, network), generate a mermaid codefence at the top of the body. Concept-profile already prompts for this conditionally — but it's optional and the model frequently skips it. A separate post-pass that detects "this concept has structure" and forces a mermaid diagram would be more reliable.
9. **Curated semantic stock fallback.** Unsplash + semantic search via embeddings, restricted to a curated allow-list of contributors known for non-cliché photography. For when generated illustrations aren't appropriate but Perplexity image search returns nothing.

## Out of scope

- **Fixing Perplexity's image-search ranker.** Not our problem to solve; we work around it via post-filters and re-ranking.
- **Content-aware image cropping or composition.** If we ever auto-generate or auto-crop, that's a v3 problem.
- **Replacing Perplexity's image search wholesale with a different provider.** Not until Tier 1 + Tier 2 mitigations have been tried.

## Acceptance criteria for this issue to be marked resolved

1. Toolkit-profile runs surface dashboard / docs / feature-page screenshots ahead of marketing heroes in at least 70% of cases on a sample of 10 entity domains.
2. Concept-profile and vocabulary-profile runs either embed an image (via mermaid auto-generation, Ideogram generation, or curated stock fallback) or surface a clear placeholder explaining why no image was inserted — never silently produce text-only output when the template requested an image.
3. The streaming pipeline consumes the `images` array on the response and at least conditionally inserts a top-ranked candidate. Currently the array is dropped.
4. The `findImagesService.ts` prompt is tightened to explicitly reject marketing imagery, with a written rationale committed alongside the change so the prompt doesn't drift back.
5. A short eval doc exists at `context-v/evals/Image-Acquisition-Quality.md` measuring before/after image quality on a fixed sample of 10 entity pages and 5 concept entries.

## Open questions

1. Should the multimodal re-rank happen via Claude (which is the orchestrator anyway) or Gemini (cheaper at vision)? Tradeoff is cost vs. context-continuity.
2. For concept/vocabulary entries, is auto-Ideogram generation desirable by default, or should it be opt-in per template? Cost matters at the 1600-Tooling-files batch scale, but at the dozens-of-concepts scale it's negligible.
3. Is there value in stamping image provenance into frontmatter (`image_source: "<url>"`, `image_method: "perplexity-search" | "ideogram-generated" | "mermaid"`) for downstream analysis and retroactive cleanup? Probably yes — same pattern as `cf_last_run`.
