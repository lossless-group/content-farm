---
title: "Tidy Naming — Repo Mentions of 'Obsidian' and 'Plugin'"
lede: "Obsidian's community-plugin guidelines forbid using 'Obsidian' or 'Plugin' in the brand name (repo, manifest, README, description). Several of our repos still do. A punch list of what to rename, where, and why we held off until now."
date_created: 2026-05-04
date_modified: 2026-05-05
status: Active
category: Chore
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: every Obsidian plugin in content-farm/plugin-modules/
tags:
  - Chore
  - Obsidian-Plugins
  - Naming
  - Branding
  - Refactors
---

# Tidy Naming — Repo Mentions of "Obsidian" and "Plugin"

## The constraint

Obsidian's [community plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) are explicit about brand language:

> Don't include "Obsidian" in the plugin's name unless it's part of your brand. … Don't include "plugin" in the plugin's name. It's redundant.

The review bot enforces this on the manifest's `name` field at submission time. It also rejects repos whose names suggest they're official Obsidian artifacts.

We have several repos that violate this in either the repo name, the manifest, or both. The chore is to rename each so the constraint is satisfied without breaking the running plugins or the data folders users have already established.

## The punch list

| Current repo (GitHub) | Current manifest `name` | Proposed names | Rename status |
|---|---|---|---|
| `lossless-group/obsidian-plugin-starter` | "Obsidian Starter" | repo: `filestarter`, manifest name: "Filestarter" | **on-disk renamed** to `filestarter` (May 2026); GitHub remote still `obsidian-plugin-starter.git`; manifest `name` and `id` still old |
| `lossless-group/obsidian-google-docs` (now `google-docs-api-plugin`) | "Google Docs Connector" | repo: `file-transporter`, manifest name: "File Transporter" | **on-disk renamed** to `file-transporter` (May 2026); GitHub remote still `google-docs-api-plugin.git`; manifest `name` and `id` still old |
| `lossless-group/perplexed-plugin` | "Perplexed" | repo: `perplexed`, drop the `-plugin` suffix | manifest `name` already correct; GitHub remote still has `-plugin` suffix |
| `lossless-group/cite-wide` | "Cite Wide" | no change needed | clean |
| `lossless-group/image-gin` | "Image Gin" | no change needed | clean |
| `lossless-group/plunk-it` | "Plunk It" | no change needed | clean |
| `lossless-group/lmstud-yo` | "LMStud Yo" | no change needed | clean |
| `lossless-group/grab-reference` | n/a (not yet a plugin) | no change needed | n/a — this is currently a citation-manager microservice |
| `lossless-group/obsidian-git` | "Git" | n/a — vendored upstream, out of scope | n/a |

Three repos need work: `obsidian-plugin-starter`, `obsidian-google-docs` (a.k.a. `google-docs-api-plugin`), and `perplexed-plugin`. The other Obsidian plugins are already conformant.

## Why we held off

The on-disk rename is cheap. The **GitHub remote rename** and the **manifest `id` change** are not — both have downstream effects:

- **GitHub remote rename** — old URLs forward, but every consumer (CI, submodule pointers, content-farm's `.gitmodules`, anyone who cloned the old URL) has to re-target eventually. Slack of the forwarding helps, but isn't free.
- **Manifest `id` change** — the `id` is the directory name Obsidian creates under `<vault>/.obsidian/plugins/<id>/`. Changing it means existing installs lose their settings (`data.json`) and the plugin appears as new. For plugins with active users (cite-wide, image-gin, perplexed) this is a breaking change.

So the chore is best done in two phases:

### Phase 1 — On-disk + manifest text (low risk)

For each rename target:

1. Rename the on-disk directory to the new short form. **Done** for filestarter and file-transporter.
2. Update the manifest's `name` field (the human-readable display name in Community Plugins). **Pending.**
3. Update the README's title and description to drop "Obsidian" and "Plugin" where they violate the guideline.
4. Update the package.json `name` field to match.

### Phase 2 — GitHub remote + manifest `id` (breaking; deferred)

For each rename target:

1. Rename the GitHub repo (Settings → Repository name).
2. Update content-farm's `.gitmodules` URLs.
3. **Decide on `id` migration strategy.** Options:
   - Keep the old `id` (back-compat with existing installs, technically still violates the guideline) — leave alone.
   - Change `id`, ship a `loadSettings()` migration that reads both old-id and new-id paths, copies forward.
   - Change `id`, accept that users re-configure on next install.

Phase 2 should happen as part of a deliberate release for each plugin, not as a side effect of this chore.

## What's actually shipping in this chore today

This chore was opened during the May 2026 content-farm pseudomonorepo cleanup. As of writing:

- Filestarter and File-Transporter on-disk renames are done.
- GitHub remote renames, manifest `name` updates, manifest `id` strategy decisions: **all still pending**.
- Perplexed manifest `name` was already conformant (was "Perplexed", not "Perplexed Plugin"); the only thing left is renaming the GitHub remote from `perplexed-plugin` to `perplexed`.

## Cross-references

- `image-gin/manifest.json` and `cite-wide/manifest.json` — examples of clean manifest naming to model from.
- `pseudomonorepos/references/branch-alignment.md` — when running the rename pass, do it on `development`, merge through `main` → `master` per the tier model.
- The Obsidian community plugin guidelines: <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines>
