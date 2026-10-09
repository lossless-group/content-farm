---
title: "Blueprint — Model Recipes: Any LLM API, Configured the Same Way in Every Plugin"
lede: "One way for every Lossless plugin to call any model: a data-only recipe per provider, keys in Obsidian's keychain, and the same settings rows."
summary: "The family pattern for model calls, first shipped in Metafetch 0.2.0. Defines the recipe format (request, auth placement, body template, response path), the four bundled recipes (Claude, OpenAI, TrustedRouter, OpenAI-compatible), the vault recipes folder zz-cf-lib/recipes/, keys stored by name in Obsidian's vault-wide secret storage and bound to hosts, and the reusable settings rows. Lists the two source files to copy from Metafetch, the steps to adopt it in another plugin, and each plugin's current hand-wired keys and hosts as migration targets. Supersedes per-plugin API-key text fields for model providers."
publish: true
date_created: 2026-10-08
date_modified: 2026-10-08
date_authored_initial_draft: 2026-10-08
date_authored_current_draft: 2026-10-08
date_authored_final_draft:
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5.5
at_semantic_version: 0.0.0.1
site_uuid: e3930837-0d9d-4ae2-9b94-d6b24c9a450c
hex_code: 3ji6hi
status: Active
tags:
  - Blueprint
  - Obsidian-Plugin
  - LLM
  - API-Providers
  - Secrets
related:
  - "[[Moving-Beyond-Simple-API-Calls]]"
  - "[[Folder-Aware-Frontmatter-Templates-and-Fetch-Recipes]]"
  - "[[Add-New-API-Provider-to-Plugin]]"
---

# Blueprint — Model Recipes: Any LLM API, Configured the Same Way in Every Plugin

## Why Care?

Every Lossless plugin that calls a model wired its provider by hand. Perplexed has text fields for Perplexity, Anthropic, Gemini, and Exa keys. Image Gin has Recraft and Ideogram keys. Stenographer has AssemblyAI. Each plugin stores its keys in its own `data.json`, in plain text, and adding a provider means a code change and a release.

The model-recipe pattern replaces that with one mechanism:

- **A provider is a recipe**: data that says where the request goes, where the key goes, what the body looks like, and where the answer is.
- **Claude and OpenAI are built in**, along with TrustedRouter and any OpenAI-compatible endpoint (LM Studio, Ollama, OpenRouter, Groq).
- **Any other API is a file** in `zz-cf-lib/recipes/`, which every plugin can read.
- **Keys live in Obsidian's keychain**, by name. One secret called `anthropic` serves every plugin, and none of them stores the key.

It shipped first in Metafetch 0.2.0, where profile fields marked `from: [model]` are filled by whichever provider is chosen.

## The recipe

````markdown
```cf-recipe
id: gemini
title: Google Gemini
model: gemini-3.8-flash
enforces-schema: true
request:
  method: POST
  url: https://generativelanguage.googleapis.com/v1beta/models/{{model}}:generateContent
  auth: header:x-goog-api-key
  headers: { content-type: application/json }
  body:
    systemInstruction: { parts: [{ text: "{{system}}" }] }
    contents: [{ role: user, parts: [{ text: "{{prompt}}" }] }]
    generationConfig: { responseMimeType: application/json, responseJsonSchema: "{{schema}}" }
response:
  text: candidates[0].content.parts[0].text
```
````

| Part | Meaning |
|---|---|
| `request.url`, `headers`, `body` | Sent as written, with variables filled in. A value that is exactly `"{{schema}}"` becomes the schema object, not a string. Unknown variables are an error. |
| Variables | `{{model}}`, `{{system}}`, `{{prompt}}`, `{{schema}}`, `{{baseUrl}}` |
| `request.auth` | `bearer`, `header:<name>`, `query:<name>`, or `none` |
| `response.text` | Path to the reply text. `[0]` indexes a list, `[-1]` counts from the end, and `[?type=text]` takes the first item whose `type` is `text`. |
| `enforces-schema` | The provider holds the reply to the schema. Otherwise the prompt asks for JSON, and the first JSON object in the reply is read. |

Recipes are **data, never code**. There are no expressions, no chaining, and no JavaScript. A provider that needs more (signed requests, OAuth refresh, multi-step calls) gets a TypeScript adapter instead, per [[Moving-Beyond-Simple-API-Calls]].

## Bundled recipes

| id | Endpoint | Key | Reply | Default model |
|---|---|---|---|---|
| `anthropic` | Messages API, `anthropic-version: 2023-06-01`, server-side fallback on a decline | `x-api-key` | `output_config.format` JSON schema; text after the thinking block | `claude-opus-5-5` |
| `openai` | Chat Completions | Bearer | strict `json_schema` | `gpt-6-astra` |
| `trustedrouter` | `api.trustedrouter.com/v1`, OpenAI-compatible | Bearer | prompt-requested JSON | `openai/gpt-6-astra` |
| `openai-compatible` | `{{baseUrl}}/chat/completions` | Bearer | prompt-requested JSON | set by the user |

Verified 2026-10-08 with one live call each: `claude-opus-5-5` and `gpt-6-astra` both returned schema-valid JSON through the same engine. Models are a settings field, so a newer model never needs a release.

## Keys

- **Stored by name.** The settings row is Obsidian's `SecretComponent` (1.11.4+). Plugin settings keep the secret's *name*, and `app.secretStorage.getSecret(name)` reads the key at call time. Keys never enter `data.json`, a recipe, or a log.
- **Vault-wide.** The keychain belongs to the vault, not the plugin, so every plugin can pick the same secret.
- **Bound to hosts.**
  - A bundled recipe's key goes only to its own host.
  - The OpenAI-compatible key goes only to the configured base URL's host.
  - A vault recipe's key goes nowhere until the operator lists its host under *Approved hosts* in settings. A recipe file dropped into a shared vault can't send your keys anywhere.
- **No plain http**, except to `localhost`, so a local LM Studio works and nothing else leaks.
- **Errors never echo the key.** Failures quote the provider's own error text, cut to 300 characters.

## The files to copy

Both files depend only on Obsidian's API. Copy them; don't import them across plugins.

| File (in `metafetch/src/services/`) | What it gives you |
|---|---|
| `modelRecipes.ts` | `ModelRecipe`, `BUNDLED_RECIPES`, `parseRecipe()`, `callModel()`, `substitute()`, `readPath()`, `parseJsonObject()`, host checks |
| `modelProviderSettings.ts` | `providerDefinitions()` (the settings rows), `mergeProviderSettings()`, `defaultProviderSettings()` |

Tests to copy with them: `metafetch/tests/model-recipes.test.ts`, and the "model provider rows" block in `tests/settings-definitions.test.ts`.

## Adopting it in another plugin

1. Copy the two files and their tests. The fence name `cf-recipe` is shared by the family: every plugin reads the same recipe files.
2. **Settings:** add `modelProviders`, `defaultModelProvider`, and `recipesRoot` (default `zz-cf-lib/recipes`). In `loadSettings()`, merge with `mergeProviderSettings(saved.modelProviders)`. Append `providerDefinitions({...})` to `getSettingDefinitions()`, and route `modelProviders.<id>.<field>` keys in `getControlValue` / `setControlValue`. Metafetch's `src/settings/settings.ts` is the model.
3. **Recipes:** keep `recipes = [...BUNDLED_RECIPES]` on the plugin, and refresh it on `onLayoutReady` and before each run (`listVaultRecipes()` in `metafetch/src/commands/fillFromProfile.ts`).
4. **Calls:** `callModel({ recipe, provider: providerSettings(...), getSecret: n => app.secretStorage.getSecret(n), system, prompt, schema })`. It returns the parsed JSON object, or throws a `ModelCallError` with a code (`NO_KEY`, `HOST_NOT_APPROVED`, `HTTP_ERROR`, `REFUSED`, `BAD_RESPONSE`…) and a message fit for a notice.
5. **Migrate old keys:** on first load, if an old `anthropicApiKey`-style field has a value, offer to move it into the keychain. Don't do it silently, and delete the plaintext field afterwards.
6. Raise `minAppVersion` to at least 1.13.0 (declarative settings). Secret storage itself needs 1.11.4.

## Migration targets (2026-10-08)

| Plugin | Hand-wired today | Fits recipes? |
|---|---|---|
| perplexed | `perplexityApiKey`, `anthropicApiKey`, `geminiApiKey`, `exaApiKey` | Perplexity and Anthropic: yes (Perplexity is OpenAI-compatible). Gemini: the example recipe. Exa is search, not a model: a recipe of a different `kind` later. |
| image-gin | `recraftApiKey`, Ideogram, Magnific | Image APIs return images, not text: a future `kind: image`. Keys can move to the keychain now. |
| stenographer | `assemblyAiApiKey`, `supadataApiKey` | Transcription: keychain now, recipes later. |
| cite-wide | `jinaApiKey` | Reader API, not a model. Keychain now. |
| lmstud-yo | LM Studio, local | The `openai-compatible` recipe with `http://localhost:1234/v1` replaces its custom client. |

The keychain half (secret names instead of plaintext keys) is worth doing in every plugin now, even before its calls move to recipes.

## Open questions

1. **Streaming.** `callModel()` waits for the whole reply, which is fine for frontmatter. Perplexed streams long answers into the note; recipes would need a `stream:` section (SSE path to text deltas) before Perplexed can move fully.
2. **Non-text kinds.** Image generation, search, and transcription APIs fit the same shape (request, auth, response path), with a different response type. Add `kind:` when the first one moves.
3. **The recipe format is now a contract.** Every plugin reads `cf-recipe` blocks in `zz-cf-lib/recipes/`. Changing a key means changing every plugin that reads it, so add keys rather than rename them.
