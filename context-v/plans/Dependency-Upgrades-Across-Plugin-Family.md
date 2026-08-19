---
title: "Dependency upgrades across the Obsidian plugin family — full bump inventory, safe → major → forks"
lede: "Every outdated dependency in the ten Lossless-original modules plus the umbrella, grouped patch → minor → major, with upstream release-notes research attached to every major before it moves."
date_created: 2026-07-24
date_modified: 2026-07-24
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Fable 5
semantic_version: 0.0.0.2
status: Partially-Shipped
date_first_published: 2026-07-24
loop_reference: "[[../loops/Dependency-Upgrade-Loop-For-Obsidian-Plugin-Family]]"
tags:
  - Dependency-Upgrades
  - Obsidian-Plugins
  - Content-Farm
  - Plans
site_uuid: 228097e5-c813-4cbc-bcb8-cabe5fb51c9d
hex_code: uzm1zo
date_authored_initial_draft: 2026-07-24
date_authored_current_draft: 2026-07-24
publish: true
---

# Dependency upgrades across the plugin family

## Remaining work (as of 2026-07-24)

Passes A and B **shipped** 2026-07-24: all nine original modules + the
umbrella green on TypeScript 6.0.3 / ESLint 10.7 / esbuild 0.28.1, with
per-module changelog entries and pushed `development` commits
(campaign roll-up: `changelog/2026-07-24_01.md`; tracking issue
[content-farm#7](https://github.com/lossless-group/content-farm/issues/7)).
Notable in-flight discoveries: 22 dead dependency declarations removed
across six repos (B13's `dev` among them), B6 zod and B7 typed.js both
resolved by removal, marketplace semver fixed in umbrella + image-wrangler,
and the umbrella's 3,910-error typecheck brought to zero (five real
main.ts bugs fixed).

Still open:

- **Pass C — `obsidian-git`**: needs operator sign-off (CLAUDE.md marks it
  do-not-modify); prefer upstream sync over independent bumps.
- **Deferred majors**: TypeScript 7 (from the paid-up 6.x position, next
  campaign); @types/node 24+ (when Obsidian's Electron bundles Node 24+).
- **Human rung**: sandbox-vault smoke test, priority on metafetch's
  rebuilt animation and the umbrella's revived citation/Freepik commands.

The execution inventory for
[[../loops/Dependency-Upgrade-Loop-For-Obsidian-Plugin-Family]]. Survey ran
2026-07-24 via `npx npm-check-updates --format group` against all eleven
`package.json` files. **pnpm is the package manager throughout** — modules
found on other lockfiles converge to pnpm during their iteration.

Scope reminders: `obsidian-git` (the one true fork) waits for Pass C;
`grab-reference` is **excluded entirely** pending
[[../issues/What-To-Do-With-Grab-Reference]];
`obsidian-textgenerator-plugin` is third-party, untouched.

## Pass A inventory — patch + minor (safe sweep)

Order: smallest surface first, umbrella last (it aggregates the family, so
it moves after the members are green).

| Module | Patch/minor bumps |
|---|---|
| `cite-wide` | `@typescript-eslint/*` 8.59.1 → 8.65.0; esbuild 0.28.0 → 0.28.1 |
| `image-gin` | `@typescript-eslint/*` 8.59.1 → 8.65.0; eslint ^10.3 → ^10.7; `@eslint/plugin-kit` 0.7.1 → 0.7.2; esbuild 0.28.0 → 0.28.1 |
| `metafetch` | `@typescript-eslint/*` 8.59.1 → 8.65.0; eslint ^10.3 → ^10.7; esbuild 0.28.0 → 0.28.1 |
| `perplexed` | `@typescript-eslint/*` + typescript-eslint 8.59.1 → 8.65.0; eslint ^10.3 → ^10.7; globals 17.6 → 17.7; esbuild 0.28.0 → 0.28.1 |
| `plunk-it` | `@typescript-eslint/*` 8.37 → 8.65; builtin-modules 5.0 → 5.3; dotenv 17.2.1 → 17.4.2 |
| `lmstud-yo` | MCP SDK 1.17 → 1.29; `@typescript-eslint/*` 8.38 → 8.65; builtin-modules 5.0 → 5.3; fastify 5.4 → 5.10; zod 4.0.10 → 4.4.3 |
| `filestarter` | MCP SDK 1.15 → 1.29; `@typescript-eslint/*` 8.37 → 8.65; builtin-modules 5.0 → 5.3; fastify 5.4 → 5.10; zod 4.0 → 4.4.3 |
| `file-transporter` | MCP SDK 1.15 → 1.29; `@typescript-eslint/*` 8.37 → 8.65; builtin-modules 5.0 → 5.3; dotenv 17.2.1 → 17.4.2; fastify 5.4 → 5.10; zod 4.0 → 4.4.3 |
| `image-wrangler` | MCP SDK 1.15 → 1.29; `@typescript-eslint/*` 8.36 → 8.65; builtin-modules 5.0 → 5.3; fastify 5.4 → 5.10; zod 4.0 → 4.4.3 |
| umbrella (`content-farm`) | MCP SDK 1.12 → 1.29; `@typescript-eslint/*` 8.33 → 8.65; builtin-modules 5.0 → 5.3; fastify 5.3 → 5.10 |

Treated as Pass-A despite 0.x labels (changelog checked once, applied
family-wide): esbuild 0.28.0 → 0.28.1; `@eslint/plugin-kit` 0.7.1 → 0.7.2.

## Pass B inventory — majors (one researched bump per iteration)

| # | Bump | Affects | Disposition |
|---|---|---|---|
| B1 | esbuild 0.25.x → 0.28.1 | umbrella, plunk-it, filestarter, file-transporter, image-wrangler, lmstud-yo | 0.x-major; read esbuild changelog for 0.26/0.27/0.28 once, apply family-wide |
| B2 | eslint 9.x → 10.x | umbrella, cite-wide, plunk-it, lmstud-yo, filestarter, file-transporter, image-wrangler | already-flat-config repos; expect low friction |
| B3 | `@eslint/plugin-kit` 0.3 → 0.7 | plunk-it, filestarter, file-transporter | rides with B2 |
| B4 | eslint-plugin-obsidianmd 0.2.9 → 0.4.1 | image-gin, perplexed | 0.x; check rule renames |
| B5 | `@types/node` → **pin `^22`** (not 26) | all | Obsidian 1.13.3 ships Electron 39 = Node 22; repos on 24/25 move DOWN — see research |
| B6 | zod 3.25 → 4.x | umbrella only (others already on 4) | real call-site rewrites (`message`→`error`, `z.email()`, 2-arg `z.record()`); staged path via `zod/v4` subpath |
| B7 | typed.js 2 → 3 | metafetch | **RESOLVED 2026-07-24 — dependency removed.** v3 relicensed MIT → GPL-3.0; rebuilt as in-repo `src/utils/typewriter.ts` (~100 lines), bundle −18% |
| B8 | marked 9 → 18 | plunk-it | large span; renderer-token rewrite (v13/v14) + list-token restructuring (v17) |
| B9 | googleapis 158 → 173 | file-transporter | low risk — all 15 majors are API-schema regenerations; no auth/client breaks; `tsc` surfaces the rest |
| B10 | open 10 → 11 | file-transporter | trivial — sole break is Node ≥ 20 floor, satisfied by Obsidian's Node 22 |
| B11 | `@anthropic-ai/sdk` 0.92 → 0.115 | perplexed | 0.x; model-ID union removals + stream/middleware behavior shifts — see research |
| B12 | typescript → **6.x now, 7.0 deferred** | all | Microsoft: 6.0 is the official bridge; clean-on-6.x ⇒ identical on 7.0. Do the 6.x stop-over this campaign |
| B13 | `dev` 0.1.3 → 0.1.5 | lmstud-yo, file-transporter | verify this package is even intentional — smells like an accidental install |

### Deferred (named reasons, revisit next campaign)

- **typescript 7.0.x** — take the officially-recommended 6.x stop-over this
  campaign (B12); jump to 7 next campaign once every module compiles clean
  on 6.x with no `ignoreDeprecations`.
- ~~typed.js 3.x~~ — **resolved by removal** (2026-07-24): rather than hold
  at 2.x against the MIT → GPL-3.0 relicense, the typewriter animation was
  rebuilt in-repo (`metafetch/src/utils/typewriter.ts`) and the dependency
  dropped entirely. No functionality change; bundle shrank 18%.
- **@types/node 24/25/26** — deliberately pinned back to `^22` to match
  Obsidian's Electron 39 / Node 22 runtime (B5); revisit when Obsidian's
  installer jumps to an Electron major bundling Node 24+.

## Release-notes research for the majors

Web-searched 2026-07-24. A major with no research attached does not get
bumped.

### B12 · typescript 5.8/6.0 → 6.x (7.0 deferred)

Links: <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>,
<https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/>,
<https://github.com/microsoft/typescript-go>

- **6.x stop-over is Microsoft's official path**: 6.0 is "the bridge between
  5.9 and 7.0" — clean compile on 6.x (no `ignoreDeprecations`, ideally
  `stableTypeOrdering` on) ⇒ identical behavior on 7.0.
- 6.0 removes outright: `target: "es5"` (min ES2015, default `es2025`),
  AMD/UMD/System module modes, `moduleResolution: "classic"`, `--outFile`,
  `--downlevelIteration`, legacy `module Foo {}` namespace syntax.
- 6.0 deprecates (hatch `"ignoreDeprecations": "6.0"`, removed in 7):
  `moduleResolution: "node"/"node10"` → **`"bundler"`** (the right choice for
  esbuild-bundled plugins), `baseUrl` → `paths`, `esModuleInterop: false`.
- **Default flips that bite `tsc -noEmit`:** `strict: true` by default, and
  **`types` defaults to `[]`** — without explicit `"types": ["node"]`,
  `Buffer`/`process`/`NodeJS.Timeout` globals silently vanish. `module`
  defaults to `esnext`.
- 7.0 ships **no public programmatic compiler API** until 7.1 (doesn't
  affect a `tsc -noEmit` + esbuild toolchain; CLI is still `tsc`, ~10×
  faster native binary).

### B2/B3 · eslint 9 → 10 (+ the 8 → 9 note)

Links: <https://eslint.org/docs/latest/use/migrate-to-10.0.0>,
<https://eslint.org/blog/2026/02/eslint-v10.0.0-released/>

- Node ≥ 20.19 / 22.13 / 24. **eslintrc fully removed** — `.eslintrc.*`
  ignored, `ESLINT_USE_FLAT_CONFIG` inert, `FlatESLint`/`LegacyESLint` gone.
- Config lookup now starts from each **linted file's** directory and walks
  up (was cwd) — in a pseudomonorepo, per-module `eslint.config.js` files
  get picked up in one run. This is the default; the flag is removed.
- Deleted rule-context APIs (breaks custom rules):
  `context.getFilename()/getSourceCode()/getCwd()` → `.filename`/`.sourceCode`/`.cwd`;
  `parserOptions`/`parserPath` gone; RuleTester stricter.
- `eslint:recommended` adds `no-unassigned-vars`, `no-useless-assignment`,
  `preserve-caught-error`; `eslint-env` comments now error;
  `eslint.config.ts` needs jiti ≥ 2.2. Official codemod: `@eslint/v9-to-v10`.
- (Historical note, kept for [[../issues/What-To-Do-With-Grab-Reference]]:
  an 8 → 9 migration means flat `eslint.config.mjs`, `@eslint/js`,
  `languageOptions` + `globals` package, typescript-eslint v8's
  `tseslint.config(...)`.)

### B5 · @types/node — pin to Obsidian's runtime

Links: <https://obsidian.md/changelog/>,
<https://www.electronjs.org/blog/electron-39-0>

- Obsidian desktop **1.13.3 (2026-07-21)** ships installer **Electron 39**,
  which bundles **Node 22.x**. `@types/node@26` describes Node-26 APIs
  (`Temporal` global, Undici-8 fetch types) that **don't exist in Obsidian's
  runtime** — code could type-check yet crash in-app.
- Action: every module pins `@types/node@^22`, including the ones currently
  on 24/25 (a downgrade). Revisit on Obsidian's next Electron major.

### B6 · zod 3.25 → 4

Links: <https://zod.dev/v4/changelog>, <https://zod.dev/v4/versioning>

- Error customization unified: `message` deprecated,
  `invalid_type_error`/`required_error` **dropped**, `errorMap` → `error`.
- `.default()` now short-circuits on `undefined` (must match output type);
  `.prefault()` restores v3 behavior. `z.string().email()` →  `z.email()`
  etc.; **`z.record()` requires two args** (compile error otherwise).
- `ZodError.errors` removed (→ `.issues`); `.format()`/`.flatten()` →
  `z.treeifyError()`; `ZodType` generics reshaped.
- Staged path: zod@4 keeps `zod/v3` + `zod/v4` subpaths forever — pin
  `zod/v3` imports where a full rewrite isn't warranted yet.

### B8 · marked 9 → 18

Links: <https://github.com/markedjs/marked/releases/tag/v13.0.0>,
<https://github.com/markedjs/marked/releases/tag/v14.0.0>,
<https://github.com/markedjs/marked/releases/tag/v17.0.0>

- **v13/v14: renderer rewrite** — methods receive token objects
  (`heading(token)` with `.depth`/`.text`/`.tokens`), old signatures removed
  at v14; `marked.parse()` return type must match async config.
- v16: Node ≥ 20; **`./lib/marked.cjs` and `./marked.min.js` removed** —
  deep imports break (esbuild's ESM resolution is fine).
- **v17: list-token restructuring** — checkbox is its own token, loose-list
  text becomes `paragraph`; breaks custom `listitem`/`checkbox` renderers
  and `walkTokens` matching list internals. v18: TS-6-built types + trailing
  blank lines trimmed from `token.raw`.
- `sanitize`/`mangle`/`headerIds` were already gone before v9 — no new
  break there.

### B9 · googleapis 158 → 173

Links: <https://github.com/googleapis/google-api-nodejs-client/blob/main/CHANGELOG.md>

- All 15 majors are **per-API schema regenerations only** — no auth,
  client-construction, ESM, or engine breaks across the span.
  `google-auth-library` stays `^10.2.0` at both ends; `new
  google.auth.OAuth2(...)` unchanged. Risk is confined to typed params on
  the endpoints file-transporter actually calls — `tsc` surfaces those.

### B10 · open 10 → 11

Links: <https://github.com/sindresorhus/open/releases/tag/v11.0.0>

- Sole breaking change: Node ≥ 20 floor — satisfied by Obsidian's Node 22.
  No API changes; already pure ESM since v9.

### B11 · @anthropic-ai/sdk 0.92 → 0.115

Links: <https://github.com/anthropics/anthropic-sdk-typescript/blob/main/CHANGELOG.md>

- 0.104.2 / 0.109.1: **retired model IDs removed from the `Model` union** +
  nonfunctional type exports deleted — references stop type-checking.
- 0.101–0.103: middleware-chain rework; request timeout now applies to the
  inner fetch only — matters if perplexed wraps/patches `fetch`.
- 0.105: `MessageStream` lazily parses partial tool-input JSON (changes
  tool-input delta events). 0.96: zod tool helpers strictly require
  `zod/v4` schemas (ties into B6).
- 0.114/0.115: union expansions (`model_context_window_exceeded` stop
  reason, `tool_change` stream events) — break exhaustive `switch`es.

### B4 · eslint-plugin-obsidianmd 0.2.9 → 0.4.1

Links: <https://github.com/obsidianmd/eslint-plugin/releases>

- 0.4.0 raises the peer floor to `eslint >= 9.19` (peers typescript-eslint
  ^8.35.1, @eslint/js ^9.30.1) — sequence after B2.
- 0.4.0 swaps `import/no-nodejs-modules` for its own
  `obsidianmd/no-nodejs-modules` — overrides keyed to the old name
  **silently stop applying**. 0.3.0 flipped some default severities
  (`prefer-active-doc` off by default). Flat config primary; ESM package.

### B1 · esbuild 0.25 → 0.28

Links: <https://github.com/evanw/esbuild/blob/main/CHANGELOG.md>

- Unusually mild "majors": 0.26 = publishing-pipeline change only; 0.28's
  "breaking" item is install-flow integrity checks. `esbuild.config.mjs`
  API surface unchanged across the span.
- Two real notes: 0.27's `binary` loader can emit
  `Uint8Array.fromBase64` unless an explicit `target` is set (set the
  Electron/Chromium target in each config), and the build-machine floor is
  now macOS 12+.

## Verification & artifacts

Per the loop doc: rungs 0–3 (tsc → pnpm build → main.js sanity → 3-digit
manifest/versions agreement) green per module per pass; per-module changelog
entry + pushed `development` commit per iteration; parent pointer-bump +
campaign changelog at close; tracking task per
`gh-cli-projects-tasks-conventions` created once this plan is pushed (the
task body links to this file on the `development` branch).
