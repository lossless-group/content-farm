---
title: Textgenerator Plugin — Analysis
date_created: 2026-05-09
type: study
subject: third-party Obsidian plugin (`obsidian-textgenerator-plugin`)
upstream: https://github.com/nhaouari/obsidian-textgenerator-plugin
local_path: plugin-modules/obsidian-textgenerator-plugin
version_studied: 0.8.8-beta
site_uuid: 66522cb0-7b67-48c5-922d-2a1020ed83e8
hex_code: q8rn50
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
lede: "Text Generator runs a local Koa proxy and a runtime package loader — borrow its async Handlebars helpers, not its remote-code surface."
summary: "Study of the third-party obsidian-textgenerator-plugin at 0.8.8-beta, read as prior art for the content-farm plugin family. Maps its directory structure, roughly thirty commands, provider matrix, template and Handlebars engine, extractor framework, streaming and proxy layer, and settings shape, then names three patterns worth borrowing and three to avoid. Section 6 maps the functional overlap with perplexed, metafetch, grab-reference, and cite-wide. Use it as the reference point when weighing how far a Lossless plugin should grow."
publish: true
---

# Textgenerator — Architecture & Feature Analysis

## 1. What it is

**Text Generator** is a mature, MIT-licensed Obsidian community plugin that turns Obsidian into a general-purpose AI workbench. It is not focused on a single workflow (chat, autocomplete, or summarization) — instead it ships a *template-driven* generation engine where every command in the palette ultimately resolves to a Handlebars template + a configured LLM provider. The plugin has been around long enough to have grown into roughly 2.6k LOC just across `main.ts`, `commands.ts`, and `text-generator.ts`, with broad provider coverage and a custom "live plugin manager" for installing template packages.

Upstream pitches it as "an open-source AI Assistant tool for knowledge creation and organization in Obsidian." In practice it is closer to a *prompt-execution runtime* embedded in Obsidian.

## 2. Top-level architecture

```
src/
  main.ts                   # plugin entrypoint, settings load, lifecycle
  default-settings.ts       # exhaustive defaults (providers, options, context, autosuggest, extractors)
  constants.ts              # icons + IGNORE_IN_YAML allowlist
  types.ts                  # TextGeneratorSettings shape
  scope/commands.ts         # Obsidian command registration (~30+ commands)
  services/
    text-generator.ts       # core RequestHandler + generation orchestration (930 LOC)
    api-service.ts          # request shaping
    auto-suggest/           # inline + list ghost-text suggestions
    slash-suggest.ts        # `/` slash-command palette
    overlayToolbar-service.ts
    pluginAPI-service.ts    # exposes API to other Obsidian plugins
    proxy-service.ts        # local koa proxy (for CORS/streaming workarounds)
    tgBlock.ts              # custom code-block processor (```tg```)
  LLMProviders/
    base.tsx, interface.ts, registery.ts, refs.ts
    langchain/              # 15 providers via LangChain (OpenAI, Anthropic, Gemini,
                            #   Mistral, Ollama, HF, Perplexity, Together, Replicate,
                            #   Azure OpenAI chat+instruct, Palm, ...)
    custom/                 # raw HTTP custom providers (Anthropic raw, generic custom)
  extractors/
    pdf, web, youtube, rss, audio, image, image-embedded, content
  ui/
    settings/               # paged settings UI (provider, context, auto-suggest, extractors, advanced)
    playground/             # template playground REPL
    template-input-modal/
    components/             # markdown renderer, toolbar, overlay, codeEditor, tooltips
    text-extractor-tool.tsx
  helpers/
    handlebars-helpers.ts   # template helpers
    javascript-sandbox.ts   # opt-in JS execution inside templates
  lib/
    async-handlebars-helper/
    func-cache/             # function-result memoization
    langchain/              # local LangChain glue
    live-plugin-manager/    # downloads & loads template packages at runtime
    models/                 # model registry
    fetch.ts                # streaming HTTP
  cm/                       # CodeMirror integrations (auto-suggest decoration)
```

The plugin is built with **esbuild + React 18 + Tailwind/DaisyUI** for the settings/playground UI and uses **LangChain.js** (`@langchain/core` + per-provider packages) as its primary LLM abstraction.

## 3. Feature surface

### 3.1 Generation commands (from `src/scope/commands.ts`)

The command palette gets ~30 registrable commands. Each one is gate-controlled by `settings.options.<id>` so users can hide what they don't use:

| Command id | Purpose |
|---|---|
| `generate-text` | Generate from current document context |
| `generate-text-with-metadata` | Same, but injects frontmatter into prompt |
| `insert-generated-text-From-template` | Run a saved template, insert result inline |
| `generated-text-to-clipboard-From-template` | Same, pipe to clipboard |
| `create-generated-text-From-template` | Same, create a new note with the result |
| `search-results-batch-generate-from-template` | Batch-run a template across search results |
| `insert-text-From-template` / `create-text-From-template` | Insert/create *without* generation (template scaffolding) |
| `show-modal-From-template` | Show a template-driven modal form |
| `open-template-as-tool` | Open a template as an interactive panel |
| `open-playground` | Open the Template Playground (REPL) |
| `set_max_tokens`, `set-llm`, `set-model` | Quick-switch generation params |
| `packageManager` | Open the Template Packages Manager |
| `create-template` | Scaffold a new template |
| `get-title` | "Generate a Title" for the current note |
| `auto-suggest` | Toggle inline ghost-text suggestions |
| `calculate-tokens`, `calculate-tokens-for-template` | Token estimation |
| `text-extractor-tool` | Open the multi-format extractor UI |
| `stop-stream` | Cancel an in-flight streaming generation |
| `reload` | Reload the plugin without restarting Obsidian |

Per-template, additional commands are registered dynamically (e.g. `<package>-<command>-<template-id>`).

### 3.2 LLM provider coverage

Two provider families coexist in `src/LLMProviders/`:

- **LangChain providers** (`langchain/`): OpenAI Chat, OpenAI Instruct, OpenAI Agent, Azure OpenAI (chat & instruct), Anthropic Chat, Google Generative AI (Gemini), Palm, Mistral AI, Ollama, HuggingFace, Perplexity, Together, Replicate, plus a `clones.tsx` for cloning provider configs.
- **Custom providers** (`custom/`): a raw `custom.tsx` (user-defined JSON request/response with `path_to_choices` / `path_to_message_content` mapping — see `IGNORE_IN_YAML` in `constants.ts:6`) plus a raw Anthropic implementation that bypasses LangChain.

Provider profiles are stored per-name under `LLMProviderProfiles` and `LLMProviderOptions` (with hashed keys via `LLMProviderOptionsKeysHashed`), so a user can save multiple distinct configurations of the same provider. There is a `providerOptionsValidator.ts` to sanity-check profile shape.

Default provider out-of-the-box is `"OpenAI Chat (Langchain)"` against `https://api.openai.com/v1`.

### 3.3 Templates & the Handlebars engine

Templates live by default under `textgenerator/templates` (`promptsPath` setting). They are Handlebars files with:

- Frontmatter that drives generation parameters (provider, model, max_tokens, stream, system, messages, body/headers, custom_body, custom_header, bodyParams, reqParams, etc.). The `IGNORE_IN_YAML` allowlist in `constants.ts` defines exactly which frontmatter keys are *config* (stripped before insertion) vs. *content*.
- A body that is rendered with Handlebars + custom helpers (`src/helpers/handlebars-helpers.ts`) and *async* helpers (`src/lib/async-handlebars-helper/`) — async helpers let a single template fan out to extractors, web fetches, or sub-LLM calls during render.
- Optional **JavaScript blocks**, executed in a sandbox (`src/helpers/javascript-sandbox.ts`) — gated by the `allowJavascriptRun` setting, default `false`.

**Template Packages Manager** (`packageManager` command + `src/lib/live-plugin-manager/`) is a runtime package manager: users can browse, install, and update community-maintained template bundles without restarting Obsidian. This is one of the more architecturally distinctive features — third-party content distribution baked into the plugin.

A **Template Playground** (`src/ui/playground/`) provides a live REPL for iterating on a template against the current vault context.

A **`tg` code-block processor** (`src/services/tgBlock.ts`) renders fenced ` ```tg ` blocks inline, so a template can be embedded and re-run from within a note.

### 3.4 Considered Context

The "Considered Context" subsystem is what assembles the prompt input. From `default-settings.ts:24`:

```
contextTemplate: `Title: {{title}}\nStarred Blocks: {{starredBlocks}}\n{{tg_selection}}`
```

Available variables include title, frontmatter, selection, current line, current paragraph, starred blocks (Obsidian "starred"), clipboard, and outputs of any registered extractor. There's a separate `customInstruct` mode for users who want to override the default context shape per-command. Clipboard inclusion is on by default (`includeClipboard: true`).

### 3.5 Auto-suggest & slash-suggest

- **Auto-suggest** (`src/services/auto-suggest/`, `src/cm/`): two flavors — `listSuggest` (Obsidian's `EditorSuggest` dropdown) and `inlineSuggest` (CodeMirror ghost text decoration). Trigger phrase defaults to two spaces, 300 ms debounce, 5 suggestions, stops on `.`. Has its own custom-instruct prompt and can use a different "customProvider" than the main generator.
- **Slash-suggest** (`src/services/slash-suggest.ts`): `/`-triggered command palette of templates, off by default.

### 3.6 Content extractors

`src/extractors/` is a polymorphic extractor framework keyed by `ExtractorMethod`. Each extractor can be enabled/disabled in settings (`extractorsOptions`):

- `PDFExtractor` — pdf.js-based text extraction
- `WebPageExtractor` — fetches a URL (uses turndown to convert HTML→Markdown)
- `YoutubeExtractor` — pulls transcript via the YouTube transcript API
- `AudioExtractor` — uses Whisper-style transcription (off by default)
- `ImageExtractor` / `ImageExtractorEmbded` — vision-model OCR/description for linked vs. embedded images
- `RSSExtractor` — feed parsing
- `ContentExtractor` — orchestrator that dispatches based on link type

Extractors are surfaced both as a standalone command (`text-extractor-tool`) and as Handlebars helpers callable from inside templates (this is what makes the async helper pattern important).

### 3.7 Streaming, request handling, proxy

- `src/lib/fetch.ts` implements streaming HTTP with cancellation (`stop-stream` command).
- `src/services/proxy-service.ts` is a local **Koa proxy** with `koa-proxies` and `@koa/cors` — used to work around CORS/Origin restrictions for some providers when the Electron renderer can't talk to them directly. This is unusual for an Obsidian plugin and effectively means the plugin can run a local HTTP server while Obsidian is open.
- `src/lib/func-cache/` memoizes deterministic function calls (likely token-cost reducer for re-runs).
- `requestTimeout` defaults to 5 minutes (300000 ms).

### 3.8 Plugin API for other plugins

`src/services/pluginAPI-service.ts` exposes a programmatic surface so other Obsidian plugins can call into Text Generator (run a template, generate from a string, etc.) without going through commands.

## 4. Settings shape (high level)

From `default-settings.ts` and `types.ts`, settings break into:

- **Provider**: `selectedProvider`, `endpoint`, `api_key`, per-profile `LLMProviderProfiles` / `LLMProviderOptions`, optional encryption (`encrypt_keys`).
- **Default model parameters**: `max_tokens`, `temperature`, `frequency_penalty`, `stream`.
- **Context**: `customInstructEnabled`, `customInstruct`, `contextTemplate`, `includeClipboard`.
- **Auto-suggest**: `autoSuggestOptions` (delay, count, trigger, stop, inline vs. list, custom provider).
- **Slash-suggest**: `slashSuggestOptions`.
- **Extractors**: per-extractor enable flag.
- **Options**: ~30 boolean flags toggling which commands appear.
- **Advanced**: `generateTitleInstruct`, `includeAttachmentsInRequest`, `displayErrorInEditor`, `allowJavascriptRun`, `experiment`, `outputToBlockQuote`, `freeCursorOnStreaming`, `tgSelectionLimiter` (regex for `***`-style boundary).
- **Paths**: `promptsPath` (`textgenerator/templates`), `textGenPath` (`textgenerator/`).

## 5. Notable engineering decisions

1. **LangChain as the LLM abstraction**, with bespoke escape hatches. Most providers ride LangChain; Anthropic gets a hand-rolled fallback in `custom/anthropic.tsx`, and `custom/custom.tsx` is a fully user-configurable HTTP provider. This is a sensible "80/20 + escape hatch" pattern.
2. **Templates as data, not code.** A template is a markdown file with frontmatter; the entire generation pipeline is reproducible by just shipping the file. This makes the **Template Packages Manager** viable — you can ship workflows as content, not plugin code.
3. **Async Handlebars helpers** allow templates to call extractors mid-render. This is more powerful than typical prompt-template engines and is what enables single-command pipelines like "fetch URL → summarize → file under heading."
4. **Local Koa proxy** to dodge Electron CORS. Pragmatic, but worth flagging as a security/footprint surface — it's a real HTTP server bound while the plugin is loaded.
5. **JS sandbox is opt-in**. Default `allowJavascriptRun: false`. Good default; running arbitrary JS from a downloaded template package would otherwise be a remote-code-execution vector.
6. **Per-command enable flags.** Users can dramatically slim the command palette to just the workflows they use, instead of being drowned in 30+ commands. This is good UX for a feature-dense plugin.
7. **`IGNORE_IN_YAML` allowlist** (constants.ts:6) is the canonical list of "config keys that should never leak into the rendered note." Worth studying as a clean separator between configuration frontmatter and content frontmatter.

## 6. Relevance to content-farm

Plugins under `plugin-modules/` in this repo (cite-wide, image-gin, perplexed, file-transporter, metafetch, plunk-it, filestarter, grab-reference, etc.) are smaller, single-purpose Obsidian plugins. Text Generator is roughly an order of magnitude larger and overlaps several of them functionally:

- **perplexed** (Perplexity-style citations / answers) overlaps Text Generator's Perplexity provider and "Generate a Title" / templated generation flows.
- **metafetch** (URL → metadata) overlaps `WebPageExtractor`.
- **grab-reference** likely overlaps Text Generator's link/extractor pipeline.
- **cite-wide** is a citations-rendering concern that does *not* overlap; Text Generator does not handle citation rendering.

Patterns worth borrowing:

- The **per-command enable map** (`settings.options.<id>`) for keeping the palette tidy as a plugin grows.
- The **frontmatter-config + body-content split** with an explicit `IGNORE_IN_YAML` allowlist.
- The **async Handlebars helper** pattern for letting templates invoke extractors/fetchers mid-render — this is a clean way to compose pipelines without a dedicated DAG runtime.

Patterns to *not* borrow without thought:

- The local **Koa proxy** server. Likely unnecessary for our plugins; adds a real attack surface.
- The **live-plugin-manager** runtime package loader. Powerful, but means the plugin can fetch and execute code at runtime — a steep security/audit posture for the Lossless ecosystem.
- The **JS sandbox in templates**. Same concern; if we ever ship template packages, we should stay declarative.

## 7. Open questions / things not yet looked at

- Exact shape of a template frontmatter (worth reading 2–3 community templates from the package manager to see typical bodies).
- How `tg`-block re-runs interact with Obsidian's live preview cache.
- Streaming back-pressure behavior — does it batch token writes to the editor, and how does it survive a note edit during streaming (`freeCursorOnStreaming: false` default suggests it pins the cursor).
- Token-counting backend (likely tiktoken or a JS port) and whether it's accurate across non-OpenAI providers.
- Whether `pluginAPI-service.ts` is documented anywhere — could let our plugins compose with Text Generator instead of duplicating its provider matrix.
