---
title: "Blueprint — Add a New Image-Generation Provider (case study: Ideogram)"
status: Proposed
created: 2026-05-03
applies_to: image-gin Obsidian plugin
authors:
  - Michael Staton
augmented_with: Claude Code (Opus 4.7, 1M context)
case_study_provider: Ideogram v3
reference_implementation:
  - /Users/mpstaton/code/lossless-monorepo/image-gin/src/services/recraftImageService.ts
  - /Users/mpstaton/code/lossless-monorepo/image-gin/src/modals/CurrentFileModal.ts
external_reference:
  - /Users/mpstaton/code/lossless-monorepo/astro-knots/sites/fullstack-vc/src/utils/api-connectors/ideogram.ts
from: image-gin
from_path: blueprints/Add-New-Image-API-to-Providers.md
---
<!-- Rolled up from image-gin/context-v/blueprints/Add-New-Image-API-to-Providers.md. Edit at the source, not here. Re-run `pnpm rollup:sync` to refresh. -->

# Blueprint — Add a New Image-Generation Provider

This blueprint describes how to add a **new image-generation provider** to image-gin alongside the existing Recraft integration. It uses **Ideogram v3** as the worked example. The same shape applies to any future generation API (e.g., Flux, SDXL, Imagen).

> Image search providers (e.g., Magnific) follow a similar but distinct shape — see `src/services/magnificService.ts` and `src/modals/MagnificModal.ts`. This blueprint focuses on **generation**, which is closer in shape to Recraft.

---

## Pre-existing state (already in the repo)

The user has already done the credential prep:

- `IDEOGRAM_API_KEY` added to project `.env`
- `data.json` extended with:
  ```json
  "ideogram": {
    "enabled": true,
    "apiKey": "<key>"
  }
  ```

> **Note**: `data.json` is the *runtime-loaded* settings file. The `DEFAULT_SETTINGS` constant in `src/settings/settings.ts` is the *source of truth* for shape — `loadSettings()` shallow-merges loaded data over defaults. Any field present at runtime must also exist in `DEFAULT_SETTINGS`, otherwise it has no type and no UI.

> **Recraft is not being deprecated.** Ideogram is purely additive. The two providers coexist with separate commands, separate modals, and separate settings sections. Nothing in the Recraft path is touched by this work.

---

## Evaluation — how Recraft uses the frontmatter today

Tracing the Recraft path end-to-end (`CurrentFileModal.ts` + `recraftImageService.ts` + `settings.ts`):

| Concern                          | Where it lives                                                     | Per-file? |
| -------------------------------- | ------------------------------------------------------------------ | --------- |
| Subject-matter prompt            | Frontmatter key `image_prompt` (configurable via `imagePromptKey`) | ✅        |
| Visual style (broad)             | Settings — `style.presetStyle.base` (e.g. `digital_illustration`)  | ❌        |
| Visual style (narrow)            | Settings — `style.presetStyle.substyle` (e.g. `graphic_intensity`) | ❌        |
| Brand style (Recraft custom)     | Settings — `style.customStyleId` *or* first entry of `imageStylesJSON` | ❌    |
| Sizes to render                  | Modal toggles (selected from `settings.imageSizes` presets)        | per-call  |
| Resulting image path             | Written back to frontmatter under each `ImageSize.yamlKey` (e.g. `banner_image`) | ✅ |
| Updated prompt                   | Written back to frontmatter under `image_prompt`                   | ✅        |

**Net characterization**: Recraft's brand style is held *entirely in settings* — typically as a Recraft `style_id` that the user trained on Recraft's own platform. The frontmatter contributes one piece of information: the per-file subject-matter prompt. Recraft's "brand voice" lives server-side, identified by a UUID.

This works because Recraft's API treats style as a first-class server-side parameter (you train styles in their UI, reference them by ID at generation time).

---

## How Ideogram differs — and what that means for the frontmatter/settings split

Ideogram has no concept of a server-side custom style. Its style controls are:

- `style_type` — one of five enums (`AUTO | GENERAL | REALISTIC | DESIGN | FICTION`) — coarse
- `magic_prompt` — `AUTO | ON | OFF` — lets Ideogram rewrite your prompt
- `negative_prompt` — free-text exclusions
- `prompt` — the actual creative direction, which carries **all** brand/style/theme information not captured by the enums above

This shifts the burden: with Recraft, "make it look like our brand" is a `style_id`. With Ideogram, **"make it look like our brand" is prompt engineering** — the user (or the plugin) must wrap the per-file subject-matter prompt with brand-style template text. The astro-knots reference comments this directly:

```ts
/** Required. The text prompt. Wrap with your brand style template before calling. */
prompt: string;
```

So the design question for Ideogram is: **where does that wrapping template live, and what gets to override what per-file?**

### Proposed split

| Concern                              | Belongs in     | Key / Field                                | Rationale |
| ------------------------------------ | -------------- | ------------------------------------------ | --------- |
| Subject matter (the actual idea)     | **Frontmatter**| `image_prompt` (reuse Recraft's key)       | Same per-file concept Recraft already uses; sharing the key means switching providers on the same note doesn't require re-typing the prompt. |
| Brand prompt template (prefix/suffix)| **Settings**   | `ideogram.brandTemplate.{prefix,suffix}`   | Brand-wide constant. `{prompt}` placeholder gets substituted with the frontmatter prompt. |
| Default `style_type`                 | **Settings**   | `ideogram.defaults.styleType`              | Brand-wide constant; per-file override possible (see below). |
| Default `rendering_speed`            | **Settings**   | `ideogram.defaults.renderingSpeed`         | Cost/quality tradeoff is a brand-wide policy, not a per-file decision. |
| Default `magic_prompt`               | **Settings**   | `ideogram.defaults.magicPrompt`            | Whether Ideogram is allowed to rewrite prompts is a brand voice decision. |
| Brand-wide negative prompt           | **Settings**   | `ideogram.brandTemplate.baseNegativePrompt`| "no text, no watermarks, no signatures" applies everywhere. |
| Per-file style override              | **Frontmatter**| `image_style_type` *(optional)*            | One essay needs `REALISTIC` even though brand default is `DESIGN`. Read but never written by the plugin. |
| Per-file extra negative prompt       | **Frontmatter**| `image_negative_prompt` *(optional)*       | Appended to the brand-wide base. |
| Per-file seed (reproducibility)      | **Frontmatter**| `image_seed` *(optional)*                  | Lets a note pin a successful generation. |
| Sizes / aspect ratio                 | **Modal**      | toggles (existing `ImageSize` presets)     | Per-call decision; no change from Recraft pattern. |
| Layerize-text post-processing        | **Settings + per-call toggle** | `ideogram.layerizeText` default; modal toggle override | Brand-wide policy with one-off opt-out. |

### Final-prompt assembly (service-layer responsibility)

```
finalPrompt = brandTemplate.prefix
            + (frontmatter.image_prompt or modal.imagePrompt)
            + brandTemplate.suffix

negativePrompt = brandTemplate.baseNegativePrompt
              + (frontmatter.image_negative_prompt ?? '')

styleType = frontmatter.image_style_type ?? settings.ideogram.defaults.styleType
```

If the prefix/suffix contain a literal `{prompt}` token, prefer placeholder-substitution over concatenation — gives the user explicit control over exactly where the subject matter slots into the template (e.g. "Editorial illustration in our house style: **{prompt}**, on a soft pastel background, viewed from above").

### What deliberately does **not** go in the frontmatter

- **API key.** Settings only.
- **`num_images`.** Always 1 in this plugin (one image per size). If the user wants variants, they re-run with a different seed.
- **`magic_prompt`** at per-file level. Brand voice consistency would be undermined by per-file toggles. Settings only.
- **The brand template itself.** It's a brand-wide constant. Per-file overrides of the template would defeat its purpose.

This split is the central design decision in the Ideogram integration — it determines what the user has to think about at write-time vs. what they configure once.

---

## Constraints inherited from this repo (re-read before coding)

These are codified in `CLAUDE.md` and apply uniformly to every provider:

1. **No new dependencies.** Do not `pnpm add` anything to support a new provider. Propose first if absolutely needed.
2. **HTTP via Obsidian `requestUrl` — never `fetch`.** Obsidian's environment lacks browser CORS/CSP semantics and `FormData` is unavailable. The Ideogram reference (astro-knots) is Node 22 build-time code and uses `fetch` + `FormData` freely; **that code is a contract reference, not a paste source**.
3. **Multipart bodies are hand-built.** See `src/services/imagekitService.ts` for the established pattern (boundary string + manually concatenated `Uint8Array` parts). Ideogram's `/v1/ideogram-v3/generate` and `/layerize-text` are both multipart endpoints — they will need this treatment.
4. **TypeScript is very strict.** `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `useUnknownInCatchVariables`. Prefer `null` over `undefined` for optional state. `tsc -noEmit` runs before every `pnpm build` and will fail the build on any of these.
5. **No YAML library.** If you need to read/write YAML keys, use `app.fileManager.processFrontMatter` (Obsidian's own emitter) — see `CurrentFileModal.updateFrontmatter`. For ad-hoc parsing, extend `src/utils/yamlFrontmatter.ts`; do not add `js-yaml`.
6. **Logger, not `console.*`.** Use `logger` from `src/utils/logger`. The plugin pipes it to `.obsidian/plugins/image-gin-plugin/log.json`.
7. **Settings are one flat `ImageGinSettings` object.** All provider-specific settings live in a nested sub-object (`recraft*` fields are flat for legacy reasons; **new providers should be nested**, like `imageKit`, `magnific`, `imageCache`).
8. **`isDesktopOnly: true`** — Node `Buffer`, `fs`, `require()` are available. The Recraft service already uses `Buffer.from(...)` and `require('fs')` for absolute-path saves; Ideogram can do the same.
9. **`main.ts` stays thin.** Three things only: load settings, register the settings tab, register commands. All real logic in `src/services/` and `src/modals/`.

---

## Architecture mapping: Ideogram reference → image-gin layers

The astro-knots Ideogram connector (`api-connectors/ideogram.ts`) is a single file that mixes API I/O, error type, and a convenience pipeline. In image-gin's layered architecture this splits across three files:

| External reference (one file)            | image-gin equivalent                                | Layer        |
| ---------------------------------------- | --------------------------------------------------- | ------------ |
| `requireKey()`, `IdeogramApiError`       | `IdeogramService` constructor + thrown `Error`      | service      |
| `generate()`, `layerizeText()`           | `IdeogramService.generateImage`, `.layerizeText`    | service      |
| `downloadEphemeralImage()`               | inline in service (use `requestUrl`, get `arrayBuffer`) | service  |
| `generateAndLayerize()` pipeline         | composed in modal callback (or service helper)      | service/modal|
| Type exports (`AspectRatio`, etc.)       | re-exported from service file                       | service      |

Note the body-format mismatch:

- **Reference uses `FormData`** for both endpoints → won't work in Obsidian.
- **Replacement**: hand-built multipart body. `/generate` is text-only fields, so a JSON-equivalent path is *possible* — but the Ideogram API spec is multipart, so build multipart. Reuse the boundary helper from `imagekitService.ts`. Lift it into `src/utils/multipart.ts` if a second caller now exists.

---

## Step-by-step plan

### Phase 1 — Settings shape

**File**: `src/settings/settings.ts`

1. Add Ideogram type unions and a nested settings interface that reflects the frontmatter/settings split decided above:

   ```ts
   export type IdeogramRenderingSpeed = 'FLASH' | 'TURBO' | 'DEFAULT' | 'QUALITY';
   export type IdeogramStyleType = 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';
   export type IdeogramMagicPrompt = 'AUTO' | 'ON' | 'OFF';

   export interface IdeogramBrandTemplate {
       /** Inserted before the per-file prompt. May contain `{prompt}` to control insertion point. */
       prefix: string;
       /** Inserted after the per-file prompt (ignored if `prefix` contains `{prompt}`). */
       suffix: string;
       /** Always-applied negative prompt; per-file `image_negative_prompt` is appended. */
       baseNegativePrompt: string;
   }

   export interface IdeogramDefaults {
       renderingSpeed: IdeogramRenderingSpeed;
       styleType: IdeogramStyleType;
       magicPrompt: IdeogramMagicPrompt;
   }

   export interface IdeogramSettings {
       enabled: boolean;
       apiKey: string;
       brandTemplate: IdeogramBrandTemplate;
       defaults: IdeogramDefaults;
       /** Run Layerize Text after generate, by default. Modal can override per-call. */
       layerizeText: boolean;
   }
   ```

2. Add `ideogram: IdeogramSettings` to `ImageGinSettings`.

3. Extend `DEFAULT_SETTINGS` with sensible defaults:

   ```ts
   ideogram: {
       enabled: false,
       apiKey: '',
       brandTemplate: {
           prefix: '',
           suffix: '',
           baseNegativePrompt: 'no text, no watermarks, no signatures, no captions',
       },
       defaults: {
           renderingSpeed: 'DEFAULT',
           styleType: 'GENERAL',
           magicPrompt: 'AUTO',
       },
       layerizeText: false,
   }
   ```

   The user's existing `data.json` entry (`{ enabled: true, apiKey: '<key>' }`) shallow-merges over this — the nested defaults fill in. **Caveat**: `loadSettings()` does a one-level spread (`{ ...DEFAULT_SETTINGS, ...loadedSettings }`), so a partial `ideogram: { enabled, apiKey }` in `data.json` will *overwrite* the default `ideogram` object wholesale, dropping `brandTemplate`/`defaults`/`layerizeText`. Either deep-merge in `loadSettings()` (preferred — generalize it for all nested provider blocks) or backfill missing nested keys explicitly during the Ideogram-specific load path. Pick deep-merge; it's the right fix and benefits Magnific and ImageKit too.

4. Add an "Ideogram Image Generation" section to `ImageGinSettingTab.display()`. Layout (top-to-bottom):

   - Toggle: "Enable Ideogram Integration" (gates everything below)
   - Text: API Key
   - **Brand Template** subsection:
     - Multi-line textarea: "Prompt prefix" (with helper text: "Use `{prompt}` to control where the per-file prompt is inserted; otherwise it's appended.")
     - Multi-line textarea: "Prompt suffix"
     - Multi-line textarea: "Base negative prompt"
   - **Defaults** subsection:
     - Dropdown: Rendering speed (`FLASH | TURBO | DEFAULT | QUALITY`)
     - Dropdown: Style type (`AUTO | GENERAL | REALISTIC | DESIGN | FICTION`)
     - Dropdown: Magic prompt (`AUTO | ON | OFF`)
   - Toggle: "Layerize text after generate" (default off)

   Place this section under the Recraft block, before ImageKit (mirrors the order of provider modality: generate → CDN-upload → search).

> **Why the gating toggle** even though the user has `enabled: true`: settings persistence treats `enabled` as a soft switch users may flip from the UI without removing the key. The command callback should refuse to open the modal when `!settings.ideogram.enabled` (see Phase 4 — same pattern as `MagnificModal`).

### Phase 1.5 — Frontmatter contract

The Ideogram modal reads the following frontmatter keys from the active file:

| Key                      | Required | Type     | Effect                                                       |
| ------------------------ | -------- | -------- | ------------------------------------------------------------ |
| `image_prompt`           | yes      | string   | Subject-matter prompt. Reused from Recraft (same setting key: `imagePromptKey`). |
| `image_negative_prompt`  | no       | string   | Appended to `brandTemplate.baseNegativePrompt`.              |
| `image_style_type`       | no       | enum     | Overrides `defaults.styleType`. Validated against the enum; invalid values fall back to default with a `Notice`. |
| `image_seed`             | no       | number   | Pins the seed for reproducibility.                           |

The plugin **writes** only:

- `image_prompt` (when the user edits it in the modal and toggles "Write prompt to frontmatter" on — same as Recraft)
- The image path keys (e.g. `banner_image`) — same as Recraft

It does **not** write `image_negative_prompt`, `image_style_type`, or `image_seed`. Those are read-only inputs the user manages by hand. (Writing them back would silently re-render the modal's default checkboxes as "user-set," which is a bad UX trap.)

> Reuse the existing `imagePromptKey` setting (don't introduce a separate `ideogramPromptKey`). The whole point of sharing the key is that switching providers on a note doesn't require re-typing.

### Phase 2 — Service

**New file**: `src/services/ideogramService.ts`

Mirror `RecraftImageService` (≈ 250 lines) — same constructor signature `(settings: ImageGinSettings, vault: Vault)`, same `saveImage` / `getImagePath` methods (lift these to a small shared util only if a *third* provider arrives — premature abstraction warning).

Method surface:

```ts
export class IdeogramService {
    constructor(settings: ImageGinSettings, vault: Vault);

    async generateImage(opts: IdeogramGenerateOptions): Promise<GeneratedImage>;
    async layerizeText(image: ArrayBuffer, opts?: LayerizeOptions): Promise<GeneratedImage>;
    async generateAndLayerize(opts: IdeogramGenerateOptions): Promise<GeneratedImage>;

    async saveImage(image: GeneratedImage, filePath: string): Promise<TFile | null>;
    getImagePath(baseName: string, width: number, height: number, timestamp: number): string;
}
```

Reuse the `GeneratedImage` interface from `recraftImageService.ts` — re-export it from a shared place (`src/services/types.ts`) when adding the second provider, rather than duplicating. Keep the *change footprint* small: move the type, update Recraft's import, done. **Do not refactor Recraft's logic during this work.**

Implementation notes specific to Ideogram:

- **Endpoint constants**:
  - `https://api.ideogram.ai/v1/ideogram-v3/generate`
  - `https://api.ideogram.ai/v1/ideogram-v3/layerize-text`
- **Auth header**: `Api-Key: <key>` (note: capital `A`, not `Authorization: Bearer`).
- **Multipart body**: hand-build per `imagekitService.ts`. Fields for `/generate`: `prompt`, `aspect_ratio`, `rendering_speed`, `style_type`, optional `magic_prompt`, `negative_prompt`, `seed`, `num_images`. Field for `/layerize-text`: `image` (file part with `Content-Type: image/png`), optional `prompt`, `seed`.
- **Aspect ratio vs. width/height**: Ideogram uses string aspect ratios (`1x1`, `16x9`, `2x3`, …) instead of explicit pixel sizes. Map the existing `ImageSize` presets to the closest Ideogram ratio. Add a small lookup helper inside the service:

  ```ts
  function pickAspectRatio(width: number, height: number): IdeogramAspectRatio {
      // closest-match by ratio; fallback to '1x1'
  }
  ```

  Document the lookup behavior — image-gin users define sizes in pixels, and Ideogram will not render arbitrary pixel sizes. This is a real semantic gap; expose the resolved aspect ratio in the modal preview if practical.

- **Response handling**: Ideogram returns `{ data: [{ url, prompt, resolution, seed, ... }] }`. Download `data[0].url` immediately (URLs are ephemeral S3 — same caveat as the reference). Use `requestUrl({ url, method: 'GET' })` then `Buffer.from(response.arrayBuffer).toString('base64')` — exactly the pattern in `recraftImageService.generateImage:158-170`.

- **Errors**: throw plain `Error` with the endpoint, status, and body. Do **not** create a custom `IdeogramApiError` class unless the modal needs to branch on it (the reference defines one for build-time CI logging — image-gin runs interactively and uses `Notice` + `logger`).

### Phase 3 — Modal

**New file**: `src/modals/IdeogramModal.ts`

Reuse the `CurrentFileModal` shape — copy it, swap `RecraftImageService` for `IdeogramService`, replace the style section with Ideogram-specific UI. **Do not add a provider selector to `CurrentFileModal`**; keeping the two modals separate validates the integration end-to-end without churning the Recraft UI. A unified-provider modal can be considered later, after the user has lived with both.

Modal sections (top-to-bottom):

1. **Image Prompt** — same textarea as Recraft, pre-filled from `image_prompt` frontmatter. (Subject matter only — the brand template is invisible here; the user is editing the slot, not the wrapping.)
2. **Resolved Prompt Preview** *(new)* — read-only display showing the **fully assembled** prompt (`prefix + image_prompt + suffix`, with `{prompt}` substitution). Critical because the brand template is hidden in settings; without a preview, the user has no idea what's actually being sent. Update live as they edit the textarea.
3. **Image Sizes** — same toggles as Recraft.
4. **Per-call Overrides** *(collapsible, defaults from settings)*:
   - Style type dropdown — initial value comes from `frontmatter.image_style_type ?? settings.defaults.styleType`
   - Rendering speed dropdown — initial value from `settings.defaults.renderingSpeed`
   - Magic prompt dropdown — initial value from `settings.defaults.magicPrompt`
   - Negative prompt textarea — initial value is the **assembled** negative prompt (`base + frontmatter.image_negative_prompt`); user can further append/edit per-call
   - Toggle: "Layerize text after generate" — initial value from `settings.layerizeText`
5. **Frontmatter Options** — "Write prompt to frontmatter" toggle (same as Recraft). Writes only `image_prompt` and the image path keys; never the override fields.
6. **Generate Button**.

Modal-level state holds the *resolved* (post-override) values. The service receives only resolved values — it doesn't re-read settings or frontmatter. This keeps the service stateless w.r.t. UI choices and makes per-call overrides trivially correct.

Frontmatter writes use `this.app.fileManager.processFrontMatter` — same as Recraft path. The image path key (`banner_image`, etc.) is already provider-agnostic; no change needed to `ImageSize.yamlKey`.

### Phase 4 — Command registration

**File**: `main.ts`

Add a fourth (or fifth) command, gated on `enabled`, mirroring the Magnific command at `main.ts:65-75`:

```ts
this.addCommand({
    id: 'generate-images-ideogram',
    name: 'Generate Images (Ideogram)',
    callback: () => {
        if (this.settings.ideogram.enabled) {
            new IdeogramModal(this.app, this).open();
        } else {
            new Notice('Ideogram integration is not enabled. Enable it in settings.');
        }
    }
});
```

Keep `main.ts` thin — no logic beyond settings/setting-tab/commands.

### Phase 5 — Verify

1. `pnpm build` — must pass `tsc -noEmit` with zero errors. The strict-TS settings will catch most integration mistakes (unused imports, `any` leaks, missing optional-property handling). If the build fails on `noUncheckedIndexedAccess` for `data[0]`, that is a real bug — guard it the way `RecraftImageService.generateImage:150` does.
2. Live-test in a vault. Symlink the repo into `<vault>/.obsidian/plugins/`, restart Obsidian, run the new command on a file with an `image_prompt` frontmatter key.
3. Verify: image is downloaded, base64-decoded, written to `imageOutputFolder`, and the `banner_image` (or matching `yamlKey`) frontmatter is updated. Check `.obsidian/plugins/image-gin-plugin/log.json` for the request/response trace.

---

## Out of scope for this blueprint

- **Refactoring Recraft to share more code with Ideogram.** Two providers is not enough signal to abstract. Wait for the third.
- **Adding `layerize-text` as a standalone command.** Phase 1 ships it as a *post-generate* toggle on the Ideogram modal. A standalone command on top of an arbitrary local image is a separate feature.
- **Migration of legacy flat `recraft*` settings into `recraft: { ... }`.** Out of scope; would break the existing `data.json` shape and require a migration shim like the `freepik → magnific` one in `main.ts:18-22`.
- **Provider-agnostic command (`Generate Images`) with internal routing.** Considered as Phase 3(b) above; deferred.

---

## Files touched (summary)

**New:**
- `src/services/ideogramService.ts`
- `src/modals/IdeogramModal.ts`

**Modified:**
- `src/settings/settings.ts` — add `IdeogramSettings`, extend `ImageGinSettings`, extend `DEFAULT_SETTINGS`, add settings-tab UI block
- `main.ts` — register new command
- `src/services/types.ts` *(only if extracting `GeneratedImage`)* — new shared types module

**Reference, not modified:**
- `src/services/recraftImageService.ts` — pattern source
- `src/services/imagekitService.ts` — multipart-body pattern source
- `src/modals/CurrentFileModal.ts` — modal-shape source
- `/Users/mpstaton/code/lossless-monorepo/astro-knots/sites/fullstack-vc/src/utils/api-connectors/ideogram.ts` — Ideogram API contract reference (request/response shapes, field names, parameter enums). **Do not paste — Obsidian environment is incompatible with `fetch`/`FormData`.**
