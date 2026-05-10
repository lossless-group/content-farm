---
title: "Obsidian Marketplace Compliance — Rules the Review Bot Enforces"
purpose: "Source-of-truth for the patterns that get a Lossless plugin past `ObsidianReviewBot` on a community-marketplace submission PR. Read before opening any re-submission, and ideally before writing the code that will be submitted. Companion to cite-wide's `Obsidian-Type-Safety.md` (which covers the `any`-rule). Distilled from the review bot's verbatim feedback on perplexed PR #12513."
status: Authoritative
date_created: 2026-05-09
date_modified: 2026-05-09
last_verified: 2026-05-09
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
  - plugin-modules/cite-wide/context-v/reminders/Obsidian-Type-Safety.md
---

## Why This Document Exists

`ObsidianReviewBot` runs an automated linter on every community-marketplace submission PR. The linter is open-sourced as [`obsidianmd/eslint-plugin`](https://github.com/obsidianmd/eslint-plugin) and we *should* be running it locally so violations surface in `pnpm build`, not in the review thread. Until then, this doc captures the rules verbatim and the canonical fix for each.

The rules are **unambiguous**, **machine-checked**, and **non-negotiable**. There is one narrow exception (the `fetch` rule for streaming responses) that may warrant a `/skip` reply on the PR; everything else must just be fixed.

For the `any`-rule and broader type-safety obligations, read **`plugin-modules/cite-wide/context-v/reminders/Obsidian-Type-Safety.md`** first — that's the load-bearing companion. This doc covers everything *else* the bot enforces.

## How the Review Loop Works

1. Open the PR against `obsidianmd/obsidian-releases`.
2. Bot scans within hours, posts a structured comment with `### Required` and `### Optional` sections, each rule paired with line-number citations into your `main.ts`.
3. **Fix → push → wait up to 6 hours** for the bot to re-scan. The PR comment thread updates in place.
4. **Do NOT** open a new PR. **Do NOT** rebase the PR. The reviewer rebases at approval time.
5. If you genuinely disagree with a finding, reply with `/skip` and a justification. Use sparingly.

The bot only reads `main.ts` (and any file directly imported into the bundle). Source files in `src/` are scanned via the bundle, so violations there surface as line numbers in `main.ts` after esbuild stitches them together — confusing at first; the local lint plugin gives you original line numbers in the original files.

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

- **The `any`-rule** and broader type-safety patterns → see [[plugin-modules/cite-wide/context-v/reminders/Obsidian-Type-Safety.md]]. That's the load-bearing companion.
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

## See Also

- **Verbatim source** — the [`obsidianmd/eslint-plugin`](https://github.com/obsidianmd/eslint-plugin) repo. Every rule above corresponds to a rule there.
- **Issue log** — [[context-v/issues/Obsidian-Review-Bot-Feedback-on-Perplexed-Submission]] — the journey doc this reminder was distilled from. Captures line numbers, fix order, and PR mechanics.
- **Companion reminder** — [[plugin-modules/cite-wide/context-v/reminders/Obsidian-Type-Safety.md]] — the `any`-rule and type-safety patterns.
- **Per-plugin prep plans** — each plugin's `context-v/plans/` directory carries the audit + fix plan specific to that plugin (perplexed has two; image-gin and cite-wide each have one).
