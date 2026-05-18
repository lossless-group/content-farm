---
title: Plan — Final ObsidianReviewBot cleanup round for image-gin v0.2.x
status: Proposed
created: 2026-05-10
applies_to: image-gin Obsidian plugin (PR obsidianmd/obsidian-releases#12524)
authors:
  - Michael Staton
augmented_with: Claude Code (Opus 4.7, 1M context)
related:
  - 2026-05-03_Assuring-Obsidian-Community-Plugin-Requirements.md
  - ../../../../context-v/issues/Obsidian-Review-Bot-Feedback-on-Perplexed-Submission.md
pr: https://github.com/obsidianmd/obsidian-releases/pull/12524
last_bot_scan_commit: cfbceba2992a2da62ba87eb6346e3e44cbfd945d
from: image-gin
from_path: plans/2026-05-10_Final-ObsidianReviewBot-Cleanup-Round.md
---
<!-- Rolled up from image-gin/context-v/plans/2026-05-10_Final-ObsidianReviewBot-Cleanup-Round.md. Edit at the source, not here. Re-run `pnpm rollup:sync` to refresh. -->

# Plan — Final ObsidianReviewBot cleanup round for image-gin v0.2.x

## Where we are

After the cleanup round documented in `2026-05-03_Assuring-Obsidian-Community-Plugin-Requirements.md` and the four iterative bot scans on PR #12524, image-gin's `eslint.config.mjs` now runs `eslint-plugin-obsidianmd` cleanly: `pnpm exec eslint .` reports **0 errors, 3 warnings** (all three warnings are the optional `prefer-file-manager-trash-file` rule).

The most recent server-side bot scan (commit `cfbceba2`) still flags **49 "Required" findings** under one rule (`obsidianmd/ui/sentence-case`) and **3 "Required" findings** under async/no-await, plus **3 "Optional"** under `prefer-file-manager-trash-file`. The local clean run vs. the bot's flags is explained below.

## Local vs. bot discrepancy

Two divergences between our local lint and the bot's lint:

1. **Brand allowlist.** Our `eslint.config.mjs` configures `obsidianmd/ui/sentence-case` with a `brands:` allowlist (Recraft, Magnific, Freepik, Ideogram, ImageKit, Imgur, WebP, Anthropic, Claude, OpenAI, …). The bot runs the plugin with its **default** `DEFAULT_BRANDS` list, which does not include any of the image-generation/CDN product names this plugin integrates with. Locally these strings pass; on the server they trip.
2. **`require-await`.** `eslint-plugin-obsidianmd`'s recommended config explicitly sets `@typescript-eslint/require-await: "off"`, so we don't catch async-without-await locally. The bot enforces it anyway (likely via `tseslint.configs.recommendedTypeChecked` without the override). We need to fix these by hand.

## Required findings on `cfbceba2`

### 1. `async` without `await` — 3 sites

| File | Line | Symbol |
|------|------|--------|
| `src/destinations/VaultDestination.ts` | 97 | `private async uniqueFileName(...)` |
| `src/modals/BatchDirectoryConvertLocalToRemote.ts` | 47 | `async onOpen(): Promise<void>` |
| `src/modals/MagnificModal.ts` | 26 | `this.onSelect = async (image) => { … }` |

**Fix:** read each body; drop `async` if there is no awaitable work, otherwise add a real `await`. `Modal.onOpen()` is allowed to be sync — Obsidian's type allows either.

### 2. Sentence case — 49 sites

Mapping by file (line numbers from commit `cfbceba2`):

- `main.ts` — 103, 115, 153
- `src/modals/BatchDirectoryConvertLocalToRemote.ts` — 63, 67, 103
- `src/modals/ConvertLocalImagesForCurrentFile.ts` — 64, 65, 166, 176, 341
- `src/modals/IdeogramModal.ts` — 125
- `src/settings/settings.ts` — 458, 463, 475, 503, 514, 518, 519, 529, 530, 541, 542, 553, 554, 565, 566, 577, 578, 590, 600, 601, 614, 615, 628, 630, 640, 665, 668, 669, 681, 683, 707, 792, 915, 917, 951, 972, 989

Hand-audit verdict (after reading each cited line in source):

- **~46 are brand-name false positives** — strings like `"Search Magnific images"`, `"Generate images (Ideogram)"`, `"Convert to WebP"`, `"Enable ImageKit CDN"`, `"Enable Imgur destination"`, `"☁️ ImageKit CDN upload & hosting"`. These read correctly in sentence case once Magnific/Ideogram/ImageKit/Imgur/WebP/Recraft are recognized as proper nouns, which they are not in the bot's default list.
- **A handful are real violations** — most clearly `settings.ts:915` `"Drag-Drop / paste confirmation gate"` (the second "Drop" should be lowercase) and any cases where we wrote `"X: Reset …"` after a colon. Final list pending the audit pass in §Implementation.

**Strategy:** rewrite the genuine violations; for the brand-name set, reply on the PR with a single `/skip` comment justifying each product name. The bot's documented escape hatch is `/skip <reason>`; an Obsidian human reviewer adjudicates. The justification is unambiguous: these are vendor product names with canonical casing that match the brands the rule was designed to preserve (Obsidian itself, OpenAI, Anthropic, Claude) — the rule is simply missing our specific vendors.

### 3. Optional — `Vault.delete()` → `FileManager.trashFile()` — 3 sites

- `src/modals/BatchDirectoryConvertLocalToRemote.ts:449`
- `src/services/imageCacheService.ts:156`
- `src/services/imageCacheService.ts:164`

This is a strict improvement (respects the user's deletion preference) and trivial to apply. Doing it now means the next scan is fully clean, optional warnings included.

## What is a `/skip` comment?

Per the bot's footer on every review:

> If you think some of the required changes are incorrect, please comment with `/skip` and the reason why you think the results are incorrect.

It's the bot's escape hatch. You comment on the PR with `/skip` followed by your justification; the bot marks the matching findings as skipped and a human reviewer reads the reason. The pattern is documented in the obsidianmd/obsidian-releases workflow. We use it for the brand-name false positives **after** all the real fixes have been pushed, so the surface area the reviewer has to evaluate is just "yes, Magnific/Ideogram/ImageKit/Imgur/Recraft/WebP/Freepik are product names."

Draft text to post on PR #12524 once the next scan completes:

> `/skip` All remaining `obsidianmd/ui/sentence-case` findings are vendor product names (`Recraft`, `Magnific`, `Freepik`, `Ideogram`, `ImageKit`, `Imgur`, `WebP`) that this plugin integrates with. Our local `eslint.config.mjs` extends the rule's `brands:` allowlist with these names and `pnpm exec eslint .` passes clean. The strings read correctly in sentence case once those tokens are recognized as proper nouns — the same way `Obsidian`, `OpenAI`, and `Anthropic` are preserved by the default list.

## Implementation — three distinct commits, then one push

We're staging three small, semantically-clean commits and pushing them together so the bot does a single re-scan on the bundled attempt at compliance.

### Commit 1 — `fix(lint): drop async on methods with no await expression`

Touches the three sites from §1. Each body is audited; we either drop `async` or add a real awaitable depending on what the call sites already do.

### Commit 2 — `fix(lint): switch Vault.delete() to FileManager.trashFile()`

Touches the three sites from §3. Uses `this.app.fileManager.trashFile(file)` (which returns `Promise<void>`), so each call site stays `await`-shaped.

### Commit 3 — `fix(lint): sentence-case audit on user-facing strings`

Hand-audited from the 49 cited lines:
- Rewrite genuine violations (e.g. `"Drag-Drop / paste …"` → `"Drag-drop / paste …"`, any after-colon uppercases that aren't proper nouns).
- Leave brand-name strings as-is; they'll be addressed via `/skip`.

### Push

After all three commits land on the `image-gin` `main` branch:

```
cd plugin-modules/image-gin
git push origin main
```

Then update the parent-monorepo submodule pointer:

```
cd ../..
git add plugin-modules/image-gin
git commit -m "chore(submodules): bump image-gin to vX.Y.Z (marketplace compliance fixes)"
```

Wait ≤ 6 h for the bot's next scan. If only the brand-name `ui/sentence-case` findings remain, post the `/skip` comment from above.

## Out of scope

- Further refactor of `src/utils/logger.ts` or `src/settings/settings.ts` — they pass locally and the bot is clean on them aside from the brand-name strings.
- The earlier `prefer-file-manager-trash-file` argument that we should *keep* `Vault.delete()` for cache files (cache deletions are recoverable from disk; trashFile pollutes the user's trash). On reflection, respecting the user's deletion preference setting is the right call — the trash-vs-OS-trash decision is the user's, not ours.

## Status checklist

- [ ] Commit 1 — drop `async` on the 3 cited methods/arrows
- [ ] Commit 2 — `Vault.delete()` → `FileManager.trashFile()` in 3 sites
- [ ] Commit 3 — sentence-case audit; rewrite genuine violations
- [ ] Push image-gin `main`; bump submodule pointer from content-farm
- [ ] Wait for bot re-scan (≤ 6 h)
- [ ] If brand-name `ui/sentence-case` is the only remaining category, post the `/skip` comment above
- [ ] On approval, prep `Obsidian-Marketplace-Compliance.md` reminder distilling lessons from this round
