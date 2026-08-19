---
title: Cite-Wide — dedupe inline repetition of identical hex citations
date_created: 2026-05-09
type: plan
status: proposed
target_repo: cite-wide
related:
  - "[[Auto-Hyperlink-Feature-Names-In-Tables]]"
site_uuid: bb2e1dc4-11a8-4fab-9fc6-7cb2cf85d377
hex_code: cityz8
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
lede: "One backreferenced regex collapses runs like [^jtas3k] [^jtas3k] — a different problem from dedupe-by-URL, which must stay untouched."
summary: "Proposed plan scoped tightly enough to implement without a spike: one helper in cite-wide's citationService.ts wired into two call sites. Gives the exact regex, a table of where it fires and where it must not, the four edge cases that must never be collapsed, and seven acceptance criteria. An agent implementing this should not extend dedupeByUrlService and should not add a new command surface — the user wants it built into Convert-All-To-Hex."
publish: true
---

# Cite-Wide — dedupe inline repetition of identical hex citations

## Symptom

After running **Convert All Citations to Hex Format** in cite-wide, the body sometimes ends up with consecutive identical hex markers separated only by whitespace:

```
… driving adoption of agentic workflows.[^jtas3k] [^jtas3k] [^jtas3k]
```

The repetition is upstream noise — usually from LLM output that emitted the same numeric citation 2–3 times in a row (`[1] [1] [1]` or `[1][1][1]`), or from the LLM-paste pipeline expanding a comma group like `[1, 1, 1]`. Hex conversion preserves the repetition because each token is a syntactically valid citation reference — but readers see it as a typo.

## Existing dedupe is the wrong tool

Cite-wide already ships **Dedupe Citations by URL** (`src/services/dedupeByUrlService.ts`, modal at `src/modals/DedupeByUrlModal.ts`, command id `dedupe-citations-by-url`). That service operates on the **reference-definition section**: it finds two distinct hex IDs whose `[^hex]: …` lines point to the same URL, picks a canonical, and rewrites every occurrence of the duplicate hex to the canonical hex throughout the document.

That's a different problem. URL-dedupe consolidates *different* hex IDs that happen to point to the same source. Inline-repetition dedupe collapses runs of *the same* hex ID that appear consecutively in body prose. Two separate operations; URL-dedupe should not be extended to handle this.

## Proposed behavior

Add a small **inline-repetition collapse** pass that runs as the last step of `convertAllCitations` (in `main.ts:499`) and inside the LLM-paste conversion pipeline (`src/services/llmCitationParserService.ts`). The pass:

1. Scans the document for runs of two-or-more occurrences of the **same** hex citation marker `[^xxxxxx]` separated only by whitespace (spaces, tabs) — never across newlines.
2. Collapses each run to a single occurrence.
3. Reports total collapsed runs in the existing post-conversion `Notice`.

The regex shape (one match per run):

```ts
// /(\[\^([a-z0-9]+)\])(\s+\[\^\2\])+/g
const INLINE_REPEAT_RE = /(\[\^([a-z0-9]+)\])(\s+\[\^\2\])+/g;
const collapsed = content.replace(INLINE_REPEAT_RE, '$1');
```

The backreference `\2` is what makes this safe: it only collapses when the *same* hex repeats. Two different hex IDs side-by-side (`[^abc123] [^def456]`) are legitimately distinct citations and must be preserved.

## Where it fires

| Surface | File / function | When |
|---|---|---|
| Convert All Citations to Hex | `main.ts:499` `convertAllCitations` | After `citationService.convertCitation` finishes the loop, before `editor.setValue` |
| LLM-paste pipeline | `src/services/llmCitationParserService.ts` | After numeric→hex token expansion, before the inserted text is returned |
| Selected-citation conversion | `main.ts:209` `convert-selected-citation-to-hex` | NOT here — selection-scoped converts only one ref; out of scope |
| Dedupe by URL | `src/services/dedupeByUrlService.ts` | NOT here — keep dedupe-by-URL focused on its single concern |

The right home for the helper is a tiny export in `src/services/citationService.ts` (it already owns `convertCitation`), e.g. `collapseInlineRepeats(content: string): { content: string; collapsed: number }`. Both surfaces import it.

## Edge cases — what NOT to dedupe

- **Different hex IDs adjacent**: `[^abc123] [^def456]` → unchanged. The backreference protects this.
- **Same hex separated by newline**: `[^abc123]\n[^abc123]` → unchanged. Newlines mean the second usage is in a different paragraph or list item; dedupe could destroy meaningful repetition (e.g. each bullet citing the same source).
- **Same hex in reference section**: `[^abc123]: …\n[^abc123]: …` → out of scope. The regex requires the markers themselves to be inline (no trailing `:`); reference-definition lines won't match because the colon makes them syntactically distinct from body markers.
- **Same hex on either side of punctuation**: `[^abc123], [^abc123]` → unchanged. The whitespace-only separator requirement keeps us conservative. If users want this collapsed too, treat it as a v2 enhancement after the conservative version proves safe.
- **Leading/trailing whitespace preserved**: collapsing a run leaves the surrounding spaces of the first marker intact; we replace the run with the first marker only, so neighbors keep their spacing.

## Out of scope (explicit)

- Cross-paragraph dedupe (newline separator).
- Punctuation-separator dedupe (`[^x], [^x]`).
- Reference-definition dedupe — that's already what `dedupeByUrlService` covers (for *different* hex IDs sharing a URL); identical-hex duplicate definitions are a separate pathology that should be flagged for the user, not silently collapsed.
- Adding a standalone command. The user explicitly wants this **built into Convert-All-To-Hex**, not a separate command. If a one-off post-hoc cleanup is needed later, expose the helper through the existing dedupe-by-URL modal as an optional checkbox — don't add a new command surface.

## Acceptance criteria

1. Running **Convert All Citations to Hex Format** on a document containing `[^jtas3k] [^jtas3k] [^jtas3k]` produces `[^jtas3k]` (single marker) at that position.
2. `[^abc123] [^def456]` (two distinct IDs) remains exactly `[^abc123] [^def456]`.
3. `[^abc123]` followed by a newline and `[^abc123]` on the next line remains unchanged.
4. Reference-definition lines (`[^abc123]: https://…`) are never touched by this pass, even when adjacent.
5. Post-conversion `Notice` is updated to mention collapsed runs when any occurred, e.g. `Converted 12 citations to hex format. Collapsed 3 inline repetitions.`
6. The helper has unit-test coverage in the existing test surface (or in `scripts/parse-llm-citations.mjs` if that's where parser-style logic is exercised).
7. `pnpm build` passes with no new TypeScript or ESLint warnings; the helper signature uses no `any` per the type-safety contract.

## Implementation order

1. Add `collapseInlineRepeats` to `src/services/citationService.ts`.
2. Wire it into `main.ts:499` `convertAllCitations` (between the loop and `editor.setValue`).
3. Wire it into `llmCitationParserService.ts` at the appropriate post-tokenization step.
4. Update the `Notice` strings in both surfaces to surface the collapsed-runs count.
5. Add a changelog entry under `cite-wide/context-v/changelogs/YYYY-MM-DD_NN.md` per repo convention.

## Why this is small enough to ship without a spike

The regex is one line. The integration touches two callsites. There's no new modal, no new command, no new service. The whole change is on the order of 30–50 lines including the helper, the wiring, and a handful of unit tests.
