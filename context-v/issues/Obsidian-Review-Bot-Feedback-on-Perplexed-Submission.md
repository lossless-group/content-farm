---
title: "Obsidian Review Bot Feedback on Perplexed Submission"
date_created: 2026-05-09
date_modified: 2026-05-18
status: Resolved (perplexed + cite-wide + image-gin all in the directory as of 2026-05-18)
applies_to: perplexed, cite-wide, image-gin, and any future Lossless plugin submitted to the community marketplace
authored_in_context_of: "GitHub PR obsidianmd/obsidian-releases#12513 — 'Add plugin: Perplexed' (the queue this PR sat in has since been retired; see Appendix A)"
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
  - Portal-Submission
related_files:
  - plugin-modules/perplexed/main.ts
  - plugin-modules/perplexed/context-v/plans/2026-05-02_Submission-Blockers-Punch-List.md
  - plugin-modules/perplexed/context-v/plans/20206-05-02_Assuring-Obsidian-Community-Plugin-Requirements.md
  - plugin-modules/image-gin/context-v/plans/2026-05-03_Assuring-Obsidian-Community-Plugin-Requirements.md
  - content-farm/context-v/issues/Dependabot-Alerts-Triage-Playbook-For-Lossless-Repos.md
  - content-farm/context-v/reminders/Obsidian-Marketplace-Compliance.md
  - content-farm/changelog/2026-05-18_01.md
site_uuid: ff02717b-7ede-4e22-a56f-720c50e90eeb
hex_code: 88jx54
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
lede: "165 bot findings, all in main.ts — plus the Appendix: the PR queue died mid-fix, and the plugin description lives in three places."
summary: "Historical journey doc for the perplexed marketplace submission, now marked resolved. The body catalogues the 2026-05-09 eslint-bot findings item by item with line numbers and fixes; Appendix A adds the post-PR-queue portal findings (A1-A11) the original body could not anticipate. For a new submission, use content-farm/context-v/reminders/Obsidian-Marketplace-Compliance.md instead — this file is the anchor that explains why each rule in that checklist exists."
---

> **2026-05-18 update — this document is now historical.** The PR-based queue this issue was written against (`obsidianmd/obsidian-releases#12513`) was retired by Obsidian sometime between 2026-05-09 and 2026-05-17. PR #12513 itself now returns 404. The submission flow as of writing is the hosted portal at **community.obsidian.md**, which runs an additional set of automated scans on top of the eslint-plugin findings captured below. All three Lossless plugins (cite-wide, image-gin, perplexed) shipped through the new portal on 2026-05-17 → 2026-05-18; the round-by-round story is captured in [`content-farm/changelog/2026-05-18_01.md`](../../changelog/2026-05-18_01.md). The forward-looking compliance checklist distilled from both this issue and the May 17-18 portal rounds lives at [`content-farm/context-v/reminders/Obsidian-Marketplace-Compliance.md`](../reminders/Obsidian-Marketplace-Compliance.md) — that's the doc to consult for new submissions. **See Appendix A below for the post-PR-queue findings that aren't in this issue's original body.**

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

Same fix as the rule mandated by Cite-Wide's existing [Obsidian-Type-Safety](../reminders/Obsidian-Type-Safety.md) reminder: narrow the `unknown` first (type guard, `instanceof Error`), or coerce with `String(...)`.

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

- The `any`-rule findings (already covered by [[context-v/reminders/Obsidian-Type-Safety.md]])
- The four-part `epoch.major.minor.patch` versioning experiment (resolved earlier; perplexed is on standard semver `0.1.0` for the marketplace submission)
- General plugin-quality criticisms outside the bot's scope (telemetry policy, fundingUrl, README quality) — those are reviewer-not-bot territory and come up only if the bot passes
- Any image-gin or cite-wide work — explicitly out of scope here, though the lessons transfer

## Status checklist

- [x] Adopt `obsidianmd/eslint-plugin` in `perplexed/eslint.config.mjs` *(landed in perplexed; image-gin and cite-wide adopted the equivalent rule set)*
- [x] Confirm `pnpm build` reproduces all bot findings locally
- [x] Phase 2 — `console.log` audit *(closed in perplexed's `chore(marketplace): pass ObsidianReviewBot lint cleanly` commit)*
- [x] Phase 3 — command IDs / names cleanup
- [x] Phase 4 — `setHeading()` migration
- [x] Phase 5 — `element.style.*` → CSS classes
- [x] Phase 6 — `async` without `await` *(also surfaced in image-gin and cite-wide, fixed across all three)*
- [x] Phase 7 — sentence-case audit *(73 rewrites in perplexed; brand-name allowlist applied locally)*
- [x] Phase 8 — floating-promise wrapping
- [x] Phase 9 — `throw new Error(...)`
- [x] Phase 10 — `fetch` → `requestUrl` *(refactored to `activeWindow.fetch` per the `no-restricted-globals` rule, which is the portal's actual ask; streaming preserved)*
- [x] Push, wait ≤ 6h, confirm bot re-scan is clean
- [x] Distill into `content-farm/context-v/reminders/Obsidian-Marketplace-Compliance.md`

## Appendix A — The post-PR-queue findings (community.obsidian.md, 2026-05-17 → 2026-05-18)

Everything above this section was true for the eslint-plugin-based bot review at the PR-queue stage. The hosted portal at community.obsidian.md runs an **additional** automated scan with rules that don't appear in `obsidianmd/eslint-plugin` — and that scan is what gates marketplace acceptance now. Six categories of finding showed up across the cite-wide / image-gin / perplexed submissions that this issue didn't anticipate:

### A1. The PR queue is gone — the workflow itself is different

The old `obsidianmd/obsidian-releases` PR-based workflow was retired sometime between 2026-05-09 (when this issue was authored) and 2026-05-17 (when we tried to look at PR #12513 and got a 404). The new submission path:

1. Sign in at **community.obsidian.md** with your Obsidian account
2. Link your GitHub account in profile settings (this is how the portal verifies repo ownership)
3. Sidebar → **Plugins** → **New plugin** → paste the GitHub repo URL
4. Agree to the developer policies, submit

The portal then reads `manifest.json` at the HEAD of the default branch (for the directory listing) and the binary release assets at the GitHub release whose tag exactly matches `manifest.json`'s `version` field (for what users actually download on install). Automated review runs immediately; findings surface inline on the plugin's portal page as a "scorecard."

### A2. Plugin description lives in THREE places, not one

The single hardest lesson from the May 17-18 round. We fixed `manifest.json`'s `description` per the bot's recommendation, shipped a new release, and the portal *kept reporting the same warning*. After three iterations chasing the wrong surface:

The portal reads from its own cached pre-rendered card for the plugin, which inherits its description from **the GitHub repo "About" field** — a piece of metadata set via GitHub's repo-settings UI sidebar, or via `gh repo edit <owner>/<repo> --description "..."`. It is NOT a file in the repo. Fixing only `manifest.json` is necessary but not sufficient; the corresponding text in the GitHub repo About field must also be updated.

**For new submissions, fix all three at once:**
1. `manifest.json` `description` field
2. `package.json` `description` field (for tooling consistency)
3. The GitHub repo "About" field: `gh repo edit lossless-group/<plugin> --description "..."`

Then verify with `gh api /repos/lossless-group/<plugin> --jq '.description'` and a fresh download of the release asset's manifest.

Memory anchor: `feedback_plugin_description_three_places.md` in `~/.claude/projects/<this-project>/memory/`.

### A3. Release-tag rules (not in the eslint-plugin scope)

| Rule | What we hit | Fix |
|---|---|---|
| **No `v` prefix on the release tag** | Initial cite-wide release was cut as `v0.2.0` → portal rejected with *"Make sure your GitHub release doesn't use a 'v' in front of the version number, it should be '1.0.0' not 'v1.0.0'"* | Cut tags as plain `0.2.0` |
| **Strict three-digit semver across all four version fields** | Cite-wide's `versions.json` carried `"0.0.0.1"` from the Lossless internal 4-digit convention → invalid for Obsidian's parser | All of `manifest.json`, `package.json`, `versions.json` keys, and the git tag must be `MAJOR.MINOR.PATCH` only |
| **`LICENSE` at repo root is required** | Cite-wide's `package.json` claimed MIT but no `LICENSE` file existed | Add MIT (or other) LICENSE file before submission |
| **Realistic `minAppVersion`** | Cite-wide had `0.15.0` from a starter-template default; the plugin actually uses APIs that postdate 0.15.0 by years | Set to the actual API floor — `1.8.10` matches the rest of the Lossless family |

### A4. Release-bundle: exactly three files

The 0.2.0 and 0.2.1 cite-wide releases attached four assets (`main.js` + `manifest.json` + `styles.css` + `LICENSE`). Portal scorecard:

> *Recommendation: The release contains additional files: `LICENSE`. Only `main.js`, `manifest.json`, and `styles.css` are supported. All other files will not be downloaded by Obsidian.*

Cite-wide 0.2.2 ships exactly the three core assets. The `LICENSE` lives at the repo root (per A3) for anyone cloning the source.

### A5. The "can't re-scan in place" rule

The single most expensive procedural lesson. After fixing the manifest-description finding on cite-wide, the instinct was to re-upload the corrected `manifest.json` to the existing 0.2.0 GitHub release via `gh release upload 0.2.0 manifest.json --clobber` — same release, fresh asset. The portal scorecard kept reporting the OLD findings against 0.2.0.

The portal's automated review **cannot differentiate an updated manifest asset on the same tag from a totally new release.** Bot scans are pinned to a `(tag, commit)` pair; re-uploading an asset doesn't re-trigger them.

**For a re-scan you need a new tag.** Bump to the next patch version, cut a new release with fresh assets, push. The portal will run the scan against the new tag. Cite-wide went 0.2.0 → 0.2.1 → 0.2.2 over two days for exactly this reason.

### A6. `fundingUrl` must be an actual tip-jar destination

Cite-wide's original `manifest.json` had `fundingUrl: "https://lossless.group"` — the group homepage, no way to send money. The portal scorecard called this out (in our case during human review, not the bot's "Risks" panel — but it shows up in the user-facing plugin page). Replace with a real funding destination:

- Buy Me a Coffee: `https://buymeacoffee.com/<account>`
- GitHub Sponsors: `https://github.com/sponsors/<account>`
- Open Collective, Ko-fi, etc.

For Lossless plugins the standard is `https://buymeacoffee.com/losslessgroup`.

### A7. `builtin-modules` npm dep is flagged

A finding NOT in the eslint-plugin scope — surfaced by the portal's wider package-quality scan. The `builtin-modules` package (commonly used in `esbuild.config.mjs` to externalize Node built-ins) is flagged with a link to the es-tooling/module-replacements project. Modern alternative is dependency-free:

```js
// before:
import builtins from 'builtin-modules';

// after:
import { builtinModules as builtins } from 'node:module';
```

Available since Node 14. Remove `builtin-modules` from `devDependencies` after the swap.

### A8. GitHub artifact attestations (recommendation, not blocker)

The portal scorecard flags this as a *Recommendation* tier finding (not Risk, not Warning):

> *The `main.js` release asset does not have a GitHub artifact attestation. Artifact attestations let users cryptographically verify the provenance of the release assets…*

Implementation requires a `.github/workflows/release.yml` that uses `actions/attest-build-provenance@v1` after the build step, before uploading the assets. Doesn't block approval; worth setting up once across the family since the workflow is reusable. **Deferred from all three plugins' 2026-05-17/18 releases; tracked as future work.**

### A9. The wide-modal pattern (quality, not bot-flagged but called out by reviewers)

Not strictly a bot finding, but the portal's human reviewers (and our own UX standards) want modals that use Obsidian's canonical full-width pattern. The two-line discovery:

```ts
// In Modal.onOpen():
this.modalEl.addClass('my-modal');   // ← attach to the OUTER element
// not:
// this.contentEl.addClass('my-modal');   // ← inner content area only — width rules won't apply
```

Full details + the matching CSS lives at [`../../plugin-modules/perplexed/context-v/issues/Widen-Modals-in-Obsidian-using-CSS.md`](../../plugin-modules/perplexed/context-v/issues/Widen-Modals-in-Obsidian-using-CSS.md).

### A10. The Dependabot story — separate but related

Pushing the marketplace-prep commits to each plugin's master surfaced ~30 Dependabot alerts per plugin (86 across the three). The bulk-dismiss playbook with three buckets (removed / already-fixed / dev-tool-transitive) is at [`Dependabot-Alerts-Triage-Playbook-For-Lossless-Repos.md`](Dependabot-Alerts-Triage-Playbook-For-Lossless-Repos.md). Not strictly a marketplace requirement, but the alerts can spook a portal reviewer if the security tab shows a wall of unaddressed findings.

### A11. Release narratives are MARKETING artifacts, not internal documentation

A behavioral lesson that surfaced when we shipped multiple release narratives in a "internal punch-list" voice that the user immediately flagged. Distilled into the changelog-conventions skill (`SKILL.md` section *"These are marketing artifacts, not internal documentation"*) as the four-audience cascade: general → nerds passing by → nerds paying close attention → internal team, sequenced top-to-bottom in the document. Apply to every `README.md`, every `changelog/<date>.md` entry, and every `changelog/releases/<version>.md` for plugins being submitted.

## Appendix B — Forward-looking checklist for the next plugin submission

Use the comprehensive checklist at [`../reminders/Obsidian-Marketplace-Compliance.md`](../reminders/Obsidian-Marketplace-Compliance.md). This Appendix B is just a pointer; the live checklist is canonical.
