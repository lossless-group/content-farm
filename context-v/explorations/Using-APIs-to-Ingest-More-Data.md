---
title: "Using APIs to Ingest More Data"
lede: "Beyond OpenGraph.io — what Jina.ai already gives us (we pay for it), what other fetching services do, and a rough sketch of how a portfolio-company site crawler would actually work."
date_created: 2026-05-06
date_modified: 2026-05-06
status: Exploration
category: Exploration
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: any content-farm plugin or workflow that ingests metadata from third-party URLs
tags:
  - Exploration
  - API-Integrations
  - Jina
  - Crawling
  - Portfolio-Companies
site_uuid: 1b348d66-19f0-4141-b533-92b18cbc3a53
hex_code: 1nq3vp
date_authored_initial_draft: 2026-05-06
date_authored_current_draft: 2026-05-06
---

## What we can do with Jina.ai

The Jina account is already paid for, so anything below is incremental cost only on token/request usage.

- **Reader** (`r.jina.ai/<url>`) — fetch any URL as clean LLM-ready markdown with title / description / content. Handles JS-rendered pages via headless browser. JSON mode (`Accept: application/json`) returns `{ title, description, content, links }`.
- **Search** (`s.jina.ai/<query>`) — search API that returns the *full text* of top results, not snippets. Useful for "what does X say about Y" questions.
- **DeepSearch** — agentic multi-hop crawl that keeps refining until it has enough info. Expensive but thorough; right tool for "research this thing for me."
- **Embeddings + Reranker** — semantic similarity and result re-ranking. Useful if we build a portfolio-company knowledge base and want "find companies similar to this thesis."
- **Segmenter / Classifier** — chunk long content semantically, zero-shot label pages (e.g. "is this an `/about` page?").

## Other fetching beyond Jina

- **Microlink** — preview cards, free tier. Drop-in OpenGraph-style replacement.
- **Browserless / ScrapingBee** — raw headless browser when we need DOM control or to interact with the page.
- **Firecrawl** — purpose-built site crawler with sitemap walking and structured extraction baked in. Closest match to the portfolio-crawler dream.

## How a portfolio-company crawler would work

Rough shape:

1. **Input**: a list of company domains. Could live in an Obsidian folder as one file per company with a `url:` frontmatter field.
2. **Discovery pass**: Jina Reader on the homepage in JSON mode → get markdown plus the outbound link list → filter to same-origin and prioritize `/about`, `/team`, `/careers`, `/blog`, `/press`.
3. **Fetch pass**: Jina Reader on each prioritized page. 3–8 pages per company keeps cost bounded.
4. **Extract pass**: feed concatenated markdown to Claude with a Zod schema — name, tagline, stage, founders, investors, last funding, customers, tech stack, recent news. Get back structured JSON.
5. **Persist**: write back into the company's Obsidian file as frontmatter plus a generated body section, with a `last_crawled` field. Re-run periodically; diff to surface changes.

## Recommendation and tradeoff

For v1, build it as a **separate plugin or command, not bolted onto Metafetch**. It is a different shape: multi-page per target, LLM in the loop, longer-running. Metafetch stays single-page-OG-only.

The main tradeoff is **cost predictability**. We will want a per-company page budget (say ≤ 5 pages × ~2k tokens each), or the Jina + Claude bill becomes unpredictable on a 50-company portfolio. Firecrawl is worth a head-to-head comparison because it bundles crawl plus extract in one API and may end up cheaper per company than Reader plus Claude separately.

## Open questions

- Should the portfolio-company schema and command surface be sketched in detail (no code yet) before we commit to a build?
- Firecrawl vs. Reader+Claude: pick one for v1, or run both on a small sample and compare cost and extraction quality?
- Where do crawl results live — inside Obsidian as one file per company, or as a separate JSON store with Obsidian files as views over it?
