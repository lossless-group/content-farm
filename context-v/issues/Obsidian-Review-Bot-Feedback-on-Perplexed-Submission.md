---
title: "Obsidian Review Bot Feedback on Perplexed Submission"
date_created: 2026-05-09
date_modified: 2026-05-09
status: Open
applies_to: perplexed Obsidian plugin (and by extension, any future Lossless plugin submitted to the community marketplace)
authored_in_context_of: "GitHub PR obsidianmd/obsidian-releases#12513 — 'Add plugin: Perplexed'"
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
semantic_version: 0.0.0.1
tags:
  - Issue-Resolution
  - Obsidian-Plugin-Submission
  - ObsidianReviewBot
  - Marketplace-Compliance
related_files:
  - plugin-modules/perplexed/main.ts
  - plugin-modules/perplexed/context-v/plans/2026-05-02_Submission-Blockers-Punch-List.md
  - plugin-modules/perplexed/context-v/plans/20206-05-02_Assuring-Obsidian-Community-Plugin-Requirements.md
  - plugin-modules/image-gin/context-v/plans/2026-05-03_Assuring-Obsidian-Community-Plugin-Requirements.md
---

## TL;DR

`ObsidianReviewBot` reviewed [PR #12513](https://github.com/obsidianmd/obsidian-releases/pull/12513) (the Perplexed marketplace submission) on **2026-05-03** at commit `14962edd` and posted a structured punch list. **All findings are in `main.ts`**; no other source files were flagged in this round. Fix everything in the **Required** section before pushing again — the bot rescans every six hours; do *not* open a new PR.

The patterns the bot flagged are the same patterns Obsidian's [eslint-plugin](https://github.com/obsidianmd/eslint-plugin) enforces. We should adopt that plugin into our shared lint config so future submissions trip locally before they reach the bot.

This issue captures the verbatim findings, our diagnosis per item, and the fix plan. Cross-reference: [[2026-05-02_Submission-Blockers-Punch-List]] anticipated some of these but missed several. [[20206-05-02_Assuring-Obsidian-Community-Plugin-Requirements]] (note the filename typo — `20206` should be `2026`) is the broader prep plan.

## The PR

- **PR**: <https://github.com/obsidianmd/obsidian-releases/pull/12513>
- **Commit reviewed**: `14962edde151c6f10c2eff42f9ee046c83fd3057`
- **Status (as of writing)**: OPEN, awaiting fixes
- **Reviewer**: `ObsidianReviewBot` (Anthropic auto-scanner, runs server-side; the linter is open-sourced as [`obsidianmd/eslint-plugin`](https://github.com/obsidianmd/eslint-plugin))
- **Re-review trigger**: push to repo, then wait up to 6 hours
- **Do not**: open a new PR, rebase the existing PR

## Required findings (must fix)

Counts are line-occurrences in `main.ts` at commit `14962edd`. All under the `### Required` heading in the bot's comment.

### 1. `console.log` everywhere — **112 occurrences**

> *"Unexpected console statement. Only these console methods are allowed: `warn`, `error`, `debug`."*

The bot's allow-list is `console.warn`, `console.error`, `console.debug`. Every `console.log` and `console.info` is rejected.

**Lines (first 30 of 112):** 309, 326, 341, 354, 367, 440, 449, 458, 465, 469, 552, 571, 581, 598, 609, 628, 638, 655, 663, 669, 685, 688, 701, 708, 718, 737, 747, 751, 764, 774, …

**Fix strategies:**

- For diagnostic noise that should not ship to users in production, **remove**.
- For diagnostic info that *should* survive (network round-trip, background work), **`console.debug`**.
- For genuine warnings (deprecated path, recoverable error), **`console.warn`**.
- For thrown-equivalent failures that are caught and logged before being shown to the user, **`console.error`**.

A blanket `s/console\.log/console.debug/g` will *pass the bot* but it's lying. Worth doing the audit pass per call site.

### 2. UI text not in sentence case — 1 occurrence (line 439)

> *"Use sentence case for UI text."*

Obsidian's UI convention: only the first word and proper nouns are capitalized. `"Generate Citation Footer"` → `"Generate citation footer"`. Affects command names, settings labels, and any user-visible string.

This is one occurrence in main.ts but **almost certainly applies elsewhere** the bot didn't grep — the modal classes, the settings tab. Audit globally before re-submission.

### 3. `command` in command ID — 1 occurrence (line 440)

> *"Adding `command` to the command ID is not necessary."*

```ts
// Before
this.addCommand({ id: 'do-the-thing-command', ... })

// After
this.addCommand({ id: 'do-the-thing', ... })
```

### 4. `command` in command name — 2 occurrences (lines 440, 458)

> *"Adding `command` to the command name is not necessary."*

Same idea as #3 but for the human-readable name field.

### 5. Plugin name inside command name — 1 occurrence (line 920)

> *"The command name should not include the plugin name, the plugin name is already shown next to the command name in the UI."*

```ts
// Before
this.addCommand({ name: 'Perplexed: Generate research', ... })

// After
this.addCommand({ name: 'Generate research', ... })
```

The command palette shows the plugin name as a separate column.

### 6. `async` methods with no `await` — 13 occurrences total

> *"Async method '<name>' has no 'await' expression."*

Three method names cited:

- `reinitializeServices` — lines 1027, 1106, 1139, 1217, 1283, 1291, 1342, 1422, 1468, 1492 (10×)
- `afterMessage` — line(s) (count not isolated by my parser, present in body)
- `processStreamingMetadata` — lines 1090, 1201, 1267 (3×)

**Fix:** drop `async` keyword if the body doesn't await; keep `async` and add a real awaitable; or change return type to `void` if it's fire-and-forget.

### 7. HTML headings created with `createEl('h2'/'h3')` in settings — 5 occurrences

> *"For a consistent UI use `new Setting(containerEl).setName(...).setHeading()` instead of creating HTML heading elements directly."*

**Lines:** 1028, 1107, 1140, 1218, 1284

```ts
// Before
containerEl.createEl('h2', { text: 'Provider settings' })

// After
new Setting(containerEl).setName('Provider settings').setHeading()
```

The `setHeading()` API gives Obsidian's settings UI a consistent visual rhythm and inherits theme styling automatically. Same advice we should apply to image-gin and cite-wide settings tabs.

### 8. Inline `element.style.*` assignments — 32 occurrences

> *"Avoid setting styles directly via `element.style.<prop>`. Use CSS classes for better theming and maintainability. Use the `setCssProps` function to change CSS properties."*

Four properties flagged, 8 occurrences each:

| Property        | Lines |
|-----------------|-------|
| `style.color`     | 1080, 1191, 1257, 1431, 1453, 1477, 1501, 1523 |
| `style.width`     | 1081, 1192, 1258, 1432, 1454, 1478, 1502, 1524 |
| `style.minHeight` | 1082, 1193, 1259, 1433, 1455, 1479, 1503, 1525 |
| `style.fontFamily`| 1097, 1208, 1274, 1437, 1459, 1483, 1507, 1529 |

**Fix:** every cluster lives near another in the same file, so these are likely 8 sibling render-helpers each setting four properties on a created element. Move the rules into a CSS class in `src/styles/`, attach the class via `el.addClass(...)`. For dynamic values that genuinely need to vary at runtime, use `el.setCssProps({ '--my-color': value })` and reference `var(--my-color)` from the stylesheet.

### 9. Floating promises in callbacks

> *"Promise returned in function argument where a void return was expected."*

The exact line numbers were grouped with adjacent findings in the cleaned output, but the rule is `@typescript-eslint/no-misused-promises`. Anywhere we pass an `async` function to an API that expects a sync `() => void`, the bot complains.

**Fix:** wrap with `void (async () => { ... })()` or use `.then(...).catch(...)` explicitly.

### 10. `unknown` interpolated into template literal

> *"Invalid type 'unknown' of template literal expression."*

Same fix as the rule mandated by Cite-Wide's existing [Obsidian-Type-Safety](../../plugin-modules/cite-wide/context-v/reminders/Obsidian-Type-Safety.md) reminder: narrow the `unknown` first (type guard, `instanceof Error`), or coerce with `String(...)`.

### 11. Native `fetch()` calls

> *"Unexpected use of `fetch`. Use the built-in `requestUrl` function instead of `fetch` for network requests in Obsidian."*

Image-gin's `imagekitService.ts` and our newer `image-gin/src/destinations/ImgurDestination.ts` both already use `requestUrl`. Perplexed has stragglers — likely in `src/services/perplexityService.ts` or wherever the streaming providers live (`fetch` is needed for true streaming, but the bot doesn't make exceptions; we'll need to either justify with a `/skip` comment or rework the streaming path to use `requestUrl` chunked).

**Note:** this is the only finding that may legitimately warrant a `/skip` reply on the PR — `requestUrl` doesn't support SSE / streaming responses the way `fetch` does. Worth confirming before the rewrite.

### 12. Throwing non-Error values

> *"Expected an error object to be thrown."*

```ts
// Before
throw 'Something went wrong'

// After
throw new Error('Something went wrong')
```

## Optional findings (the bot is gentle, but worth doing)

> *"'e' is defined but never used."*
> *"'error' is defined but never used."*

Catch blocks where the caught variable isn't referenced. Either rename to `_e` / `_error` (eslint convention for "intentionally unused") or drop entirely — modern TS allows `try { … } catch { … }`.

## Diagnosis: why so many of these?

Three patterns make up the bulk:

1. **`console.log` (112)** — pre-publishing diagnostic instinct never converted to `console.debug` for a production-quality plugin. We have the same instinct in image-gin and cite-wide.
2. **`element.style.*` × 4 properties × 8 sites (32)** — looks like 8 settings-tab sub-sections each rendering a colored / sized `<input>` or `<div>` inline. This is a one-time CSS extraction; doing it surfaces the visual structure of the settings tab.
3. **`async` without `await` (13)** — `reinitializeServices` was likely written with future-async in mind that never materialized. Drop the `async` keyword.

Together they're 157 of the ~165 total findings. Three afternoons of work, not three weeks.

## Fix plan

Recommended order, optimizing for "shortest path to bot-clean" while not making the codebase worse:

1. **Adopt `obsidianmd/eslint-plugin`** in `eslint.config.mjs` so `pnpm build` fails locally on every flagged pattern. Without this we keep round-tripping through the bot.
2. **Strip `console.log`** — pass over each call site, classify (remove / `debug` / `warn` / `error`), commit per file.
3. **Drop `command` from IDs and names; remove plugin name** — small, mechanical, one commit.
4. **Switch `createEl('h2'/'h3')` → `setHeading()`** — five sites, one commit.
5. **Move `element.style.*` into a CSS file** — eight render helpers; extract a `.perplexed-settings-row` (or similar) class with the color / width / min-height / font-family rules; add at-rules for the variant values.
6. **Drop `async` from no-await methods or add a real awaitable** — review each method; this is a chance to actually look at the lifecycle.
7. **Sentence-case audit** — global read-through of every string the user can see (commands, settings labels, modal titles, notices).
8. **Floating promises** — wrap or `.catch(...)`-tag.
9. **Throw `new Error(...)` instead of strings** — small, mechanical.
10. **`fetch` → `requestUrl`** — the only one that may need design discussion (streaming). If we keep `fetch` for streaming, file a `/skip` reply on the PR with the justification.

After each phase, push — the bot rescans every 6 hours and the comment thread will accumulate strikethroughs (or fresh findings, if a fix introduces a new pattern). **Do not** open a new PR, **do not** rebase.

## Reusable artifact opportunity

Many of these rules apply unchanged to image-gin, cite-wide, and any future plugin we submit. After perplexed is bot-clean, we should distill the rules into:

- **`content-farm/context-v/reminders/Obsidian-Marketplace-Compliance.md`** — short, sharp reminder doc that future plugin work loads automatically. Companion to cite-wide's existing `Obsidian-Type-Safety.md`. Cite this issue as the historical anchor.

That reminder is the *output* of this issue; this issue is the *journey*.

## What's NOT in this issue

- The `any`-rule findings (already covered by [[plugin-modules/cite-wide/context-v/reminders/Obsidian-Type-Safety.md]])
- The four-part `epoch.major.minor.patch` versioning experiment (resolved earlier; perplexed is on standard semver `0.1.0` for the marketplace submission)
- General plugin-quality criticisms outside the bot's scope (telemetry policy, fundingUrl, README quality) — those are reviewer-not-bot territory and come up only if the bot passes
- Any image-gin or cite-wide work — explicitly out of scope here, though the lessons transfer

## Status checklist

- [ ] Adopt `obsidianmd/eslint-plugin` in `perplexed/eslint.config.mjs`
- [ ] Confirm `pnpm build` reproduces all bot findings locally
- [ ] Phase 2 — `console.log` audit (112 sites)
- [ ] Phase 3 — command IDs / names cleanup
- [ ] Phase 4 — `setHeading()` migration (5 sites)
- [ ] Phase 5 — `element.style.*` → CSS classes (32 sites)
- [ ] Phase 6 — `async` without `await` (13 sites)
- [ ] Phase 7 — sentence-case audit
- [ ] Phase 8 — floating-promise wrapping
- [ ] Phase 9 — `throw new Error(...)`
- [ ] Phase 10 — `fetch` → `requestUrl` (or `/skip` with justification)
- [ ] Push, wait ≤ 6h, confirm bot re-scan is clean
- [ ] Distill into `content-farm/context-v/reminders/Obsidian-Marketplace-Compliance.md`
