---
title: Metafetch wraps tags array items in quotes
lede: >-
  Metafetch re-serializes the whole frontmatter, so its quote-everything rule turns an inline `tags: [a, b]` into one quoted string.
date_created: 2026-08-17
date_modified: 2026-08-17
type: issue
status: Resolved
target_repo: content-farm
site_uuid: 806b080b-66fa-459a-a76f-a633040c021b
hex_code: 0dc6t4
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5 (1M context)
affects:
  - metafetch
tags:
  - Frontmatter
  - YAML
  - Issue-Resolution
  - Obsidian-Plugins
date_authored_initial_draft: 2026-08-17
date_authored_current_draft: 2026-08-17
publish: true
---

# Metafetch wraps tags array items in quotes

**Plugin:** `plugin-modules/metafetch` — found in `0.1.6`, fixed on `development`
**Reported symptom:** running *Direct Fetch from Script*, *Fetch via Microlink*, or the batch fetch on a note leaves the note's `tags` array with every item wrapped in double quotes.

> **Status:** resolved — see [*Resolution — shipped*](#resolution--shipped). The audit below is kept as written so the reasoning survives, including the two bugs the reported symptom was sitting on top of.

## What the user sees

Before:

```yaml
---
title: Some Article
tags:
  - augmented-intelligence
  - ai
url: https://example.com/post
---
```

After running any metafetch command:

```yaml
---
title: "Some Article"
tags:
  - "augmented-intelligence"
  - "ai"
url: "https://example.com/post"
og_screenshot_url: "https://…"
---
```

The scalar quoting is **intentional**. The array quoting is not.

## Root cause

One file: `plugin-modules/metafetch/src/utils/yamlFrontmatter.ts`.

Metafetch does not use a YAML library. It has a hand-rolled `extractFrontmatter()` (regex + line loop) and a hand-rolled `formatFrontmatter()` (object → YAML string). The quoting rule lives in `formatFrontmatter`, lines 102–113:

```ts
if (Array.isArray(value)) {
  if (value.length === 0) {
    return `${key}: []`;
  }
  // Block-style YAML array with each item double-quoted (and \\ / \"
  // escaped). Matches the convention used for scalar string values.
  const items = value.map(item => {
    const escaped = String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `  - "${escaped}"`;
  }).join('\n');
  return `${key}:\n${items}`;
}
```

`  - "${escaped}"` is unconditional. Every item of every array gets quoted.

The comment names the reason honestly — it was written to *match* the scalar rule directly below it:

```ts
// Always double-quote string values. URLs (og_image, og_favicon, etc.)
// routinely contain ?, =, +, (, ), # and other YAML-unsafe chars; quoting
// unconditionally is simpler and safer than enumerating every risky case.
```

That reasoning holds for scalars. It does not transfer to sequence items, where a bare slug like `augmented-intelligence` was never at risk.

### Why it touches `tags` at all — the amplifier

Metafetch never surgically edits the keys it owns. **Every write path reads the whole frontmatter block, parses it into a plain object, and re-serializes the whole thing.** Five call sites, all identical in shape:

| Call site | Line |
|---|---|
| `main.ts` — `runFetchScript()` (direct + microlink commands) | `main.ts:87` → `main.ts:118` |
| `MetafetchModal.writeErrorToFrontmatter()` | `MetafetchModal.ts:234` → `:252` |
| `MetafetchModal` — main insert path | `MetafetchModal.ts:446` → `:490` |
| `BatchMetafetchModal.updateFileMetadata()` | `BatchMetafetchModal.ts:667` → `:726` |
| `BatchMetafetchModal` — error/write path | `BatchMetafetchModal.ts:773` → `:791` |

So a key metafetch has no business touching — `tags`, `authors`, `aliases`, anything — still round-trips through `formatFrontmatter` and comes back in metafetch's house style.

`BatchMetafetchModal.ts:671-672` and `:715-718` even try to protect tags:

```ts
// Save the original tags if they exist
const originalTags = frontmatter.tags;
…
// Restore the original tags if they existed
if (originalTags !== undefined) {
  frontmatter.tags = originalTags;
}
```

This preserves the *parsed value* but not the *serialization* — the restored array is handed straight back to `formatFrontmatter`, which re-quotes it. The guard was aimed at the right problem and lands one layer too high.

## Verification

Bundled the util with esbuild and round-tripped real frontmatter shapes through `extractFrontmatter` → `formatFrontmatter`:

| Input | Parsed to | Re-emitted as | Verdict |
|---|---|---|---|
| `tags:` + `  - augmented-intelligence` / `  - ai` | `["augmented-intelligence","ai"]` | `tags:` + `  - "augmented-intelligence"` / `  - "ai"` | **Bug A** — the reported one |
| `tags: [augmented-intelligence, ai]` | `"[augmented-intelligence, ai]"` *(a string!)* | `tags: "[augmented-intelligence, ai]"` | **Bug B** — worse |
| `authors:` + `  - "[[Ada Lovelace]]"` | `["[[Ada Lovelace]]"]` | `  - "[[Ada Lovelace]]"` | correct — quoting required here |
| `site:` + `  name: X` + `  id: 3` | `{site: [], name: "X", id: 3}` | `site: []` + `name: "X"` + `id: 3` | **Bug C** — nesting destroyed |
| `date_created: 2026-08-17` | `"2026-08-17"` | `date_created: "2026-08-17"` | working as designed; see open question |

## The three bugs, ranked

### Bug A — array items are unconditionally quoted *(the reported symptom)*

Cosmetic-to-annoying. Obsidian still parses `- "ai"` as the tag `ai`, so the tag pane keeps working, but the file churns on every fetch and the diff noise is real.

### Bug B — inline flow sequences are destroyed *(more severe, not yet reported)*

`extractFrontmatter` has no case for `[a, b, c]`. The value doesn't match `null`/`true`/`false`/number, isn't quoted, so it falls through to the string branch and is stored as the literal string `"[augmented-intelligence, ai]"`. `formatFrontmatter` then writes it back **quoted**, which is no longer a YAML sequence at all.

Result: `tags: "[augmented-intelligence, ai]"` — one tag named `[augmented-intelligence, ai]`, or nothing, depending on the reader. Obsidian's tag pane loses the note. This is data loss, and it is silent.

Inline arrays are common in hand-authored notes and in output from other tools, so this is not a corner case.

### Bug C — nested mappings are flattened *(collateral, out of scope for the quick fix)*

`extractFrontmatter`'s line loop treats "key with empty value" as "start of a block sequence" (lines 52–56). A nested mapping therefore becomes an empty array, and its children are **promoted to top-level keys**. `site: {name, id}` comes back as `site: []` plus sibling `name:` and `id:`.

Any note with nested frontmatter that passes through metafetch is corrupted. Rarer than tags in our vault, but the failure is total rather than cosmetic.

## Adjacent finding (not the reported bug)

`MetafetchModal.writeErrorToFrontmatter()` at `MetafetchModal.ts:255`:

```ts
const newContent = content.replace(/---\n(.*?)\n---/s, `---\n${newFrontmatter}\n---`);
```

Unanchored. Every other call site uses `/^---\n((?:.|\n)*?)\n---/`. On a note with **no** frontmatter but a `---` thematic break in the body, this replaces the body break — then `newContent.startsWith('---')` is false, so it *also* prepends a fresh frontmatter block. Body mangled and a stray block added. Low frequency, cheap fix: anchor it with `^` and reuse the shared regex.

## Proposed fix

**Scope discipline: keep the scalar rule. Change only sequence items.** The zealous scalar quoting exists because URLs with `?`, `=`, `#`, `:` genuinely break unquoted YAML, and because reformatting every scalar in the vault is not a change anyone asked for.

### 1. Quote array items only when YAML requires it

Add a predicate to `yamlFrontmatter.ts` and use it in the array branch:

```ts
/**
 * True when a string cannot be written as a bare YAML scalar — i.e. quoting it
 * is required for correctness, not style. Used for sequence items, where the
 * unconditional-quote rule that protects URL scalars produces `- "ai"` noise.
 */
function needsYamlQuoting(s: string): boolean {
  if (s === '') return true;
  if (s !== s.trim()) return true;                    // leading/trailing space
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(s)) return true; // indicator char first
  if (/:\s|\s#/.test(s)) return true;                 // key-ish or comment-ish
  if (/[\n\r]/.test(s)) return true;                  // multiline
  // would change type on re-read
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(s)) return true;
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;      // date-ish
  return false;
}
```

Then in the array branch:

```ts
const items = value.map(item => {
  const raw = String(item);
  if (!needsYamlQuoting(raw)) return `  - ${raw}`;
  const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `  - "${escaped}"`;
}).join('\n');
```

Consequences, deliberate:

- `- augmented-intelligence` → bare. Fixes the reported bug.
- `- "[[Ada Lovelace]]"` → **stays quoted** (leading `[`). Wikilinks in `authors` keep working.
- `- "2026-08-17"` → stays quoted, so a date-shaped tag doesn't silently become a date object.

### 2. Parse inline flow sequences in `extractFrontmatter`

Before the string branch, add a flow-sequence case — **with a wikilink guard**:

```ts
} else if (value.startsWith('[') && value.endsWith(']') && !isWikilink(value)) {
  const inner = value.substring(1, value.length - 1).trim();
  frontmatterObject[key] = inner === '' ? [] : splitFlowSequence(inner);
}
```

The guard is not optional. `related: [[Some Note]]` also starts with `[` and ends with `]`, so a naïve flow-sequence branch parses the wikilink into `["[Some Note]"]` and emits it as a block array — turning a link into garbage. The first draft of this fix had exactly that hole; the test suite caught it.

`splitFlowSequence` must split on commas *outside* quotes, then strip per-item quotes the same way the block-sequence branch already does. A naïve `.split(',')` breaks on `["a, b", c]`.

Note the intentional shape change: an inline array is read as an array and written back as a **block** array. That is a normalization, not a round-trip — worth calling out in the changelog entry.

### 3. Anchor the error-path regex

Replace the unanchored `/---\n(.*?)\n---/s` at `MetafetchModal.ts:255` with the shared `/^---\n((?:.|\n)*?)\n---/`.

### 4. Nested mappings — separate decision

Bug C is a parser-architecture question, not a quoting question. Two paths:

- **Preserve-don't-parse:** detect an indented child line, capture the nested block verbatim as an opaque string, and re-emit it byte-for-byte. Small, safe, no nested writes.
- **Adopt a real parser:** the reason `yamlFrontmatter.ts` is hand-rolled is that Obsidian plugin bundles want to stay small, and the original author wanted full control of quoting. A tiny YAML lib plus a custom emitter would fix A, B, and C at once but changes the bundle and re-opens every quoting decision.

Recommend shipping 1–3 as the bug fix and taking C as its own change with its own regression suite.

## Are quoted wikilinks safe? — yes, and they are *required*

Asked during review, and worth pinning because the intuition runs the other way: quoting looks like the thing that would break a link, so the instinct is to strip it.

Checked against `js-yaml`, the parser Obsidian itself uses:

| YAML | Parses to |
|---|---|
| `authors:` + `  - [[Ada Lovelace]]` | `[[["Ada Lovelace"]]]` — a **doubly-nested array** |
| `authors:` + `  - "[[Ada Lovelace]]"` | `["[[Ada Lovelace]]"]` — the string we wanted |
| `author: [[Ada Lovelace]]` | `[["Ada Lovelace"]]` — nested array, not a link |

`[` and `]` are YAML flow-sequence indicators. Unquoted, `[[Ada Lovelace]]` is a sequence containing a sequence containing the scalar `Ada Lovelace` — the link text is gone before Obsidian's link resolver ever sees a string. **Quoting a wikilink in frontmatter is mandatory**, which is why Obsidian's own "add link to property" UI writes the quotes for you.

So the `needsYamlQuoting` predicate's leading-indicator rule is doing real work here, not cosmetic work: it catches the leading `[` and keeps every wikilink quoted while letting `- ai` go bare. Alias (`[[Doc|Alias]]`) and heading (`[[Doc#Section]]`) forms are covered by the same rule.

One accidental virtue of metafetch's hand-rolled parser worth preserving: it is *lenient* on the way in. It reads an **unquoted** `[[Ada Lovelace]]` as a plain string, so a note that was already missing its quotes gets them **added** on the next fetch. Metafetch repairs that class of file rather than compounding it.

## Resolution — shipped

Items 1–3 implemented. Bug C (nested mappings) deliberately deferred.

**`src/utils/yamlFrontmatter.ts`**

- Added `needsYamlQuoting()` — quotes a sequence item only when YAML requires it: empty, padded, leading indicator char, `: ` or ` #`, contains a comma, multiline, or a bare form that would change type on re-read (`true`/`no`/`null`, numbers, dates).
- Added `isWikilink()` — guards the new flow-sequence branch so `[[Note]]` is never parsed as a sequence.
- Added `splitFlowSequence()` — quote-aware comma splitting for `tags: [a, "b, c"]`.
- Added `unquoteScalar()` — the unquote-and-unescape logic was duplicated in the block-item branch and the scalar branch; now one function serves both.
- Array emitter quotes conditionally. Scalar emitter unchanged — the zealous URL-safety rule stands.

**`src/modals/MetafetchModal.ts:255`** — anchored the error-path regex with `^`.

**`src/modals/BatchMetafetchModal.ts:671,715`** — the save/restore-tags guard is left in place. It is now redundant for serialization but still guards against a future edit clobbering the value, and removing it buys nothing.

Two findings surfaced during implementation rather than audit:

1. **The flow-sequence fix as originally drafted would have destroyed wikilinks** — `[[Some Note]]` satisfies `startsWith('[') && endsWith(']')`. Caught by the test suite, fixed with `isWikilink`.
2. **Items containing a comma.** `- a, b` is valid YAML in block context (js-yaml agrees) so a strict reading says leave it bare. Chose to keep it quoted anyway — it is ambiguous to a human reader and breaks the instant anything reflows it to flow style.

## Test suite — pinned

`metafetch` had no test harness. Added `tests/yamlFrontmatter.test.mjs`, wired to `pnpm test`. No framework and no new runtime dependency: it esbuild-bundles the util to a temp dir and imports it.

Each of the 16 cases asserts four things — parsed object, emitted text, **idempotence** (re-parsing our own output is a fixed point, so repeated fetches stop churning the file), and agreement with `js-yaml` when it happens to be installed (skipped gracefully otherwise). Coverage: bare block tags, Train-Case tags, inline→block normalization, quote-aware comma splitting, empty arrays, all four wikilink forms, type-changing items (numeric / boolean / date / colon-space), mixed arrays, and non-regression on the intentional URL and date scalar quoting.

`pnpm test` → 16 passed. `tsc -noEmit` and `node esbuild.config.mjs production` both clean.

## Settled: quoted date scalars are fine

The audit flagged `date_created: "2026-08-17"` as an open question — whether the quotes cost us date-typed properties in Bases/Dataview. **Answered: Obsidian reads a quoted date fine, and it makes no practical difference either way.** No change made; the scalar rule keeps quoting them. Recorded so this doesn't get re-litigated.

## References

- `plugin-modules/metafetch/src/utils/yamlFrontmatter.ts` — the whole bug
- [[Symlinked-Vault-Folders-Are-Invisible-To-The-Obsidian-Index]] — the other standing metafetch-adjacent vault-integration issue
