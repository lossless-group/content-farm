---
title: "Plan — Migrate the Lossless Plugin Family to Obsidian 1.13"
lede: "Obsidian 1.13 changed how settings render and get searched, and pnpm 11 changed where its settings live. One playbook, nine plugins, each still standing on its own."
summary: "Fan-out plan applying the image-gin 0.3.0 migration (declarative settings, minAppVersion 1.13.0, current toolchain, zero-dependency tests, own pnpm settings file) to every Lossless-authored plugin in plugin-modules/, Cite Wide first because its commands stopped loading on Obsidian 1.14. Third-party submodules are only fetched and re-pointed. Releases are gated on the operator."
publish: true
date_created: 2026-10-06
date_modified: 2026-10-06
date_authored_initial_draft: 2026-10-06
date_authored_current_draft: 2026-10-06
date_authored_final_draft:
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5.5
at_semantic_version: 0.0.0.1
site_uuid: 2ca641c3-45ad-4f3e-a35b-ffa2f3b15200
hex_code: o58i4j
status: Implementing
tags:
  - Plan
  - Obsidian-Plugin
  - Obsidian-1-13
  - Pseudomonorepos
  - Dependency-Upgrades
---

# Plan — Migrate the Lossless Plugin Family to Obsidian 1.13

## Why Care?

Image Gin found the problems first. On Obsidian 1.14, half its settings tab silently disappeared, none of its settings showed up in Obsidian's new settings search, and pnpm 12 refused to build plugins whose settings still lived in `package.json`. Then Cite Wide's commands stopped loading. Every plugin in this family was built the same way, so every one is exposed the same way.

This plan applies the fix Image Gin shipped as **0.3.0** to the rest of the family, one plugin at a time.

## The non-negotiable: every plugin stands alone

`content-farm` is a pseudomonorepo. Each plugin is its own repo and its own marketplace release, installed by people who have none of this tree. So:

- **Each plugin has its own `pnpm-workspace.yaml`** listing only itself (`packages: ['.']`). Without one, pnpm walks up to `content-farm/pnpm-workspace.yaml` and treats the parent as the workspace root. Five plugins were missing theirs.
- **Tooling is copied, never shared.** The test harness, ESLint config, and scripts are copied into each repo. Nothing imports from, scripts against, or symlinks to a sibling or the parent.
- **Vault-side libraries only override.** Anything read from a vault folder such as `zz-cf-lib/` falls back to defaults bundled in the plugin.

## The playbook (per plugin)

Reference implementation: `plugin-modules/image-gin`, commits `f828afd` … `48fd035`. Its plan is `image-gin/context-v/plans/2026-10-06_Migrate-Settings-Tab-to-Obsidian-1-13-Declarative-API.md`.

1. **pnpm settings file.** Create or extend `pnpm-workspace.yaml` with `packages: ['.']`. Move any `"pnpm"` block out of `package.json`, since pnpm 11+ ignores it. Keep `onlyBuiltDependencies` for CI's pnpm 10 and add `allowBuilds` for pnpm 11+.
2. **Toolchain.** `obsidian` 1.13.1 (pinned), ESLint ^10.12, typescript-eslint 8.71.1, eslint-plugin-obsidianmd ^0.4.2 (the review-bot rules, added where missing), esbuild 0.28.2. Two packages are held on purpose:
   - **TypeScript stays at 6.0.3.** typescript-eslint supports only `<6.1.0`.
   - **`@types/node` stays on 22.** In-app Obsidian updates don't replace Electron, so a 1.13 user can still be on Node 22.
3. **Tests.** Copy the zero-dependency harness (esbuild + Node's built-in `node:test`). Then write, red first:
   - a settings-definitions spec
   - an `onload()` test asserting every command registers
4. **Settings tab.** Move to `getSettingDefinitions()` with no `display()` override and every row carried over. Raise `minAppVersion` to **1.13.0** and bump the version a **minor**, kept identical across `manifest.json`, `package.json`, and `versions.json`. The lint rejects 1.13 APIs until the manifest says 1.13.
5. **Docs.** README minimum version and anything stale, a changelog entry, and `changelog/releases/<version>.md`.
6. **Gates**, which must all pass before each code commit:
   - `pnpm test`
   - `tsc`
   - ESLint at **0 errors and 0 warnings**
   - the production bundle
   - `CI=true pnpm@10 install --frozen-lockfile`

## The family

| Plugin | Repo | Version | Listed in directory | Settings tab | Own pnpm file | Order |
|---|---|---|---|---|---|---|
| image-gin | lossless-group/image-gin | **0.3.0, shipped** | yes | ✅ declarative | ✅ | done |
| **cite-wide** | lossless-group/cite-wide | 0.2.3 | yes | `CiteWideSettings.ts` | ✅ (fixed 230a5ee) | **1, commands not loading** |
| perplexed | lossless-group/perplexed-plugin | 0.3.1 | yes | in `main.ts` | ✅ | 2 |
| metafetch | lossless-group/metafetch | 0.1.7 | submitted | `settings-tab.ts` | ✅ | 3 |
| stenographer | lossless-group/stenographer | 0.1.0 | — | `settings-tab.ts` | ✅ | 4 |
| plunk-it | lossless-group/plunk-it | 1.0.0 | — | `SettingsTab.ts` | ❌ | 5 |
| lmstud-yo | lossless-group/lmstud-yo | 0.1.0 | — | `LMStudioSettings.ts` | ❌ | 6 |
| file-transporter | lossless-group/google-docs-api-plugin | 0.0.1 | — | `GoogleDocsSettings.ts` | ❌ | 7 |
| filestarter | lossless-group/obsidian-plugin-starter | 0.0.8 | — | (check) | ❌ | 8 |
| image-wrangler | lossless-group/ai-image-wrangler-obsidian-plugin | 0.0.1 | — | (none found) | ❌ | 9 |

Out of scope:

- **grab-reference** and **obsidian-task-manager** have no plugin manifest. grab-reference is a multi-package app repo.
- **Third-party submodules** are only synced:
  - `obsidian-textgenerator-plugin` is already at upstream 0.8.11-beta.
  - The `obsidian-git` fork merged 47 upstream commits to 2.41.1 (c68e277). Upstream made the same `minAppVersion` 1.13.0 move.

## Releases

Pushing `development` is part of each plugin's work. **Tagging a release is gated on the operator.** Directory-listed plugins (cite-wide, perplexed) follow image-gin's release procedure:

1. Fast-forward `development` → `main` → `master`.
2. Tag with no `v` prefix.
3. The attested release workflow runs.
4. Verify the release.

The parent's submodule pointers are bumped once, at wrap-up.

## Related

- [[Dependency-Upgrades-Across-Plugin-Family]]: the July toolchain campaign this continues
- `context-v/reminders/Obsidian-Marketplace-Compliance.md`: portal rules beyond lint
