---
title: "Migrating When an API Provider Rebrands"
lede: "A vendor rebrands mid-integration — different name, different domain, sometimes different auth surface. What do you fix today, what do you leave alone, and what's the safe order? A short runbook from the day Freepik turned into Magnific."
date_created: 2026-05-02
date_modified: 2026-05-05
status: Authoritative
category: Runbook
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: any content-farm plugin integrating a third-party API
tags:
  - Runbook
  - API-Integrations
  - Rebrands
  - Migrations
---

# Migrating When an API Provider Rebrands

When a third-party API vendor rebrands, the integration usually still works — the URLs forward, the keys stay valid, the response shapes don't change. But the **identity surface** drifts: dashboard URLs, account screens, support docs, sometimes the brand name in error messages. This is the runbook for restoring a working state without doing a premature full rename.

The case study is **Freepik → Magnific** (Image Gin's stock-image provider, rebranded in early May 2026). The same shape applies whenever a provider rebrands.

## Phase 1 — Restore credentials (do this today)

When the rebrand surfaces (usually as a 401 in the existing integration), the immediate fix is credential recovery, not codebase renaming.

1. Get a new API key from the rebranded vendor's dashboard. The 401 response usually includes the URL — for Magnific that was `https://www.magnific.com/developers/dashboard/api-key`.
2. Open the plugin's settings tab in Obsidian — keep the old UI label that points at the old name. Don't rename UI labels yet.
3. Paste the new key into the existing field. The field maps to the same JSON path in `data.json`; you don't need to change anything else.
4. Reload the plugin (toggle off/on in Community Plugins, or `Cmd+R`).
5. Verify the integration with one test call.

That's it. The plugin works again. Nothing else has to change today.

## Phase 2 — Decide whether to rename (later, deliberate)

Once the integration is verified working, the question opens: do you do a full rename across the codebase?

- **Settings schema** — keep the old key in `data.json` for back-compat with existing installs; add the new key as an alias.
- **Settings UI labels** — only rename when you're ready to ship a release. Mismatched labels in shipped builds confuse users.
- **File names** — `freepikService.ts` → `magnificService.ts` etc. Mechanical, but git history is easier to follow if you do it as one rename commit.
- **Class names, command IDs, CSS classes** — same as file names. One sweep, one commit.
- **`loadSettings()` migration** — required if you change the JSON path of the saved key, otherwise existing data.json files lose the saved key on next load. Keep the old path readable; copy to the new path on first load; write only to the new path going forward.

Rule of thumb: **don't move the ground while users are still verifying credentials.** If the integration just came back online, give it a release cycle of stability before the rename pass.

## Phase 3 — When to leave it alone

Some rebrands deserve nothing beyond Phase 1. Indicators:

- The new brand is a sibling product, not a successor — the old service may continue and the rebrand only renames a parent company.
- The new brand has worse SEO than the old one — your error messages and docs reference the old name; users searching will find more hits there.
- The vendor signals the rebrand is reversible or experimental.

Default to Phase 1 only until the rebrand is unambiguously the way forward.

## Files this affected (the Freepik/Magnific case)

- `image-gin/src/services/freepikService.ts` — kept the file name; updated the dashboard URL only.
- `image-gin/src/modals/FreepikModal.ts` — kept the class name; updated the user-facing copy in the modal header to read "Magnific (formerly Freepik)" temporarily.
- `image-gin/manifest.json` — untouched.
- `image-gin/data.json` — untouched.

A full rename pass — `freepik-*` → `magnific-*` across services, modals, settings, commands, CSS — was deliberately deferred to a later release once Magnific's credential flow proved stable.

## Cross-references

- `image-gin/context-v/blueprints/Add-New-Image-API-to-Providers.md` — the canonical pattern for adding a provider. Useful to read before considering the inverse (a rename).
- The `pseudomonorepos/references/branch-alignment.md` skill reference — when the rename pass eventually happens, do it on `development`, not `master`.
