---
title: Prompt — Add a New Model Provider to Image Gin
lede: The agent-facing instruction for adding a new image-generation provider to Image Gin. Hands the work to a coding agent with the canonical blueprint to follow, the case-study prior art (Recraft, Ideogram, Magnific), and the exact files to touch — so the agent isn't reinventing the shape on every new vendor.
date_created: 2026-05-04
date_modified: 2026-05-05
status: Authoritative
category: Prompt
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: image-gin Obsidian plugin
target_provider_examples:
  - Google Gemini Imagen — https://ai.google.dev/gemini-api/docs/imagen
  - Stability AI / SDXL
  - Flux (Black Forest Labs)
tags:
  - Prompt
  - Agent-Instruction
  - Image-Generation
  - API-Integrations
from: image-gin
from_path: prompts/Add-New-Model-Provider.md
---
<!-- Rolled up from image-gin/context-v/prompts/Add-New-Model-Provider.md. Edit at the source, not here. Re-run `pnpm rollup:sync` to refresh. -->

# Prompt — Add a New Model Provider to Image Gin

This is a prompt template for an AI coding agent. Paste it (or a customized version) into your agent session when you want to add a new image-generation provider to Image Gin.

## Context to give the agent

> You're adding a new image-generation provider to **Image Gin**, an Obsidian plugin in `lossless-group/image-gin`. The canonical pattern is documented in `context-v/blueprints/Add-New-Image-API-to-Providers.md` — read that blueprint first; it's the source of truth for the shape.
>
> The repo has reference implementations for three providers already:
>
> - **Recraft** — `src/services/recraftImageService.ts`, `src/modals/RecraftModal.ts` — generation
> - **Ideogram** — `src/services/ideogramService.ts`, `src/modals/IdeogramModal.ts` — generation (added 2026-05-03 as the worked-example for the blueprint)
> - **Magnific** (formerly Freepik) — `src/services/freepikService.ts`, `src/modals/FreepikModal.ts` — search/stock, distinct shape from generation
>
> Use the **generation** pattern (Recraft + Ideogram), not the search pattern, for any text-to-image provider.

## Concrete instruction

> Add **`<Provider Name>`** as a new image-generation provider to image-gin, following the blueprint at `context-v/blueprints/Add-New-Image-API-to-Providers.md`.
>
> Provider details:
>
> - **API endpoint**: `<URL>`
> - **Auth method**: `<bearer token | API key in header | other>`
> - **API key env var**: `<PROVIDER>_API_KEY` (already added to `.env`)
> - **Request shape**: `<link to provider's API docs>`
> - **Response shape**: `<link to provider's API docs>`
> - **Streaming or single-response**: `<streaming | single>`
>
> Don't deprecate Recraft, Ideogram, or Magnific. The new provider is purely additive — separate command, separate modal, separate settings section.

## Required scope (from the blueprint)

1. **Settings** — extend `DEFAULT_SETTINGS` in `src/settings/settings.ts` with a new sub-object for the provider (`enabled`, `apiKey`, model selection if multiple, any provider-specific tunables). The runtime `data.json` must merge cleanly over `DEFAULT_SETTINGS` — no field can exist at runtime without existing in defaults.
2. **Settings UI** — extend the Settings tab to render the new provider's section. Match the visual rhythm of Recraft/Ideogram sections.
3. **Service** — `src/services/<provider>Service.ts`. Use Obsidian's `requestUrl`, NOT browser `fetch`. Build multipart bodies by hand if the API needs uploads — see `imagekitService.ts` for the boundary pattern.
4. **Modal** — `src/modals/<Provider>Modal.ts` extending the unified wide-modal pattern. Cmd/Ctrl+Enter submits. Stream responses if the API supports streaming.
5. **Command registration** — in `main.ts`, add a new command that opens the modal. ID should be `generate-<provider>-image`.
6. **Type safety** — strict, no `any`. Use `unknown` and narrow at the API boundary. Type predicates (`v is X`) are the canonical narrowing tool.
7. **Build cleanly** — `pnpm build` must pass with no TypeScript errors and no esbuild warnings.

## Required reading

- **`context-v/blueprints/Add-New-Image-API-to-Providers.md`** — canonical blueprint, treat as load-bearing
- **`context-v/reminders/This-is-an-Obsidian-plugin-Read-Obsidian-API-Docs.md`** — banned patterns (`any`, `innerHTML`, `var`, etc.) and review-bot rejection reasons
- **`src/services/recraftImageService.ts`** — reference implementation; copy its shape, not its provider-specific details
- **`src/modals/IdeogramModal.ts`** — reference modal implementation

## What the agent should *not* do

- Don't introduce new dependencies. Use Node built-ins and Obsidian's `requestUrl`. Specifically: no `axios`, no `node-fetch`, no `js-yaml`.
- Don't refactor adjacent providers. Recraft and Ideogram are out of scope unless the new provider's pattern reveals a shared abstraction worth extracting — and even then, raise it as a separate question, don't act on it.
- Don't change the wide-modal layout. New providers slot into the existing pattern.
- Don't bump the plugin's version in `manifest.json` by hand — `pnpm version` handles that.

## Validation before declaring done

1. `pnpm build` exits 0.
2. `pnpm dev` running, plugin loaded in a test vault, the new command appears in the command palette.
3. Modal opens, settings render, an actual API call returns and writes a file.
4. The other three providers (Recraft, Ideogram, Magnific) still work — quick smoke test on each.

## Provider-specific notes (when the new provider is...)

### Google Gemini Imagen

Endpoint shape: `POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent` (or current equivalent — see <https://ai.google.dev/gemini-api/docs/imagen>). Auth via `key=<API_KEY>` query parameter or `x-goog-api-key` header. Returns base64-encoded PNG bytes inline in the response — service module needs to decode and write to vault.

### Stability AI / SDXL

Endpoint shape: `POST https://api.stability.ai/v2beta/stable-image/generate/<engine>`. Auth via `Authorization: Bearer <key>`. Multipart form for inputs; response is binary image bytes directly.

### Flux

Endpoint shape varies by hosted provider (Replicate, BFL direct, etc.). Pick one host and document which.
