---
title: Plan — Bring Image Gin up to Obsidian Community-Plugin Publishing Standards
status: Proposed
created: 2026-05-03
applies_to: image-gin Obsidian plugin
authors:
  - Michael Staton
augmented_with: Claude Code (Opus 4.7, 1M context)
related_reference: ../../../cite-wide/context-v/reminders/Obsidian-Type-Safety.md
sibling_plan: ../../../perplexed/context-v/plans/20206-05-02_Assuring-Obsidian-Community-Plugin-Requirements.md
site_uuid: c1549e6a-15c2-4b21-b2c2-1efef62dc763
hex_code: 5zgt7b
date_created: 2026-05-03
lede: 17 explicit-any sites, 2 innerHTML calls, and a hand-rolled YAML parser — tighten ESLint to error first so pnpm build surfaces the rest.
summary: Publishing-prep plan for image-gin, phased so ESLint is tightened to match the review bot before anything else and the resulting build failures drive the remaining work. Records what was already compliant (manifest/version sync, LICENSE, strict tsconfig, dependency purge) so those phases can be skipped. Sibling to perplexed's plan of the same shape; partly superseded by the 2026-05-10 final cleanup round.
from: image-gin
from_path: plans/2026-05-03_Assuring-Obsidian-Community-Plugin-Requirements.md
---
<!-- Rolled up from image-gin/context-v/plans/2026-05-03_Assuring-Obsidian-Community-Plugin-Requirements.md. Edit at the source, not here. Re-run `pnpm rollup:sync` to refresh. -->

# Plan — Bring Image Gin up to Obsidian Community-Plugin Publishing Standards

## Context

Image Gin (`/Users/mpstaton/code/lossless-monorepo/image-gin`) is being prepped for submission to the Obsidian community plugin marketplace. The same `ObsidianReviewBot` that auto-rejects every submission for `any` usage will run against this PR. The cite-wide rejection (last week) and the parallel perplexed publishing plan are the precedents.

The reference doc — `/Users/mpstaton/code/lossless-monorepo/cite-wide/context-v/reminders/Obsidian-Type-Safety.md` — captures the rules verbatim from the review bot and the patterns to satisfy them. **This plan applies those rules to image-gin** and bundles in image-gin-specific repo-hygiene fixes that came out of the audit.

**Audit totals (run 2026-05-03):**

- **17 explicit-`any` sites + 3 `as any` casts** across 7 files
- **2 `innerHTML` usages** in `src/settings/settings.ts` (cache stats render — flagged by Obsidian guidelines)
- **1 hand-rolled YAML frontmatter parser** in `src/utils/yamlFrontmatter.ts` — same anti-pattern called out in the cite-wide reference doc §3.4
- **76 `console.*` calls** (mostly in `recraftImageService.ts` — soft, not blocking)
- **ESLint config exists** (`.eslintrc`) but has `no-explicit-any: "warn"` and is **not wired into `pnpm build`**

**What's already correct (skip from sibling-plan template):**

- Manifest, package.json, versions.json all at `0.0.9` — valid semver, in sync, no four-part version mess to fix
- `LICENSE` file present at repo root (The Unlicense)
- `tsconfig.json` already exceeds the Obsidian baseline (strict mode + every individual strict flag including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`)
- Unused runtime dependencies (`fastify`, `@modelcontextprotocol/sdk`, `zod`) **already removed** during the maintenance pass earlier this session — `package.json` currently has zero runtime `dependencies`
- No `(window as any)` patterns, no `[object Object]` template-string bugs, no obvious floating-promise patterns

The work below is the delta from "already-clean baseline" to "submittable."

---

## Phase 1 — Tighten ESLint to Match the Review Bot

**Why first:** if the local lint config matches the bot, every remaining issue surfaces during `pnpm build` instead of during submission. Today's config (`.eslintrc:29`) has `no-explicit-any: "warn"` which lets violations through, and ESLint isn't even invoked by the build script.

### 1.1 Update `.eslintrc` rules

Change in `/Users/mpstaton/code/lossless-monorepo/image-gin/.eslintrc`:

- `"@typescript-eslint/no-explicit-any": "warn"` → `"error"`
- Add `"@typescript-eslint/no-unnecessary-type-assertion": "error"`
- Add `"@typescript-eslint/no-floating-promises": "error"`
- Add `"@typescript-eslint/no-base-to-string": "error"`
- Keep existing `"@typescript-eslint/no-unused-vars": ["error", { "args": "none" }]`

### 1.2 Wire ESLint into the build

In `package.json`, change:

```jsonc
"build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
```

to:

```jsonc
"build": "eslint . --report-unused-disable-directives && tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
```

Also add a standalone lint script for fast iteration:

```jsonc
"lint": "eslint . --report-unused-disable-directives"
```

After this change, `pnpm build` will fail loudly on any of the 17 `any` sites. **That failure surface drives the rest of the plan.** Do not move past Phase 1 until you've seen the failures and have them in front of you while doing Phase 4.

---

## Phase 2 — Version Bump (decision point)

**Status:** all three files are already in sync at `0.0.9`. This phase is a *deliberate choice*, not a publishing blocker.

The previous session's `2026-05-02_02.md` changelog title references "v0.1.0, May 2026" — implying intent to ship a 0.1.0 to mark the Magnific rebrand + modal widening + dependency purge.

**Recommend:** bump to `0.1.0` (minor — material new functionality and breaking-shaped settings rename) when this publishing-prep PR is ready to ship, *not at the start of this plan*. Bumping mid-flight risks publishing a broken intermediate state.

When bumping:
- `manifest.json` → `"version": "0.1.0"`
- `package.json` → `"version": "0.1.0"`
- `versions.json` → add `"0.1.0": "1.8.10"` (keep the existing `"0.0.9"` entry)

The existing `pnpm version` script (`node version-bump.mjs && git add manifest.json versions.json`) does most of this — verify it produces the right output before running.

---

## Phase 3 — LICENSE (already done)

`LICENSE` exists at repo root. README declares **The Unlicense**, which matches the file. **No action.**

(Note for the future: if a contributor objects to The Unlicense and wants MIT, that's a project decision separate from this plan.)

---

## Phase 4 — Eliminate `any` (the type-safety pass)

**Why:** this is the rule that rejected cite-wide. 17 sites + 3 casts must go.

Order chosen so each step compiles cleanly before the next.

### 4.1 Fix the ambient shim — `src/types/obsidian.d.ts:5`

Same shape as the cite-wide / perplexed shim. Today:

```ts
declare module 'obsidian' {
  interface App {
    commands: any;
  }
  // ... other augmentations OK
}
```

`commands: any` → either a minimal documented interface listing only the methods we actually call, or `unknown` if usage is one-off.

**Audit finding:** searched the codebase — `app.commands` is **not currently called anywhere in image-gin**. The augmentation is dead code inherited from a template. **Recommend: delete the entire `commands` augmentation.** Less surface area to defend.

If a reason to add it back surfaces later, do it as a typed interface, not `any`.

### 4.2 Fix the logger — `src/utils/logger.ts`

Six sites, all the same drop-in pattern. Replace every `details?: any` and `details: any` with `details?: unknown`:

- Line 8: `details?: any;` (in `LogEntry` interface)
- Line 81: `addEntry(level: LogEntry['level'], message: string, details?: any): void`
- Lines 109, 113, 117, 121: `error / warn / info / debug(message: string, details?: any): void`

The logger only stringifies `details` and does an `instanceof Error` narrowing — no structural access. `unknown` is a true drop-in. The `instanceof Error` check on line 86 already narrows correctly against `unknown`.

### 4.3 Fix the YAML frontmatter parser — `src/utils/yamlFrontmatter.ts`

**This is the biggest decision in the plan.** Two `any` sites here (lines 20 and 118), but the deeper problem is the file exists at all.

The cite-wide reference doc §3.4 explicitly calls this anti-pattern out: hand-rolled YAML parsers are both a type-safety problem and a correctness problem. They mishandle multi-line strings, anchors, escaped characters, URL values with colons, etc.

**Two options:**

**(A) Quick fix — type the existing parser, ship the rest of the publishing prep.**
- Line 20: `let arrayValues: any[] = []` → `let arrayValues: unknown[] = []` (the parser stuffs strings/numbers/bools into this array; `unknown` is honest about the variability)
- Line 118: `formatTagsProperty(value: any)` → `formatTagsProperty(value: unknown)` and narrow with `Array.isArray` / `typeof`
- Add `coerce.ts` helpers (see below) for callers who currently consume `Record<string, any>` from this parser

**(B) Right fix — replace with Obsidian's frontmatter API.**
- Read: `this.app.metadataCache.getFileCache(file)?.frontmatter` (typed as `FrontMatterCache | undefined`, treat as `Record<string, unknown>`)
- Read+Write atomic: `this.app.fileManager.processFrontMatter(file, fm => { ... mutate ... })` — Obsidian handles parse, mutation, re-serialization, including correct multi-line and special-char handling
- Delete `src/utils/yamlFrontmatter.ts` entirely
- Update call sites in `src/modals/CurrentFileModal.ts` (~ line 47, `extractFrontmatter` call) and `src/modals/ConvertLocalImagesForCurrentFile.ts` (~ line 71)

**Recommendation: (B) for the publishing PR.** Cite-wide already paid the cost of this refactor. Once you ship a hand-rolled parser to the marketplace, you own the bug surface forever (URL values, multi-line strings, list-of-maps, etc.). Doing it now while the file count is small is much cheaper than doing it under bug pressure later.

If (B) feels too large for this PR, do (A) and open a follow-up issue. **Do not** ship (A) and forget — the follow-up is mandatory.

### 4.4 Add `src/utils/coerce.ts`

Same helper file the cite-wide and perplexed plans both call for. Copy verbatim from the reference doc §3.3:

```ts
export function asString(v: unknown): string | undefined { ... }
export function asNumber(v: unknown): number | undefined { ... }
export function asStringArray(v: unknown): string[] { ... }
export function asDate(v: unknown): string | undefined { ... }
export function isRecord(v: unknown): v is Record<string, unknown> { ... }
```

These will be reused in 4.5 (services), 4.6 (modals), and after option (B) in 4.3 to narrow Obsidian's `Record<string, unknown>` frontmatter into typed shapes.

### 4.5 Fix the service layer — `src/services/recraftImageService.ts`, `src/services/imagekitService.ts`

**`recraftImageService.ts`** — three sites:
- Line 25: `styleParams: any` → define `interface RecraftStyleParams` from what `getStyleParams()` in `CurrentFileModal` actually returns (style object with `style: BaseStyle` and optional `substyle: string`); could also be `Record<string, unknown>` if the shape varies more than expected
- Line 124: `let data: any` (the parsed Recraft API response) → define `interface RecraftGenerationResponse` from the fields actually accessed (`data.created`, `data.data[0].url`, etc. — read lines 100–170 to enumerate). Use `unknown` for fields the code doesn't dereference.
- Line 207: `return null as any` — this is the worst one in the file. The function is typed to return `TFile`, but in the `filePath.startsWith('/')` branch (saving to absolute path outside the vault), there's no real `TFile` to return. **Real fix:** change the return type to `TFile | null` and narrow at every call site. Cast → contagion is what this codebase has now; explicit nullability is what it should have.

**`imagekitService.ts`** — one site:
- Line 146: `extractTagsFromFrontmatter(frontmatter: any): string[]` → `extractTagsFromFrontmatter(frontmatter: unknown): string[]` and narrow with `isRecord` from `coerce.ts`. The function reads `frontmatter.tags` and `frontmatter.keywords`; both narrow with `asStringArray`.

### 4.6 Fix the modals

**`src/modals/CurrentFileModal.ts`** — two sites:
- Line 301: `private getStyleParams(): any` → return `RecraftStyleParams` (the same interface defined in 4.5)
- Line 326: `const params: any = { ... }` → `const params: RecraftStyleParams = { ... }` (drops the local `any` once the return type is fixed)

**`src/modals/ConvertLocalImagesForCurrentFile.ts`** — two `(adapter as any).basePath` casts:
- Lines 442, 450: `(this.app.vault.adapter as any).basePath` → `this.app.vault.adapter instanceof FileSystemAdapter ? this.app.vault.adapter.getBasePath() : ''`
- Import: `import { FileSystemAdapter } from 'obsidian'`
- This is the cleanest fix per Obsidian's own type definitions — `FileSystemAdapter` (the desktop adapter) has a public `getBasePath()` method. The `basePath` property access was hitting a private field; the public API is `getBasePath()`. Mobile uses a different adapter without filesystem access — narrowing handles that gracefully.

**`src/modals/BatchDirectoryConvertLocalToRemote.ts`** — one site:
- Line 479: `private getErrorMessage(error: any): string` → `private getErrorMessage(error: unknown): string` and narrow with `error instanceof Error ? error.message : String(error)` (this is what the function body almost certainly already does — verify when implementing)

### 4.7 Verify no `any` remains

After 4.1–4.6, run `pnpm build`. The ESLint step from Phase 1 should fail with zero `any` errors. Sanity check from the command line:

```bash
git grep -nE ': any\b|as any\b|<any>|any\[\]' -- 'src/**/*.ts' 'main.ts' ':!node_modules'
```

Should return nothing.

---

## Phase 5 — Replace `innerHTML` in settings — `src/settings/settings.ts:657, 664`

**Why:** Obsidian's plugin guidelines discourage `innerHTML` because it's an XSS surface and bypasses the platform's DOM safety. Reviewers flag it. The two sites here render cache statistics — purely internal data, no user input flowing in, so it's not actually an exploit risk *today*, but the pattern itself is what gets caught.

Both call sites are inside `loadCacheStats()`. Replace with `createDiv` / `createEl`:

```ts
// Before (line ~657)
container.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Cache Statistics</div>
    <div>Files: ${stats.totalImages}</div>
    <div>Size: ${stats.cacheSize}</div>
`;

// After
container.empty();
const title = container.createDiv();
title.style.fontWeight = 'bold';
title.style.marginBottom = '5px';
title.setText('Cache Statistics');
container.createDiv({ text: `Files: ${stats.totalImages}` });
container.createDiv({ text: `Size: ${stats.cacheSize}` });
```

Same treatment for the error path on line 664.

(Cleaner still: extract those styles into `current-file-modal.css` with a class like `image-gin-cache-stats__title`. Optional polish; not required for submission.)

---

## Phase 6 — Console-Log Hygiene (recommended, not blocking)

**Why:** the audit found 76 `console.*` calls — most concentrated in `recraftImageService.ts` (which has detailed request/response logging) and in error paths across the modals. These are not a hard rejection criterion, but the published guidelines discourage shipping debug logging, and a 76-deep console output leaks API URLs / model names / file paths into the user's devtools when something goes wrong.

**Decision point — ask the user:**

(a) **Strip them** — delete the console.* calls outright. Lowest effort, also lowest debuggability if something breaks in the wild.

(b) **Gate behind a `DEBUG` setting** — add `debugLogging: boolean` to `ImageGinSettings` (default `false`); wrap every `console.log` with `if (this.plugin?.settings?.debugLogging) console.log(...)` or via a small helper. Users can flip it to capture logs when troubleshooting.

(c) **Route through `FileLogger`** — replace every `console.*` with `logger.info` / `logger.error`. The existing `src/utils/logger.ts` already writes to a JSON file in the vault. Cite-wide chose (c) per the perplexed plan. Best for support — users can attach the log file to bug reports.

**Recommend (c) for consistency with cite-wide and perplexed,** with the caveat that this is a separate follow-up PR after the type-safety / metadata fix lands. Keep the publishing-prep PR scoped.

---

## Verification

After implementing Phases 1–5, run from `/Users/mpstaton/code/lossless-monorepo/image-gin`:

1. **Lint clean:** `pnpm lint` — expect zero errors. Specifically zero `@typescript-eslint/no-explicit-any` errors.
2. **TypeScript clean:** `pnpm exec tsc -noEmit -skipLibCheck` — expect zero errors. Strict flags in `tsconfig.json` (already correct, do not weaken) catch any residual narrowing gaps.
3. **Build clean:** `pnpm build` — expect a clean `main.js` and `styles.css` produced.
4. **Manual smoke test in Obsidian** (use the existing symlink at `~/content-md/lossless/.obsidian/plugins/image-gin-plugin`):
   - Reload the plugin (toggle off/on in Community Plugins)
   - Run each of the four commands: Generate Images for Current File, Convert Local Images to Remote, Batch Convert Directory Images, Search Magnific Images
   - Confirm each modal renders at the widened sizes (this should already work from the previous session)
   - Confirm settings UI loads and the cache stats render correctly (Phase 5 regression check)
   - Trigger an error path (e.g. invalid Recraft API key) and confirm the logger captures it without a console-only output regression
5. **Resubmission readiness check:**
   - `manifest.json` version = `package.json` version = a `versions.json` key (target: `0.1.0` if Phase 2 ran)
   - `LICENSE` file present at repo root ✓ (already done)
   - `git grep -nE ': any\b|as any\b|<any>|any\[\]' -- 'src/**/*.ts' 'main.ts' ':!node_modules'` returns nothing
   - `git grep -n 'innerHTML' -- 'src/**/*.ts' 'main.ts'` returns nothing
6. **Submission checklist** (separate from this codebase, but worth flagging here):
   - Plugin id in `manifest.json` (`image-gin-plugin`) matches the GitHub repo name and the directory name in the user's vault
   - `manifest.json` `description` is current and accurate (currently mentions "Generative AI" — also should mention stock-image search now that Magnific is integrated)
   - README includes a link to the GitHub repo and clear install instructions (already present after the README cleanup pass)

---

## Critical Files Touched

- `.eslintrc` — Phase 1.1
- `package.json` — Phase 1.2 (build script + new lint script), Phase 2 (version bump if elected)
- `manifest.json` — Phase 2 (version bump if elected)
- `versions.json` — Phase 2 (version bump if elected)
- `src/types/obsidian.d.ts` — Phase 4.1 (delete `commands: any` augmentation)
- `src/utils/logger.ts` — Phase 4.2 (six `any` → `unknown`)
- `src/utils/yamlFrontmatter.ts` — Phase 4.3 (option A: type with `unknown`; option B: delete entirely after migrating callers)
- `src/utils/coerce.ts` — Phase 4.4 (new file)
- `src/services/recraftImageService.ts` — Phase 4.5 (three sites including the egregious `null as any` return)
- `src/services/imagekitService.ts` — Phase 4.5 (one site)
- `src/modals/CurrentFileModal.ts` — Phase 4.6 (two sites)
- `src/modals/ConvertLocalImagesForCurrentFile.ts` — Phase 4.6 (two `(adapter as any)` casts), possibly Phase 4.3 option B (frontmatter API switch)
- `src/modals/BatchDirectoryConvertLocalToRemote.ts` — Phase 4.6 (one site)
- `src/settings/settings.ts` — Phase 5 (two `innerHTML` calls)

`main.ts` is **not** in the type-safety touch list — the audit found zero `any` in it. Phase 6 (optional console hygiene) would touch the services and modals to route through `FileLogger`.

## Reused Utilities

- `coerce.ts` helpers (`asString`, `asNumber`, `asStringArray`, `asDate`, `isRecord`) — verbatim from reference doc §3.3
- Existing `FileLogger` singleton in `src/utils/logger.ts` — already present; needs `unknown` substitution and (in Phase 6) becomes the destination for migrated `console.*` calls
- Obsidian's typed `App`, `TFile`, `Vault`, `Modal`, `FileSystemAdapter` from `'obsidian'` — already imported; `FileSystemAdapter` is the new addition needed in Phase 4.6

## Comparison to Sibling Plans

| Concern | cite-wide | perplexed | image-gin |
|---|---|---|---|
| Four-part version | yes (`0.0.0.1`) | yes (`0.0.0.1`) | **no — already 0.0.9** |
| Missing LICENSE | yes | yes | **no — present** |
| Unused `dependencies` | yes (fastify/MCP/zod) | yes (same) | **no — already removed** |
| Hand-rolled YAML | yes | n/a (no frontmatter access) | **yes — same anti-pattern** |
| `(window as any)` | yes | n/a | **no** |
| `commands: any` shim | yes | yes | **yes (but unused — delete)** |
| Logger `any` pattern | yes | yes | **yes (same six sites)** |
| Service-layer `any` | yes | yes | **yes (Recraft + ImageKit)** |
| `innerHTML` in settings | n/a | n/a | **yes — image-gin-specific** |
| `(adapter as any).basePath` | n/a | n/a | **yes — image-gin-specific** |
| ESLint not gating build | yes | yes | **yes** |

Image-gin's publishing-prep is materially smaller than cite-wide's or perplexed's because the metadata/dependency cleanup already happened. The remaining work is concentrated in the type-safety pass + two image-gin-specific patterns (innerHTML, basePath cast).
