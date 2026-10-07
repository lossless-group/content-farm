---
title: "Handoff — Upgrading the Remaining Plugins to Obsidian 1.13 and the Current Stack"
lede: "Three plugins down, seven to go. The to-do list, commands, and traps from shipping Image Gin, Cite Wide, and Perplexed in one day."
summary: "Session handoff for the plugin-family migration to Obsidian 1.13's declarative settings API and the current toolchain. Records which plugins are done (image-gin 0.3.0, cite-wide 0.3.0, perplexed 0.4.0), which remain, the per-plugin checklist with exact commands and version pins, the gotchas each migration hit, the verification recipes (including a Node loader that runs a built main.js against real settings), and the release procedure. Pair with plans/Migrate-Plugin-Family-to-Obsidian-1-13.md."
publish: true
date_created: 2026-10-07
date_modified: 2026-10-07
date_authored_initial_draft: 2026-10-07
date_authored_current_draft: 2026-10-07
date_authored_final_draft:
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5.5
at_semantic_version: 0.0.0.1
site_uuid: ae3fea94-f5c3-4252-a69d-f33ad4eed8ed
hex_code: zoriv6
status: Active
tags:
  - Handoff
  - Obsidian-Plugin
  - Obsidian-1-13
  - Dependency-Upgrades
  - Release-Process
---

# Handoff — Upgrading the Remaining Plugins to Obsidian 1.13 and the Current Stack

> `handoffs/` is an experimental context-v folder: end-of-session state for the next session to resume from. This one doubles as the playbook for the rest of the migration.

## Why Care?

Obsidian 1.13 changed how plugin settings are drawn and searched, and pnpm 11 changed where its settings live. Every Lossless plugin was built the old way, and each one breaks the same ways:

- settings missing from Obsidian's settings search
- a hand-drawn settings tab that can silently hide half its rows (Image Gin on Obsidian 1.14)
- `pnpm build` refusing to run on pnpm 12 (Cite Wide)

Three plugins are fixed and released. This is everything needed to do the other seven without relearning any of it.

## Status

| Plugin | Repo | From → To | State |
|---|---|---|---|
| image-gin | lossless-group/image-gin | 0.2.3 → **0.3.0** | ✅ released 2026-10-06 |
| cite-wide | lossless-group/cite-wide | 0.2.3 → **0.3.0** | ✅ released 2026-10-06 |
| perplexed | lossless-group/perplexed-plugin | 0.3.1 → **0.4.0** | ✅ released 2026-10-06 |
| **metafetch** | lossless-group/metafetch | 0.1.7 | ⏳ **next**: also port Cite Wide's extractor fixes (see below) |
| stenographer | lossless-group/stenographer | 0.1.0 | ⏳ has `release.yml` and a settings tab |
| plunk-it | lossless-group/plunk-it | 1.0.0 | ⏳ **no own `pnpm-workspace.yaml`** |
| lmstud-yo | lossless-group/lmstud-yo | 0.1.0 | ⏳ **no own `pnpm-workspace.yaml`** |
| file-transporter | lossless-group/google-docs-api-plugin | 0.0.1 | ⏳ **no own `pnpm-workspace.yaml`**; manifest id is `obsidian-google-docs` |
| filestarter | lossless-group/obsidian-plugin-starter | 0.0.8 | ⏳ **no own `pnpm-workspace.yaml`**; it's the starter others clone, so fix its template too |
| image-wrangler | lossless-group/ai-image-wrangler-obsidian-plugin | 0.0.1 | ⏳ **no own `pnpm-workspace.yaml`**; `minAppVersion` 0.15.0; no settings tab found |
| obsidian-git, obsidian-textgenerator-plugin | third-party | — | Fetch only. The obsidian-git fork is synced to upstream 2.41.1 (upstream also moved to `minAppVersion` 1.13.0) |

Not plugins: `grab-reference` (multi-package app repo), `obsidian-task-manager`. No manifest; skip both.

## The non-negotiable: each plugin stands alone

- Every plugin has **its own `pnpm-workspace.yaml` listing only itself** (`packages: ['.']`). Without one, pnpm walks up to `content-farm/pnpm-workspace.yaml` and treats the parent as the workspace root. This is the "true workspace" mistake.
- Tooling (test harness, ESLint config, scripts) is **copied** in from a finished plugin, never imported, symlinked, or scripted against a sibling.
- Anything read from a vault folder (for example `zz-cf-lib/`) only **overrides** defaults bundled in the plugin.

## Per-plugin checklist

Copy this into each plugin's `context-v/plans/<date>_Upgrade-<Plugin>-to-Obsidian-1-13.md` first; Cite Wide's and Perplexed's plans are good models. **One focused commit per step.**

### 0. Survey
```bash
cd plugin-modules/<plugin>
git fetch --all --tags --prune && git status -sb && git stash list   # clean? up to date?
git tag --sort=-creatordate | head -3                                # last released version
gh repo view --json defaultBranchRef -q .defaultBranchRef.name       # main or master: they differ per repo
cat manifest.json versions.json; cat pnpm-workspace.yaml             # versions, own workspace file?
grep -rn "extends PluginSettingTab" --include='*.ts' . | grep -v node_modules
cat CLAUDE.md 2>/dev/null | grep -i -A3 branch                       # e.g. cite-wide: development → PR → master
```
Check whether the vault loads it through a symlink (`/Users/mpstaton/content-md/lossless/.obsidian/plugins/<id>`); if so, its `data.json` shows the real settings shape. **Read key names only. Never print values; they hold API keys.**

### 1. pnpm settings file
```yaml
# pnpm-workspace.yaml — this plugin's own pnpm settings, not a shared workspace
packages:
  - '.'
# move any "pnpm": { overrides, onlyBuiltDependencies } block out of package.json — pnpm 11+ ignores it
overrides: { }            # only if package.json had them
onlyBuiltDependencies:    # pnpm 10 (CI, release.yml)
  - esbuild
allowBuilds:              # pnpm 11+ (local)
  esbuild: true
```

### 2. Toolchain
| Package | Pin | Note |
|---|---|---|
| `obsidian` | `1.13.1` exact | Declares `getSettingDefinitions`. Never `latest`. |
| `eslint` | `^10.12.0` | |
| `@typescript-eslint/*`, `typescript-eslint` | `8.71.1` | |
| `eslint-plugin-obsidianmd` | `^0.4.2` | Obsidian's review-bot rules. Add it if missing and include `obsidianmd.configs.recommended` (copy `cite-wide/eslint.config.mjs`). |
| `esbuild` | `0.28.2` | |
| `@eslint/plugin-kit` | `^0.7.3` | |
| **`typescript`** | **hold `6.0.3`** | typescript-eslint peer is `<6.1.0`; TS 7 breaks typed linting. |
| **`@types/node`** | **hold `^22.20.5`** | Obsidian 1.13's installer ships Electron 43 (Node 24), but in-app updates don't replace Electron, so 1.13 users can still be on Node 22. |

Peer-dependency warnings from `eslint-plugin-obsidianmd` (it pins `obsidian@1.8.7` and pulls ESLint-9-era plugins) are upstream and harmless. Ignore them.

### 3. Tests, red first
Copy from `cite-wide/`: `scripts/run-tests.mjs`, `tests/stubs/obsidian.ts`, and the `"test"` script. Exclude `tests/**` and `.test-build/**` from `tsconfig.json` and ESLint, and gitignore `.test-build/`. Then write:
- `tests/plugin-onload.test.ts`: `onload()` registers **every** current command ID (list them from `main.ts`).
- `tests/settings-definitions.test.ts`:
  - every current settings row name present (inventory today's tab)
  - every control key exists in `DEFAULT_SETTINGS`
  - nested get/set works
  - every item named
  - `display()` not overridden
  - definitions build for a settings object shaped like the live `data.json`

### 4. Settings tab → `getSettingDefinitions()`, plus the version bump (same commit)
- Implement `getSettingDefinitions()`. **Delete the `display()` override** (and don't call it; it's deprecated).
- Override `getControlValue` / `setControlValue` with dot-path get/set and `await saveSettings()`. Special-case keys that carry side effects (Cite Wide's Jina key → URL service; Image Gin's custom style ID → `useCustomStyle`).
- Map the old layout this way:
  - **Sections** become `{ type: 'group', heading, items }`.
  - **Mutable collections** (size presets, preambles) become `{ type: 'list', addItem, onDelete, onReorder }`.
  - **Buttons** become `render` rows.
  - **Conditional rows** get `visible: () => …`; call `this.update()` after toggles that change visibility.
- Use real controls: `folder` for folder paths, `number` with `validate` for numbers, and `dropdown` (add the stored value as an option if it isn't in the list).
- **Bump in the same commit:**
  - `manifest.json` `version` → next **minor**, and `minAppVersion` → **`1.13.0`**
  - `package.json` `version` to match
  - `versions.json` gets `"<new>": "1.13.0"`
  - Strict three-part semver. Restore trailing newlines if `version-bump.mjs` strips them.

### 5. Docs
- README:
  - minimum Obsidian 1.13 and a release entry
  - fix stale content: wrong clone URLs, starter-template leftovers, `pnpm add -D builtin-modules` (the portal flags it), personal absolute paths, "Node 18", "testing is manual"
- A changelog entry `changelog/YYYY-MM-DD_NN.md` and `changelog/releases/<version>.md`. **Read the `changelog-conventions` skill first.** These are marketing documents: lead with what users get, not a commit list.

### 6. Gates, before every code commit
```bash
pnpm test
./node_modules/.bin/tsc -noEmit -skipLibCheck
./node_modules/.bin/eslint .          # must be 0 errors AND 0 warnings
node esbuild.config.mjs production
CI=true npx -y pnpm@10 install --frozen-lockfile   # when deps change; CI uses pnpm 10
```

### 7. Real-world check (outside Obsidian)
Load the built `main.js` with the live `data.json` and confirm every command registers. Save this as a scratch file (it is **not** plugin code):

```js
// load-plugin.cjs — usage: node load-plugin.cjs <path/to/main.js> [data.json]
const Module = require('module'), fs = require('fs');
const [,, mainJs, dataJson] = process.argv;
function chain() { const fn = function () {}; return new Proxy(fn, { get(_t, p) { if (p === 'then') return undefined; if (p === Symbol.toPrimitive) return () => ''; return chain(); }, apply() { return chain(); }, construct() { return chain(); }, set() { return true; } }); }
const commands = [];
class Plugin { constructor(app, manifest) { this.app = app; this.manifest = manifest; }
  loadData() { return Promise.resolve(dataJson && fs.existsSync(dataJson) ? JSON.parse(fs.readFileSync(dataJson, 'utf8')) : null); }
  saveData() { return Promise.resolve(); } addCommand(c) { commands.push(c.id); return c; }
  addSettingTab() {} addRibbonIcon() { return chain(); } addStatusBarItem() { return chain(); }
  registerEvent() {} registerDomEvent() {} registerInterval() {} register() {} registerEditorExtension() {}
  registerMarkdownPostProcessor() {} registerView() {} registerExtensions() {} registerObsidianProtocolHandler() {} }
const stub = new Proxy({ Plugin, PluginSettingTab: class { constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = chain(); } update() {} },
  Modal: class { constructor(app) { this.app = app; } }, Notice: class {}, requestUrl: () => Promise.resolve(chain()), normalizePath: p => p,
  Platform: { isDesktop: true, isMobile: false, isDesktopApp: true }, apiVersion: '1.14.4' },
  { get(t, p) { return p in t ? t[p] : class { constructor() { return chain(); } }; } });
const orig = Module._load;
Module._load = function (req, ...rest) { if (req === 'obsidian') return stub; if (req === 'electron' || req.startsWith('@codemirror') || req.startsWith('@lezer')) return chain(); return orig.call(this, req, ...rest); };
globalThis.window = globalThis; globalThis.activeDocument = chain(); globalThis.document = chain(); globalThis.activeWindow = globalThis;
(async () => { let mod; try { mod = require(mainJs); } catch (e) { console.log('THROW at require:', e && e.stack); return; }
  const P = mod.default || mod; const inst = new P(new Proxy({}, { get: () => chain() }), { id: 'test', version: '0' });
  try { await inst.onload(); console.log('onload OK; commands:', commands.length); } catch (e) { console.log('THROW in onload after', commands.length, 'commands:', e && e.stack); } })();
```

Then the human check: quit Obsidian with **Cmd+Q** (Obsidian loads `main.js` only at startup, and a stale running copy fooled us once), reopen, run a command, and search one setting in Settings.

### 8. Release
1. Check the description in all **three places** (manifest, package.json, GitHub "About"): no "Obsidian", no "This plugin…". `LICENSE` at the root, a real `fundingUrl`.
2. Release notes: set `status: Published` and `date_first_published`.
3. Promote: `development` → `main` → `master` by **fast-forward** (`git merge-base --is-ancestor` first). If the plugin's CLAUDE.md requires a PR (cite-wide does), open one with `gh pr create --base master --head development`; fast-forwarding `master` afterward still marks it merged.
4. `git tag -a <x.y.z> -m "…"` (**no `v` prefix**), then `git push origin <x.y.z>`, then `gh run watch` on `release.yml`.
5. Verify:
   ```bash
   gh release view <tag> -R lossless-group/<repo> --json assets   # exactly main.js, manifest.json, styles.css
   gh release download <tag> -R lossless-group/<repo>
   for f in main.js manifest.json styles.css; do gh attestation verify $f --repo lossless-group/<repo>; done
   ```
   Then load the downloaded `main.js` with the live `data.json` (step 7).
6. Bump the parent pointer **once, at wrap-up**: `chore(submodule): bump <plugin> to <version>`.
7. The community directory (`community.obsidian.md/plugins/<id>`) updates on its own schedule; check it later. A re-scan needs a **new tag**; re-uploading assets doesn't trigger one.

Plugins without `.github/workflows/release.yml`: copy it from `cite-wide/` (it builds, attests, and publishes `changelog/releases/<tag>.md` as the body). If a repo never had a release, this is its first one.

## Gotchas we hit (each cost real time)

| Gotcha | Symptom | Fix |
|---|---|---|
| Hand-drawn `display()` throws mid-way | On Obsidian 1.14, every section after the bad row vanishes, silently | Declarative tab; no `display()` |
| `minAppVersion` still 1.8.10 | obsidianmd lint: `update()` / `setDestructive()` are "unsupported API" errors | Bump `minAppVersion` in the same commit as the rewrite |
| `"pnpm"` block in package.json | `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN` on pnpm 12 | Move it to the plugin's own `pnpm-workspace.yaml` |
| Missing own `pnpm-workspace.yaml` | pnpm treats `content-farm` as the workspace root | Add one with `packages: ['.']` |
| `onlyBuiltDependencies` only | Local pnpm 12: "Ignored build scripts: esbuild" | Add `allowBuilds` too |
| Stale Obsidian process | "Fixed" code still misbehaves; log lines show old code | Cmd+Q, not a window close; check the process start time |
| `.gitignore` edits via Python | Whole-file diff (CRLF → LF) | Append with `printf`, preserving line endings |
| `loadSettings()` shallow merge | Editing settings mutated `DEFAULT_SETTINGS` (Perplexed) | Merge a `structuredClone` of the defaults |
| `onload()` logs settings | API keys printed in the dev console (Perplexed) | Remove it |
| Sentence-case lint | `Use sentence case for UI text` errors | Reword; placeholders too (`"Amber #fbbf24"`, not `"#fbbf24"`) |
| Searching the vault from scripts | `grep -r` (ugrep) and `os.walk` skip symlinked folders and saw ~20% of notes | `os.walk(followlinks=True)` with realpath dedupe; plugin code using the vault API is fine |

## Metafetch: extra work beyond the checklist

Metafetch's `directFetchService.ts` was the source Cite Wide copied its extractor from. Cite Wide has since fixed these bugs in its copy, and Metafetch still has them. Port the fixes (**copy, don't import**). Each has tests in `cite-wide/tests/` to port alongside:

1. **Apostrophes truncate meta values.** `content=["']([^"']*)["']` cuts `"Kyle O'Brien"` to `"Kyle O"`. Use quote-aware attribute parsing in document order (cite-wide `getMetaAll` / `attr`).
2. **Named HTML entities aren't decoded** (`&rsquo;`, `&mdash;`, accented letters): the `NAMED_ENTITIES` table.
3. **The favicon is the app icon** when a page lists `apple-touch-icon` first: `extractBrandAssets` (also adds app icon, logo, mask icon, brand color, manifest).
4. **The author fallback chain:** JSON-LD author → meta → `twitter:data1` only when `label1` = "Written by" → BEM byline elements → plus the `isPlausibleAuthor` gate (reading times like "3 minutes" were being stored as authors).
5. **Junk titles:** bot-check and error-page titles ("Just a moment…", "Client Challenge", "Page not found") are treated as a failed fetch.

## Related

- [[Migrate-Plugin-Family-to-Obsidian-1-13]]: the family plan
- `image-gin/context-v/plans/2026-10-06_Migrate-Settings-Tab-to-Obsidian-1-13-Declarative-API.md`
- `cite-wide/context-v/plans/2026-10-06_Upgrade-Cite-Wide-to-Obsidian-1-13.md`
- `perplexed/context-v/plans/2026-10-06_Upgrade-Perplexed-to-Obsidian-1-13.md`
- `context-v/reminders/Obsidian-Marketplace-Compliance.md`: portal rules beyond lint
- `cite-wide/context-v/issues/Enriching-the-Lossless-Vault-Citations.md`: where the extractor fixes came from
