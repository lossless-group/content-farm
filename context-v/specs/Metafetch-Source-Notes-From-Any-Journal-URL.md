---
title: "Metafetch source notes — fetch from any journal URL, not just `url`"
lede: "A note about a paper keys its link as `arxiv:`, not `url:` — and metafetch couldn't see it. Phase 1 ships a URL picker across every frontmatter property; phases 2–3 make what comes back worth having for journals and trade press."
date_created: 2026-08-17
date_modified: 2026-08-17
date_authored_initial_draft: 2026-08-17
date_authored_current_draft: 2026-08-17
type: spec
status: Phases-1-and-2-Shipped
target_repo: content-farm
site_uuid: 1e24af09-b927-4a0c-8664-7079e03a878a
hex_code: qclh88
at_semantic_version: 0.0.2.0
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5 (1M context)
affects:
  - metafetch
  - cite-wide
  - grab-reference
tags:
  - Metafetch
  - Source-Notes
  - Citation-Metadata
  - Obsidian-Plugins
related:
  - "[[What-To-Do-With-Grab-Reference]]"
  - "[[Metafetch-Wraps-Tags-Array-Items-In-Quotes]]"
---

# Metafetch source notes — fetch from any journal URL

## The use case

Create an Obsidian document **about** a source — a journal article, an arXiv
paper, a TechCrunch piece — and have metafetch populate its frontmatter.

This is deliberately **not** what cite-wide does. cite-wide handles a citation
*inside* a document: a hex-coded footnote pointing outward. This is the other
unit — **one document per source**, where the source is the subject rather than
a reference. Both are wanted; they don't substitute for each other.

## Why metafetch couldn't do it

`main.ts` read exactly one property:

```ts
const url = typeof fm.url === 'string' ? fm.url : null;
if (!url) { new Notice('Metafetch: no `url` field in frontmatter'); return; }
```

Source notes don't key their link as `url`. They key it by **where the source
lives** — `arxiv:`, `ssrn:`, `nature:`, `techcrunch:`, `doi:` — and a single
note often carries several at once, plus an `og_image` and `og_favicon` from a
previous fetch. A note keyed `arxiv:` was simply invisible to metafetch.

There is no correct precedence order to guess here. **Show what's there and let
the human choose.**

## Phase 1 — the URL picker (shipped)

New command: **"Fetch from a frontmatter URL…"**

1. Parse the active note's frontmatter.
2. Collect every `http(s)` value — scalars and array items alike.
3. Show them in a modal, labelled by property, with a provider selector.
4. Fetch the chosen one; write metadata as the existing commands do.

### What counts as a candidate

`src/utils/frontmatterUrls.ts`. Conservative on purpose:

| Rule | Rationale |
|---|---|
| `^https?://` only | `doi:10.1234/x`, `mailto:`, `obsidian://` aren't fetchable pages |
| Array items included, labelled `mirrors[0]` | A paper commonly has both an abs page and a PDF |
| Configured image + favicon fields excluded | Never offer metafetch's own output as a target |
| Image **extensions** excluded too | Catches the same values when those fields were renamed |
| Same URL under two properties → both shown | Which property you fetched is meaningful; don't dedupe it away |

The double exclusion matters: an already-fetched note carries `og_image` and
`og_favicon`, and offering those as fetch targets would be worse than useless.
Field-name exclusion handles the defaults; extension matching catches renames.

### Two behaviours worth naming

**The existing commands are unchanged.** *Direct Fetch from Script* and *Fetch
via Microlink* still read `fm.url` and still fail the same way — except the
failure notice now points at the picker. `runFetchScript` takes an optional
explicit URL; without it, nothing about the old path moved.

**Fetching `arxiv:` no longer mints a `url:` key.** The old code did
`next.url = url` unconditionally. Through the picker that would quietly add a
duplicate `url:` to a note that deliberately keyed it as `arxiv:` — metafetch
writing a key nobody asked for, the same failure class as
[[Metafetch-Wraps-Tags-Array-Items-In-Quotes]]. Now `url` is only claimed when
the URL came from it, or when nothing holds it yet.

### Verification

`tests/frontmatterUrls.test.mjs`, 14 cases wired into `pnpm test`: journal-keyed
properties, several journals in one note, both exclusion mechanisms, array
enumeration, scheme filtering, whitespace, empty frontmatter.

## Phase 2 — scholarly metadata (shipped)

Phase 1 fixed *which* URL gets fetched. It did nothing about **what comes back**,
and for journals that was the bigger gap. Measured against a real arXiv abs page
by running the real code path:

```yaml
og_title: "In-Context Prompting Obsoletes Agent Orchestration for Procedural Tasks"
og_description: "…the abstract…"
og_image: "https://arxiv.org/static/browse/0.3.4/images/arxiv-logo-fb.png"
og_site_name: "arXiv.org"
og_type: "website"
```

**No authors. No publication date.** Three causes:

1. arXiv declares `og:type: website` — it doesn't even self-describe as an
   article, so `og_type` actively misleads.
2. arXiv publishes scholarly metadata as **Highwire Press `citation_*` tags**,
   which the direct service never reads. Present and ignored on that page:
   `citation_author` ×5, `citation_date`, `citation_pdf_url`,
   `citation_arxiv_id`, `citation_abstract`, `citation_title`.
3. `getMeta()` returns only the **first** regex match, and
   `result.authors = [author]` wraps exactly one value. Five authors would
   collapse to one even after teaching it the right tag name.

The article path is not broken — it just never fires on arXiv. On a page with
`<meta name="author">` it works today, and post-quoting-fix emits cleanly:

```yaml
og_site_name: "Simon Willison’s Weblog"
authors:
  - Simon Willison
```

### What shipped

- **`getMetaAll()`** — every value for a repeated tag, in document order,
  de-duplicated. The prerequisite for multi-author; `getMeta()` is now a
  one-line wrapper over it, so single-value behaviour is unchanged.
- **A `citation_*` tier** for authors and publication date.
- **Normalizers**: `"Wang, Yanlin"` → `"Yanlin Wang"` (cite-wide's schema
  validates `"FirstName LastName"`), guarded against flipping credentials
  (`"Jane Doe, PhD"` stays put); `2025/12/01` → `2025-12-01`, with ISO
  timestamps passing through untouched.
- `citation_title` as a title fallback, ahead of the `<title>` tag.

**Tiers are first-non-empty, not merged.** A journal page can carry a generic
`author` naming one person *and* a full `citation_author` set; merging would
list the same people twice under two spellings. `citation_*` leads because it
is complete where the generic tags are lossy. `article:author` values that are
URLs (commonly a profile link, not a name) are dropped.

Verified end-to-end against `arxiv.org/abs/2512.01939` — six authors, correctly
flipped, `og_published: 2025-12-01`. Obsidian types both correctly: `authors`
renders as a list property, `og_published` as a date.

### What the evidence changed about this phase

The plan called for a JSON-LD schema.org tier, on the assumption trade press
needed it. **It didn't.** Checking a live TechCrunch article first showed it
already serves `name=author` and `article:published_time`, and correctly reports
`og:type: article` — so it worked before this phase and still does. JSON-LD was
dropped as speculative rather than built on an assumption.

The lesson worth keeping: **the gap was scholarly-only.** Trade press is well
served by the generic tags; academic publishers are the ones using a separate
standard.

### Still open from this phase

- **Canonical-URL awareness**: arXiv's `og:url` is the *versioned* abs page
  (`…v2`) while the fetched URL is unversioned. Decide which we record.
- **`og_type` still reports `website` on arXiv.** That is arXiv's literal
  `og:type` value, and overriding it would mean writing something the source
  did not say. Inferring "this is a working paper" belongs with
  `publisher_type` in Phase 3, where cite-wide's taxonomy already has
  `Academic-Working-Paper`.

## Phase 3 — the source-note shape (not started)

**Adopt cite-wide's field vocabulary rather than inventing one.**
`plugin-modules/cite-wide/context-v/blueprints/Lossless-Citation-Standards.md`
already defines 24 fields with an Expected/Optional matrix across 12
`publisher_type` values — and that taxonomy already names both target cases:

| `publisher_type` | Examples from the standard |
|---|---|
| `Academic-Working-Paper` | NBER, SSRN, **arXiv** |
| `Industry-Media` | **TechCrunch**, The Information, Bloomberg, FT |

`Citation-Field-Acquisition-Guide.md` goes further and specifies the cheap path
per field, including a hostname→tags map that names `*.arxiv.org`. The design
work is largely done; it has never been implemented against a plugin.

Open questions for this phase:

- **Enrich-in-place vs. create-a-note.** Phase 1 enriches the active note. The
  full use case may want "new note from URL" — which is `filestarter`'s
  competence, not metafetch's.
- **Field namespacing.** Fetching two different URLs into one note overwrites
  the first's `og_*` values. Prefixing per source property (`arxiv_title`)
  would solve it but breaks the configurable-field-name contract. Unresolved —
  Phase 1 deliberately kept existing behaviour rather than invent a convention.
- **`authors` semantics.** On a source note it means the *source's* authors,
  matching cite-wide's schema. That is the intended reading and needs no guard:
  you would not run metafetch on a document you wrote.

## Relationship to `grab-reference`

[[What-To-Do-With-Grab-Reference]] is an open operator decision between four
options for a module that turned out to be a `citation-manager` pnpm workspace —
web app, Prisma API, Docker — with no `manifest.json`, currently held out of the
dependency-upgrade loop. **Option 2 is "rebuild as an actual plugin", and its
CLAUDE.md description is "Capture references (URLs, papers, etc.) into a vault
structure" — this use case exactly.**

Building in metafetch first is deliberate: the extractor work of Phase 2 is
required under *any* answer to that decision, so it generates evidence about
whether a separate capture plugin is warranted instead of pre-committing to a
second scaffold. If the answer turns out to be yes, the extractor lifts out.

## Adjacent finding — metafetch ships cite-wide's stylesheet

Not part of this spec's work, surfaced while building the picker.
`esbuild.config.mjs` builds CSS from `src/styles/citations.css`, whose contents
are entirely `.cite-wide-*` classes. metafetch's own modals reference
`.metafetch-modal`, `.batch-metafetch-modal`, and `.opengraph-*` — **defined
nowhere**. So metafetch ships no styling of its own, and the widen-modal fix
recorded in [[Widen-Modals-in-Obsidian-using-CSS]] has no CSS behind it.

`SelectUrlModal` is therefore built from Obsidian's native `Setting` component,
which the app styles regardless. That sidesteps the problem for the new surface
but does not fix it. Worth its own issue.

## References

- `plugin-modules/metafetch/src/utils/frontmatterUrls.ts` — Phase 1 discovery
- `plugin-modules/metafetch/src/modals/SelectUrlModal.ts` — Phase 1 picker
- `plugin-modules/metafetch/src/services/directFetchService.ts` — Phase 2 `citation_*` tier
- `plugin-modules/metafetch/tests/` — 52 cases across the three units
- `plugin-modules/cite-wide/context-v/blueprints/Lossless-Citation-Standards.md` — the field vocabulary to adopt
- `plugin-modules/cite-wide/context-v/blueprints/Citation-Field-Acquisition-Guide.md` — per-field acquisition strategy
- [[What-To-Do-With-Grab-Reference]] — the open decision this informs
- [[Metafetch-Wraps-Tags-Array-Items-In-Quotes]] — the same don't-touch-keys-you-don't-own principle
