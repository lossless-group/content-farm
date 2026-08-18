---
title: "Obsidian Marketplace Compliance — Rules the Review Bot Enforces"
purpose: "Source-of-truth for the patterns that get a Lossless plugin past Obsidian's automated marketplace review. Read before opening any submission, and ideally before writing the code that will be submitted. Companion to cite-wide's `Obsidian-Type-Safety.md` (which covers the `any`-rule). Originally distilled from the eslint-bot's feedback on perplexed PR #12513 (May 9); expanded with portal-era findings from the cite-wide / image-gin / perplexed submission rounds (May 17-18)."
status: Authoritative
date_created: 2026-05-09
date_modified: 2026-05-18
last_verified: 2026-05-18
applies_to: every Lossless Obsidian plugin (cite-wide, image-gin, perplexed, future)
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
semantic_version: 0.0.0.1
tags:
  - Reminder
  - Obsidian-Plugin-Submission
  - ObsidianReviewBot
  - Marketplace-Compliance
related_files:
  - context-v/issues/Obsidian-Review-Bot-Feedback-on-Perplexed-Submission.md
  - context-v/reminders/Obsidian-Type-Safety.md
site_uuid: 7dd87ecf-2524-41f2-a377-9191b652ab64
hex_code: hc15tu
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
---

## Why This Document Exists

`ObsidianReviewBot` runs an automated linter on every community-marketplace submission PR. The linter is open-sourced as [`obsidianmd/eslint-plugin`](https://github.com/obsidianmd/eslint-plugin) and we *should* be running it locally so violations surface in `pnpm build`, not in the review thread. Until then, this doc captures the rules verbatim and the canonical fix for each.

The rules are **unambiguous**, **machine-checked**, and **non-negotiable**. There is one narrow exception (the `fetch` rule for streaming responses) that may warrant a `/skip` reply on the PR; everything else must just be fixed.

For the `any`-rule and broader type-safety obligations, read **`context-v/reminders/Obsidian-Type-Safety.md`** first — that's the load-bearing companion. This doc covers everything *else* the bot enforces.

## How the Review Loop Works

**The PR-based queue at `obsidianmd/obsidian-releases` was retired in mid-May 2026.** Submissions now go through the hosted portal at **community.obsidian.md**:

1. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account.
2. Link your GitHub account in profile settings (verifies repo ownership).
3. Sidebar → **Plugins** → **New plugin** → paste the GitHub repo URL.
4. Submit. The portal pulls `manifest.json` from the HEAD of your default branch for the directory listing, and the binary release assets from the GitHub release whose tag matches `manifest.json`'s `version`.
5. Automated scorecard appears on the plugin's portal page within minutes. Failed scans don't reject the submission — they keep it from being listed until issues clear.
6. **To trigger a re-scan, cut a new release tag.** Re-uploading `manifest.json` to an existing release via `gh release upload --clobber` does NOT re-trigger the scan; the portal pins scans to `(tag, commit)` pairs. See §Portal rules below for the procedure.

The scorecard surfaces two classes of finding:

- **The eslint-bot rules** (`obsidianmd/eslint-plugin`) — captured in §The Rules below. These are the rules this document was originally written to catalogue. Adopt the lint plugin locally so violations surface in `pnpm build`.
- **The portal's broader scans** — package-quality, release-asset structure, repo-level metadata. These are NOT in the eslint-plugin scope and need separate verification before submission. See §Portal rules below.

## Portal rules — beyond the eslint-bot

Findings that surface from the portal's wider scan, not from `obsidianmd/eslint-plugin`. These were the dominant source of round-trip work across the May 17-18 cite-wide / image-gin / perplexed submissions. Reviewer cost: ~zero if you walk the checklist before submitting; ~6 release-cuts if you don't.

### Plugin description lives in THREE places, all must comply

ObsidianReviewBot's two description rules are:

- **Error**: must not include the word "Obsidian"
- **Warning**: must not refer to itself ("A plugin that...", "This plugin...")

The wording fix is easy. The trap is **where** the description lives — fixing only `manifest.json` is necessary but not sufficient:

1. `manifest.json` `description` — what `gh release create` packages and what the portal-directory listing reads off HEAD of the default branch.
2. `package.json` `description` — for tooling consistency.
3. **GitHub repo "About" field** — set via `gh repo edit lossless-group/<plugin> --description "..."`. This is GitHub-side metadata, NOT a file in the repo. The portal's automated scanner reads from its cached pre-rendered card, which inherits its description from this field. If you fix only manifest.json, the portal keeps reporting the same warning indefinitely.

Verify after change:
```bash
# Live manifest as users will download it on install:
gh release download <tag> -p manifest.json -O /tmp/m.json --clobber --repo lossless-group/<plugin>
grep description /tmp/m.json

# Live GitHub About field:
gh api /repos/lossless-group/<plugin> --jq '.description'
```

Approved Lossless-style description shape — active voice, names concrete capabilities, no Obsidian, no self-reference:

> *"Convert numeric footnotes into stable hex identifiers, dedupe citations by URL, and parse LLM-pasted research into a canonical reference format."*

### Version fields — strict three-digit semver across all four

The Lossless internal 4-digit convention (`0.0.0.1`) silently breaks the portal's semver parser. Use plain `MAJOR.MINOR.PATCH` only, aligned across:

| File / surface | Constraint |
|---|---|
| `manifest.json` `version` | `MAJOR.MINOR.PATCH` only |
| `package.json` `version` | Must match `manifest.json` exactly |
| `versions.json` keys | All entries are 3-segment semver; current version present with the correct `minAppVersion` |
| Git release tag | Plain `0.2.0` — **no `v` prefix.** Portal explicitly rejects `v0.2.0`-style tags with the message *"Make sure your GitHub release doesn't use a 'v' in front of the version number"* |

### LICENSE at repo root is required

Even if `package.json` declares `"license": "MIT"`, the portal expects an actual `LICENSE` file at the repo root. Standard MIT template, copyright "The Lossless Group" (or per-project), current year.

### `fundingUrl` must be an actual tip-jar

The field is meant to be a destination where someone can actually send money. **Never the group homepage** — `https://lossless.group` has no donate path. Lossless default: `https://buymeacoffee.com/losslessgroup`. Other valid: GitHub Sponsors, Ko-fi, Open Collective.

### `minAppVersion` should reflect the actual API floor

A stale `0.15.0` from the starter-template default reads as suspicious to reviewers and is technically dishonest if your code uses APIs that didn't exist until 1.x. Standard across the Lossless family: `1.8.10`. Check what APIs you actually use against the Obsidian release notes.

### Release-asset bundle must be EXACTLY three files

`main.js` + `manifest.json` + `styles.css`. Attaching `LICENSE`, `README.md`, `pnpm-lock.yaml`, or any other file triggers the portal's *"Release contains additional files… Only `main.js`, `manifest.json`, and `styles.css` are supported"* recommendation. LICENSE lives at the repo root (per above), not in the release attachments.

### Re-scan procedure — new tag, not asset overwrite

The single most expensive procedural lesson. If the scorecard flags an issue and you fix the manifest, **do not** re-upload to the existing release via `gh release upload --clobber` expecting the portal to re-evaluate. The scan is pinned to `(tag, commit)`; asset updates on the existing tag are invisible to the scanner.

**Re-scan procedure:**

1. Apply the fix in source files
2. Bump `manifest.json` / `package.json` / `versions.json` to the next patch version
3. Commit, tag (no `v` prefix), push the tag
4. `gh release create <new-tag> main.js manifest.json styles.css --title "..." --notes "..."`

Plan for at least one or two rounds.

### `builtin-modules` npm dep is flagged

If `esbuild.config.mjs` imports `builtin-modules` to externalize Node built-ins, swap to the dep-free Node 14+ alternative:

```js
// before:
import builtins from 'builtin-modules';

// after:
import { builtinModules as builtins } from 'node:module';
```

Remove `builtin-modules` from `devDependencies` after the swap.

### Wide-modal pattern (quality, expected by reviewers)

Not a bot finding but a quality expectation. Modals should use the canonical `modalEl.addClass(...)` pattern, not `contentEl.addClass(...)`:

```ts
// In Modal.onOpen():
this.modalEl.addClass('my-modal');   // ← OUTER element; width rules apply

// CSS:
// .my-modal { width: 90vw; max-width: 1100px; max-height: 88vh; }
```

Full guide: `plugin-modules/perplexed/context-v/issues/Widen-Modals-in-Obsidian-using-CSS.md`.

### Release narratives + README are MARKETING artifacts

This is doctrine, not a bot rule, but it's how portal reviewers form first impressions. **Every README, every `changelog/<date>.md`, every `changelog/releases/<version>.md`** is sequenced for four audiences top-to-bottom:

1. **General audience** — *"why should I care?"* (lede + Why Care?)
2. **Nerds passing by** — *"what's actually new?"* (What's New?)
3. **Nerds paying close attention** — *"how does it work?"* (deep-dive sections)
4. **Internal team** — *"what changed in the codebase?"* (file trees, SHAs, follow-ups)

Long files get an anchor-link TOC at the top. Canonical: `context-v/skills/changelog-conventions/SKILL.md` section *"These are marketing artifacts, not internal documentation"*.

### Optional / future-work findings (Recommendation tier, not blockers)

- **GitHub artifact attestations.** Requires `.github/workflows/release.yml` calling `actions/attest-build-provenance@v1`. Cryptographically verifies that the shipped `main.js` was built from source. Worth setting up as one batch across the family.
- **Pinning `@codemirror/{state,view}` peer-dep versions** to match `obsidian@1.12.3`'s declared peers. `pnpm install` surfaces warnings; build still passes. Resolution lives in `pnpm.overrides`.
- **CONTRIBUTING.md** — portal hygiene check flags missing file. Add when there's a real contributor flow to document.

## Adopt the Local Lint Plugin First

```bash
pnpm add -D @obsidianmd/eslint-plugin
```

In `eslint.config.mjs`, extend the plugin's recommended config alongside whatever's already there. Wire `eslint .` into your `pnpm build` so violations fail the build locally, not the bot.

This is the **first move** before fixing anything else — without it you round-trip through the bot and waste 6-hour cycles.

## The Rules

### 1. `console.log` is not allowed — only `warn`, `error`, `debug`

> *"Unexpected console statement. Only these console methods are allowed: `warn`, `error`, `debug`."*

| Allowed | Not allowed |
|---------|------------|
| `console.warn` | `console.log` |
| `console.error` | `console.info` |
| `console.debug` | `console.trace` |

**Triage strategy when retrofitting:**

- Diagnostic noise that should never ship in production → **delete**
- Diagnostic info that *should* survive (network round-trip, background work) → **`console.debug`**
- Genuine warnings (deprecated path, recoverable error) → **`console.warn`**
- Caught failures before showing the user a Notice → **`console.error`**

A blanket `s/console\.log/console.debug/g` passes the bot but is a lie. Audit per call site.

**Where it bit us:** perplexed `main.ts` had **112** `console.log` occurrences.

### 2. UI text uses sentence case

> *"Use sentence case for UI text."*

Only the first word and proper nouns are capitalized. Applies to:

- Command names (`addCommand({ name: ... })`)
- Settings labels (`new Setting().setName(...)`)
- Modal titles
- Notice strings
- Anywhere user-visible

```ts
// Wrong
this.addCommand({ name: 'Generate Citation Footer' })
// Right
this.addCommand({ name: 'Generate citation footer' })
```

### 3. Don't put `command` in command IDs or names

> *"Adding `command` to the command ID is not necessary."*
> *"Adding `command` to the command name is not necessary."*

```ts
// Wrong
this.addCommand({ id: 'do-the-thing-command', name: 'Do the thing command' })
// Right
this.addCommand({ id: 'do-the-thing', name: 'Do the thing' })
```

### 4. Don't put the plugin name in command names

> *"The command name should not include the plugin name, the plugin name is already shown next to the command name in the UI."*

The command palette shows the plugin name as a separate column.

```ts
// Wrong
this.addCommand({ name: 'Image Gin: convert local images' })
// Right
this.addCommand({ name: 'Convert local images' })
```

### 5. `async` methods must `await` something

> *"Async method '<name>' has no 'await' expression."*

Three options:

- **Drop `async`** if the body really doesn't await. The method should return its actual type, not `Promise<that>`.
- **Add a real awaitable** (often the case — the body should be awaiting something it isn't).
- **Change the return type to `void`** if it's truly fire-and-forget; document the lifecycle in a comment.

The bot doesn't accept `// eslint-disable-next-line` for this rule.

### 6. Use `setHeading()`, not raw `<h2>`/`<h3>` in settings

> *"For a consistent UI use `new Setting(containerEl).setName(...).setHeading()` instead of creating HTML heading elements directly."*

```ts
// Wrong
containerEl.createEl('h2', { text: 'Provider settings' })
// Right
new Setting(containerEl).setName('Provider settings').setHeading()
```

`setHeading()` inherits Obsidian's theme, gives consistent visual rhythm with other plugins' settings tabs, and reads correctly with assistive tech.

### 7. No inline `element.style.*` assignments

> *"Avoid setting styles directly via `element.style.<prop>`. Use CSS classes for better theming and maintainability. Use the `setCssProps` function to change CSS properties."*

```ts
// Wrong
el.style.color = '#ff0000'
el.style.width = '200px'
el.style.minHeight = '4rem'
el.style.fontFamily = 'monospace'

// Right (static styling) — move to CSS class
el.addClass('my-row')
// in src/styles/foo.css:
// .my-row { color: var(--text-error); width: 200px; min-height: 4rem; font-family: var(--font-monospace); }

// Right (dynamic value that genuinely varies at runtime)
el.setCssProps({ '--row-color': computedColor })
// in src/styles/foo.css:
// .my-row { color: var(--row-color); }
```

The bot enforces this on `style.color`, `style.width`, `style.minHeight`, `style.fontFamily`, and others. Treat any `el.style.*` assignment as a code smell.

### 8. No floating promises in callbacks

> *"Promise returned in function argument where a void return was expected."*

The rule is `@typescript-eslint/no-misused-promises`. Triggers anywhere we pass an `async () => ...` to an API that wants `() => void`.

```ts
// Wrong — addEventListener expects () => void
button.addEventListener('click', async () => {
    await uploadFile()
})

// Right — wrap and discard the promise explicitly
button.addEventListener('click', () => {
    void (async () => {
        await uploadFile()
    })()
})

// Also right — if you genuinely don't care about completion
button.addEventListener('click', () => {
    void uploadFile()
})

// Also right — explicit error handling
button.addEventListener('click', () => {
    uploadFile().catch((e) => console.error(e))
})
```

### 9. Don't interpolate `unknown` into template literals

> *"Invalid type 'unknown' of template literal expression."*

Same fix as the type-safety reminder mandates: narrow first, or coerce.

```ts
// Wrong
catch (err) {
    new Notice(`Upload failed: ${err}`)  // err is unknown
}

// Right — narrow
catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    new Notice(`Upload failed: ${msg}`)
}
```

### 10. Use `requestUrl`, not `fetch`

> *"Unexpected use of `fetch`. Use the built-in `requestUrl` function instead of `fetch` for network requests in Obsidian."*

`requestUrl` (from `obsidian`) bypasses CORS and works on mobile where `fetch` semantics differ.

```ts
// Wrong
const response = await fetch(url, { method: 'POST', body: JSON.stringify(data) })
const json = await response.json()

// Right
import { requestUrl } from 'obsidian'
const response = await requestUrl({
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    throw: false,
})
const json = response.json   // synchronous on the response object
```

**Narrow exception — streaming responses.** `requestUrl` doesn't support SSE / chunked-streaming reads. If you genuinely need streaming (Perplexity Sonar streaming, Claude streaming, LM Studio chunked), `fetch` is the only option — but you must reply to the bot with `/skip <justification>` for those specific lines, not just leave them.

### 11. Throw `Error` objects, not strings

> *"Expected an error object to be thrown."*

```ts
// Wrong
throw 'Upload failed'

// Right
throw new Error('Upload failed')
```

The bot won't accept `// eslint-disable` here either. Always wrap.

### 12. (Optional) Don't leave unused `catch` parameters

> *"'e' is defined but never used."*

```ts
// Pre-modern — bot complains
try { ... } catch (e) { showFallback() }

// Modern, ESLint-quiet
try { ... } catch (_e) { showFallback() }   // intentional convention
try { ... } catch { showFallback() }         // TS 4.0+ allows omitting entirely
```

This is in the `### Optional` section of the bot's report, not `### Required` — it doesn't gate approval, but worth fixing for hygiene.

## What This Reminder Does NOT Cover

- **The `any`-rule** and broader type-safety patterns → see [[context-v/reminders/Obsidian-Type-Safety.md]]. That's the load-bearing companion.
- **Manifest / package.json / versions.json shape** → see Obsidian's official [Plugins/Releasing/Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- **Repo hygiene** (LICENSE file, README quality, fundingUrl, etc.) — covered case-by-case in each plugin's submission-prep plan, e.g. [[plugin-modules/perplexed/context-v/plans/2026-05-02_Submission-Blockers-Punch-List]].
- **Reviewer-not-bot territory** — the human reviewer assesses things the bot can't (telemetry policy, network usage explanations, README clarity). Those come up *after* the bot is clean.

## Adoption Checklist for a New Plugin

When scaffolding a new plugin (or before submitting an existing one):

- [ ] `eslint.config.mjs` extends `@obsidianmd/eslint-plugin`'s recommended config
- [ ] `pnpm build` runs `eslint .` and fails on violations
- [ ] No `console.log` / `console.info` — only `warn` / `error` / `debug`
- [ ] All UI strings in sentence case
- [ ] No `command` in command IDs or names
- [ ] No plugin name in command names
- [ ] Every `async` method awaits something (or isn't `async`)
- [ ] Settings tab uses `setHeading()`, not `<h2>`/`<h3>`
- [ ] Zero `element.style.*` assignments — everything in CSS classes
- [ ] No floating `async` callbacks passed to `addEventListener` / `setTimeout` / `setInterval`
- [ ] All `unknown` values narrowed before template-literal interpolation
- [ ] All HTTP via `requestUrl` (or documented `fetch` exception with `/skip` justification)
- [ ] All `throw` statements throw `Error` objects
- [ ] Unused catch parameters renamed to `_e` or omitted entirely

### Portal-rules checklist (the May 17-18 additions, post-PR-queue)

- [ ] `manifest.json` `description` — active voice, no "Obsidian", no "A plugin that..."
- [ ] `package.json` `description` matches `manifest.json`
- [ ] **GitHub repo "About" field** updated via `gh repo edit lossless-group/<plugin> --description "..."` AND verified with `gh api /repos/lossless-group/<plugin> --jq '.description'`
- [ ] `manifest.json` / `package.json` / `versions.json` keys / git tag — all on plain `MAJOR.MINOR.PATCH`, all aligned
- [ ] Git release tag has **no `v` prefix**
- [ ] `LICENSE` file at repo root (real MIT/Apache/etc. content, not just a `package.json` declaration)
- [ ] `fundingUrl` points at an actual tip-jar (`buymeacoffee.com/losslessgroup` by default)
- [ ] `minAppVersion` reflects the actual API floor (typically `1.8.10` for the current family)
- [ ] GitHub release attaches **exactly** `main.js`, `manifest.json`, `styles.css` — no LICENSE in the release bundle
- [ ] All modals use `modalEl.addClass(...)` for the wide-modal pattern, not `contentEl.addClass(...)`
- [ ] `esbuild.config.mjs` uses `import { builtinModules } from 'node:module'`, not the `builtin-modules` npm dep
- [ ] Release narrative at `changelog/releases/<version>.md` follows the four-audience marketing-doctrine cascade
- [ ] If re-scanning a flagged release: bump to the next patch version + cut a new tag — **don't** `gh release upload --clobber` and expect the portal to re-evaluate

## See Also

- **Verbatim source** — the [`obsidianmd/eslint-plugin`](https://github.com/obsidianmd/eslint-plugin) repo. Every eslint-bot rule above corresponds to a rule there.
- **Issue log** — [[context-v/issues/Obsidian-Review-Bot-Feedback-on-Perplexed-Submission]] — the May-9 PR-queue-era journey doc plus the May-17/18 Appendix A capturing the post-PR-queue findings.
- **Family-wide submission story** — [[content-farm/changelog/2026-05-18_01]] — *"Three plugins through the gauntlet"* — the six-round narrative covering every finding that drove a re-release across cite-wide, image-gin, and perplexed.
- **Companion reminder** — [[context-v/reminders/Obsidian-Type-Safety.md]] — the `any`-rule and type-safety patterns.
- **Dependabot triage** — [[context-v/issues/Dependabot-Alerts-Triage-Playbook-For-Lossless-Repos]] — the three-bucket categorization + bulk-dismiss script for the alert wall that follows any push to master.
- **Wide-modal CSS** — [[plugin-modules/perplexed/context-v/issues/Widen-Modals-in-Obsidian-using-CSS]] — the canonical `modalEl.addClass(...)` pattern and the matching CSS shape.
- **Marketing-doctrine for release narratives** — `context-v/skills/changelog-conventions/SKILL.md` section *"These are marketing artifacts, not internal documentation"*.
- **Per-plugin prep plans** — each plugin's `context-v/plans/` directory carries the audit + fix plan specific to that plugin (perplexed has two; image-gin and cite-wide each have one).
