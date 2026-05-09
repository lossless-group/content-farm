---
title: "Citation Resolution and the Canonical Source"
lede: "Three problems that look separate — link-rot recovery, smart cite-wide save with lookup-before-create, and content preservation as a future RAG corpus — are actually three operations on one underlying entity. This doc names that entity, sketches the data model, and proposes a v1 scope."
date_created: 2026-05-06
date_modified: 2026-05-06
status: Exploration
category: Exploration
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: cite-wide plugin, Citations/ vault folder, future portfolio-company crawler
related_paths:
  - /Users/mpstaton/content-md/lossless/Citations
  - plugin-modules/cite-wide/
  - plugin-modules/metafetch/
tags:
  - Exploration
  - Citations
  - Link-Rot
  - Content-Preservation
  - RAG
  - cite-wide
---

## The three problems on the table

1. **Link-rot resolver.** AI research (Perplexity etc.) returns plausible-looking links that 404. The article often *does* still exist — same title, different URL. We want a semi-smart crawler that, given a broken link plus its title, can find the updated URL and update the citation.
2. **Lookup-before-create for cite-wide save.** Today, "Save as Cite-Wide Source" creates a new citation file. The original intent was to first try to *match* an existing citation in `Citations/` and only create one if no match. That second half was never built; it was a one-shot last year and you only use it for save, not lookup.
3. **Better content preservation than the internet itself.** Today: one markdown file per citation with frontmatter and a Notes section. The aspiration: persist enough of the actual content (markdown + maybe paired HTML) that a citation survives the source going dead. As a side effect, this accumulates a corpus that could feed RAG / KAG-ish features later — which normally needs *so much* content that you can never get there from scratch.

## What's actually already in the data

Sampling `Citations/`: 68 files, named by `hexId`, with frontmatter that already carries:

```yaml
hexId: "0040jx"
title: "..."
url: "..."
source: "..."
usageCount: "1"
filesUsedIn:
  - "Tooling/AI-Toolkit/Model Producers/Harmonic.md"
```

Two things to notice:

- **The "cited in N articles" feature is data-complete.** `usageCount` + `filesUsedIn` already exist. This is a UI/surfacing problem, not a data-modeling problem.
- **Link rot is already in your corpus.** `0kal5f.md` has `title: "Page not found | MRU"` — the save pipeline grabbed the 404 page's title and stored it as the article title. So the resolver isn't hypothetical; you have known-broken citations sitting there right now.

## The unifying insight

All three problems are operations on **one entity: the *canonical source*** — a piece of content on the web that we cite. They are:

- **Resolve** — given a broken URL plus a title, find the live URL.
- **Match** — given a freshly-cited URL or title, find the existing canonical record (or decide to create one).
- **Preserve** — keep enough of the actual content that the canonical source survives the live web.

If we pick a data model that supports all three operations cleanly, all three problems collapse into incremental work on the same plumbing. If we don't, we'll build three half-systems that don't compose.

## Proposed data model — folder per citation

Move from one-file-per-citation to a small folder bundle:

```
Citations/
  0040jx/
    citation.md     # existing frontmatter + Usage/Source/Notes (UNCHANGED schema)
    content.md      # Jina Reader output of the page at fetch time
    content.html    # raw HTML snapshot (optional, for fidelity / re-extraction)
    history.json    # [{url, status, checked_at, replaced_by?}, ...]
```

Why a folder, not richer frontmatter:

- `citation.md` keeps its current shape, so cite-wide does not need a schema migration on day one.
- `content.md` is the preservation layer + future RAG fuel. Independent of `citation.md`.
- `content.html` is the lossless fallback (re-extract later if the markdown is not enough). Optional — deferrable to v2.
- `history.json` is where the link-rot resolver writes its trail. Append-only, audit-friendly.

`hexId` becomes the folder name. Lookup-by-id stays O(1).

**Migration:** existing single-file citations stay valid. Detect bundle vs. file by sibling presence. Migrate lazily — first time a citation is opened or saved by the new flow, upgrade it to a folder.

## The three problems mapped onto the model

### Match (lookup-before-create)

A `Citations/_index.json` (rebuilt on save) carrying `{hexId, host, url_normalized, title_normalized, alt_urls[]}` for each citation. Lookup pipeline:

1. Normalize incoming `url` (strip query params like `utm_*`, lowercase host, trim trailing slash). Exact match → done.
2. Same host + fuzzy title match (Jaro-Winkler ≥ 0.9 or simple token overlap). Match → done, increment `usageCount`, append to `filesUsedIn`.
3. No match → create.

At 68 citations a linear scan is fine. The index pays off at ~1k+. Frontmatter stays authoritative; the index is rebuildable.

### Resolve (link-rot recovery)

Background sweep, runnable on demand or scheduled:

1. HEAD-check every citation's `url`. Mark dead ones.
2. For each dead URL, search for the title — constrained to the original host first (most rot is internal moves), then unconstrained.
3. Score candidates: title similarity + content similarity (use the preserved `content.md` if present!) + same-host bonus.
4. Strong match → update `citation.md` `url`, append the old URL to `history.json` with `replaced_by`.
5. Weak match → push to a `needs-review.md` queue. **Never auto-update on weak matches** — false positives silently corrupt your bibliography.

The preserved `content.md` is what makes this resolver actually work — without it, you are matching on title alone, which is brittle.

### Preserve (and the RAG side-effect)

On any cite-wide save: do a Jina Reader fetch alongside the existing citation creation. Write `content.md`. Optionally `content.html`.

Once you have a few hundred `content.md` files, even basic embedding search across them is useful — "what have I cited about [topic]" becomes a real query. That is the realistic version of the RAG/KAG ambition: not training-grade, but *cite-wide search* over your own corpus. Achievable; the big-corpus version is not.

## Recommended v1 scope

Do, in order:

1. Define the bundle format (`citation.md` + `content.md`, defer HTML and history.json).
2. Modify cite-wide's "Save as Cite-Wide Source" to:
   - Build/maintain `Citations/_index.json`.
   - Lookup-before-create using the index.
   - On miss, create the bundle (citation.md + content.md via Jina Reader).
   - On hit, increment `usageCount` and append to `filesUsedIn`.
3. Add a "Citations using this source" view (since `filesUsedIn` already exists, this is just a lookup + render).

Defer:

- Link-rot sweep + resolver (needs the bundle format stable first).
- HTML snapshots (size cost).
- Cite-wide search / embeddings (let the corpus accumulate first).
- Folder-per-citation migration of the existing 68 — do it lazily, not in a big-bang script.

## Out of scope: PDF reports are a whole other thing

Everything above assumes the canonical source is an HTML page. **PDF reports — academic papers, industry research, government docs — are a different problem and should be treated as a separate workstream**, not bolted onto the v1 above. Reasons it diverges:

- **Different fetcher.** Jina Reader can extract from PDFs but quality varies, especially for tables, figures, and multi-column layouts. We may need a dedicated extractor (Marker, GROBID, Anthropic vision, or just a quality-tuned pipeline). The PDF binary itself is the canonical artifact and should be preserved alongside extracted markdown — losing the original fidelity is unacceptable in academic contexts.
- **Different identity.** Web pages have URLs (which rot). PDFs increasingly have **stable identifiers** — DOI, arXiv ID, SSRN ID, ISBN. These are *better* lookup keys than URL and are the actual primary keys in the academic-citation world. The match/lookup pipeline above should be parameterized by identifier type, not hardcoded to URL.
- **Different rot pattern.** Academic and government PDFs tend to relocate within the same domain (publisher reorganizes, author moves institutions) but the *content* is much more stable. DOI resolution often Just Works as a redirect to the new home — we should try the DOI first, only fall back to title search.
- **Different citation formatting.** The current cite-wide schema (`title`, `url`, `source`, `author?`) is fine for blog posts. For papers we want `authors[]`, `journal`, `year`, `volume`, `doi`, `arxivId`, `pages` — closer to BibTeX/CSL. Probably means a `kind: "paper" | "article" | "report"` discriminator on the citation record.
- **Different storage cost shape.** PDFs are 100KB–20MB each. The "preserve everything" math gets worse fast.

**Implication for v1.** Build the HTML/web-page path first. Define the bundle and citation schema so a future `kind: "paper"` extension is additive, not a rewrite. Specifically: leave room for an `identifiers: { doi?, arxivId?, isbn?, ssrnId? }` field and an attached binary slot in the bundle (e.g. `source.pdf`). Don't try to handle PDFs in v1 — but don't paint into a corner either.

## Tradeoffs and open questions

- **Folder vs. file in Obsidian.** 68 sub-folders is more visual noise than 68 files. Probably fine if `Citations/` is a leaf you rarely browse, but worth confirming.
- **Index file source-of-truth ambiguity.** Convention has to be: frontmatter is authoritative, the index is a cache. Add a `pnpm` (or Obsidian command) "rebuild index" path so corruption is recoverable.
- **HTML snapshot size.** ~50KB–2MB per page. 1k citations = 0.1–2 GB. Probably fine on disk, possibly painful for Obsidian's indexer. Could store outside the vault entirely (e.g. `~/code/lossless-monorepo/citation-archive/`) and reference by path.
- **Auto-update on rot resolution.** Strong-match auto-update is tempting but corrupts silently when wrong. Hard rule: weak/medium matches go to a review queue.
- **Where does this live?** Probably as additional commands in cite-wide rather than a new plugin. Metafetch stays single-page-OG; cite-wide owns the canonical-source domain.
- **Jina cost on existing corpus.** If we backfill `content.md` for the 68 existing citations, that's 68 Reader calls — trivial. At portfolio-crawler scale (hundreds-thousands per company × N companies) the cost shape is very different.

## Open questions to answer before building

1. Folder-per-citation vs. richer single-file citation: does the noise in `Citations/` actually bother you, or is it fine?
2. Lazy migration vs. one-shot backfill of existing 68: which feels right?
3. Where should HTML snapshots live — in-vault or outside?
4. Should the link-rot resolver run on a schedule (e.g. weekly) or only on demand from a review pane?
5. Does the `filesUsedIn` tracking handle file *renames* in the vault correctly today, or is that already drifting?
