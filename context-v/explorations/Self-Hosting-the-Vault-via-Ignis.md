---
title: "Self-Hosting the Vault via Ignis — Team-Wide Browser Access to Content Farm"
lede: "content-farm's whole plugin set assumes desktop Obsidian. Ignis runs Obsidian in a browser against a server-side vault — worth knowing about, not yet worth committing to."
date_created: 2026-07-20
date_modified: 2026-07-20
authors:
  - mpstaton
augmented_with:
  - Claude Sonnet 5
semantic_version: 0.0.0.1
tags:
  - Exploration
  - Obsidian
  - Self-Hosting
  - Team-Collaboration
status: Open
site_uuid: d20d7929-996d-4479-ab12-535013dafb3c
hex_code: ftvg8i
date_authored_initial_draft: 2026-07-20
date_authored_current_draft: 2026-07-20
---

# Self-Hosting the Vault via Ignis — Team-Wide Browser Access to Content Farm

## The question

Every plugin in `plugin-modules/` (perplexed, image-gin, lmstud-yo, cite-wide, metafetch, etc.) assumes a desktop Obsidian install. If the vault this plugin set operates on ever needs to be reachable by more than one person without each person maintaining their own desktop sync setup, is [Ignis](https://github.com/Nystik-gh/ignis) — "run Obsidian in the browser, no remote desktop required" — a credible path, or does content-farm's plugin architecture make it a non-starter?

## Why we don't already know

Ignis (836★, AGPL-3.0, Docker Compose self-hosted) works by shimming the browser-compatible subset of the Electron APIs Obsidian itself uses — it downloads Obsidian from official sources at runtime rather than vendoring it, and it explicitly states it supports "most community plugins **except those requiring native Node modules or child processes**." Nobody has checked whether any of content-farm's own plugins, or the third-party ones pinned as study material (`obsidian-git`, `obsidian-textgenerator-plugin`), fall into that excluded category. `lmstud-yo` in particular talks to a local LM Studio server — that's a network call, likely fine — but `obsidian-git` shells out to the `git` binary, which is exactly the "child process" case Ignis calls out as unsupported.

This is also not purely a technical question. It intersects with two things already explored elsewhere in the tree:

- The self-host-stack repo's [[Instantly-Synced-Team-Folder-Nextcloud-vs-Alternatives]] exploration — a 3-person team already needs a shared, live-synced directory for research materials and agent-skills; a self-hosted vault reachable in-browser could be a different, possibly better, answer to a version of that same need.
- The self-host-stack repo's Hermes Agent explorations (`Hermes-Agent-Colocation-and-Hackability`, `Hermes-Agent-Multi-User-Team-Access`) — multi-user access to an agent-adjacent workspace is the same underlying shape as multi-user access to a content vault.

## Options

### Option A — Ignis-hosted vault, browser access for everyone

**Pros:**
- No per-user desktop Obsidian install or sync client needed — genuinely just a browser tab.
- Docker Compose deployment fits this stack's existing self-hosting discipline (same pattern as `self-host-stack/core/*`).
- AGPL-3.0, doesn't vendor Obsidian's own (closed-source) code — legally cleaner than it might first appear.

**Cons:**
- Plugin compatibility is unverified for this specific plugin set — `obsidian-git`'s child-process git calls are a likely blocker as-is.
- Newer project (author's own words: "daily driver," ongoing gap documentation) — less battle-tested than desktop Obsidian.
- Introduces a server to operate and secure (vault contents plus whatever API keys the AI-plugin modules need) where today there is none.

### Option B — Status quo: desktop Obsidian + file sync (Syncthing/Nextcloud per the sibling exploration)

**Pros:**
- Zero new infrastructure; every plugin already works exactly as authored.
- Already partially explored in [[Instantly-Synced-Team-Folder-Nextcloud-vs-Alternatives]].

**Cons:**
- Doesn't solve "reach the vault from a browser with no client install" — a different use case than pure file sync.

## Findings

- Not yet started. This entry exists to capture the question and the Ignis pointer before either forgetting about it or accidentally re-researching it from scratch later.

## Tentative direction

Before committing any real time: check whether `obsidian-git`'s shell-out pattern actually breaks under Ignis (test in a throwaway Docker container against a scratch vault), since that's the single highest-likelihood blocker and answers the "non-starter or not" question fastest.

## Outcome

Open — not started.

## Related

- [[Create-a-Study-of-the-Best-Obsidian-Plugins]] (`context-v/plans/`) — Ignis isn't itself an Obsidian plugin (it's a hosting shim, not a community plugin), so it doesn't belong on that plan's candidate-plugin list, but the same study-repos-first discipline applies if this gets pinned as a submodule later.
- self-host-stack `context-v/explorations/Instantly-Synced-Team-Folder-Nextcloud-vs-Alternatives.md`
- self-host-stack `context-v/explorations/Hermes-Agent-Multi-User-Team-Access.md`
- self-host-stack `context-v/explorations/Watchlist-Interesting-Tools.md` — Ignis is also logged there
