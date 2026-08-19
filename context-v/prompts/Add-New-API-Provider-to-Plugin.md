---
title: "Add a New API Provider to a Metadata-Fetching Plugin"
lede: "Reusable prompt for wiring a new third-party metadata API (e.g. Microlink, Jina Reader, OpenGraph.io) into an Obsidian plugin like Metafetch as an additional fetcher, without breaking the existing flows."
date_created: 2026-05-06
date_modified: 2026-05-06
status: Authoritative
category: Prompt
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: Metafetch and any sibling plugin that fetches metadata from URLs
tags:
  - Prompt
  - API-Integrations
  - Metafetch
  - cite-wide
site_uuid: 00064195-421d-49de-bdca-4a3b898f13da
hex_code: w2bi3v
date_authored_initial_draft: 2026-05-06
date_authored_current_draft: 2026-05-06
publish: true
---

## When to use this prompt

Use when adding a new third-party API provider to a metadata-fetching Obsidian plugin (Metafetch is the running example). The intent is to add the provider as **an additional fetcher**, side-by-side with existing ones (e.g. OpenGraph.io, Direct Fetch from Script), not as a replacement — so users can pick per-command.

If the new provider is meant to *replace* the default, that's a different change and should be discussed before any code lands.

## Inputs to gather before writing code

For the new provider, capture each of these before touching the plugin:

1. **Base endpoint URL** — full URL with no query string.
2. **HTTP method** — GET vs POST.
3. **Query parameter / body shape for the target URL** — exactly what name and where (`?url=...`, JSON body, etc.).
4. **Authentication**
   - Header name and value format (e.g. `x-api-key: <KEY>`, `Authorization: Bearer <KEY>`).
   - Whether the free tier works *anonymously* (no key) — important: if yes, the plugin can default to keyless and let the user paste a key in settings only when they hit limits.
5. **Free tier rate limits** — exact numbers (per day / per minute) and the per-IP-vs-per-key scope.
6. **Rate-limit response headers** — names (`x-rate-limit-remaining` etc.) and the status code on exceedance (usually 429).
7. **Response shape** — full JSON schema, especially:
   - Where title, description, image, favicon, site name, author, publication date live.
   - Whether image and favicon are *strings* or *objects* (`{ url, width, height, type }`).
   - Whether URLs in the response are absolute or relative.
8. **Official SDK** — npm package name if one exists, plus a one-line usage example.
9. **Signup / dashboard URL** — for the user to manage their key.
10. **Any official curl example** — copy verbatim into the doc; serves as the canonical contract.

## Decision: SDK vs. direct GET

Default recommendation: **skip the SDK** for these plugins. Reasons:

- The existing pattern (`directFetchService.ts`) uses Obsidian's `requestUrl`, which is CORS-free and has no peer-dep friction. Wrapping a single GET costs ~20 lines.
- A runtime dep is forever. SDKs drift, get major-bumped, get deprecated. A 20-line fetcher does not.
- We rarely need the SDK's polish (auto-retry, error normalization) at the scale of an Obsidian plugin (single-digit-to-double-digit reqs/day per user).

Install the SDK only if **all** of these are true:
- The auth surface is complex (OAuth, request signing, multipart streaming).
- The response is non-trivial to deserialize (streaming, binary, paginated).
- The vendor explicitly warns against rolling your own.

If installing: prefer `pnpm add` (matches the workspace fence convention — see `Pseudomonorepo-Settings.md`).

## Decision: where this fetcher slots into the plugin

Each provider should land as **a new command**, not a swap. The user picks per invocation. Concretely, in `main.ts`:

```
this.addCommand({
  id: 'fetch-via-<provider>',
  name: 'Fetch via <Provider>',
  editorCallback: (_editor) => { void this.runFetchVia<Provider>(); }
});
```

The fetcher itself goes in `src/services/<provider>FetchService.ts`, exporting a single `fetch<Provider>OpenGraph(url): Promise<OpenGraphData>` function plus a typed error class.

## Steps

1. **Read** `src/services/directFetchService.ts` and `src/services/openGraphService.ts` first — they are the templates. Match their error-class shape and return type.
2. **Create the service** `src/services/<provider>FetchService.ts`:
   - Use Obsidian's `requestUrl` (or the SDK if the SDK decision said yes).
   - Map the provider's response into `OpenGraphData` from `src/types/open-graph-service.d.ts`. Resolve relative URLs against the page URL where the provider returns relatives.
   - Throw a typed `<Provider>FetchError` with a `code` for HTTP / network / empty / auth failures.
3. **Wire the command** in `main.ts`:
   - Add the command registration.
   - Add a private `runFetchVia<Provider>()` method that mirrors `runDirectFetchScript()`: extract `url` from active file's frontmatter, call the service, write fields using settings field-name mappings, show pending/success/error Notices, clear stale `og_error*` fields on success.
4. **Settings (only if the provider needs config)**:
   - If the free tier is keyless, **do not add settings on day one**. Ship without.
   - If a key is needed, add a single optional `<provider>ApiKey` field to `MetafetchSettings` in `src/settings/settings.ts` and a textbox in the settings tab. Default empty string.
5. **Verify**: `pnpm build` clean (TS strict + esbuild). Hit a known URL with the new command in Obsidian. Confirm fields land in YAML quoted (per the `formatFrontmatter` convention).
6. **Document**: append a row to the README's command list. If the provider has a non-obvious quirk (e.g. image-as-object, weird date format), capture it in `context-v/explorations/Using-APIs-to-Ingest-More-Data.md` so the next provider migration has the prior art.

## Field-mapping conventions

Map provider-specific fields to the `OpenGraphData` interface from `src/types/open-graph-service.d.ts`:

| Our field          | Common provider names                                |
| ------------------ | ---------------------------------------------------- |
| `title`            | `title`, `og:title`, `twitter:title`                 |
| `description`      | `description`, `og:description`, `meta description`  |
| `image`            | `image`, `og:image`, `twitter:image`, `image.url`    |
| `favicon`          | `favicon`, `logo`, `logo.url`, `<link rel="icon">`   |
| `site_name`        | `site_name`, `publisher`, `og:site_name`             |
| `type`             | `og:type`, `kind`                                    |
| `url`              | the resolved final URL (after redirects, if known)   |
| `date` (optional)  | publication date if the provider returns one         |

**Recurring gotchas:**

- **Image / favicon as object.** Some providers return `{ url, width, height, type }`. Always `data.image?.url`, never `data.image`.
- **Relative URLs.** Some providers return `og:image` as `/path/to.jpg`. Resolve with `new URL(rel, baseUrl).href`.
- **HTML entities.** If extracting from raw HTML (`Direct Fetch` style), decode `&amp;`, `&quot;`, `&#39;` etc.
- **YAML quoting.** All string values must be double-quoted in frontmatter (per the `formatFrontmatter` convention) — URLs commonly contain `?`, `=`, `+`, `#` which break unquoted YAML.

## Provider additions log

Append a dated section here each time this prompt is used to add a new provider, so the next person has prior art instead of re-deriving the inputs. Keep entries terse — endpoint, auth, free tier, response shape, SDK decision, field mapping, curl contract.

### 2026-05-06 Add Microlink API to Metafetch

- **Endpoint**: `GET https://api.microlink.io?url=<encoded-url>`
- **Auth**: `x-api-key: <KEY>` header — **optional**; the free tier works without a key.
- **Free tier**: 50 reqs/day per IP (soft limit). Returns `429` when exceeded.
- **Rate-limit headers**: `x-rate-limit-limit`, `x-rate-limit-remaining`, `x-rate-limit-reset`.
- **Response shape**:
  ```
  {
    status: "success",
    data: {
      title, description, author, publisher,
      image: { url, type, width, height },
      logo:  { url, type, width, height },
      url, date, lang
    }
  }
  ```
- **SDK**: `@microlink/mql` exists. **Skipped** per the SDK decision rule (single GET, optional header, no auth complexity).
- **Mapping**:
  - `data.image?.url` → `image`
  - `data.logo?.url` → `favicon`
  - `data.publisher` → `site_name`
  - `data.date` → `date` (real publication date — new field worth capturing; current shape already has optional `date`)
  - Everything else: 1:1.
- **Curl contract**:
  ```bash
  curl -G "https://api.microlink.io" -d "url=https://example.com"
  ```

## Acceptance criteria

A new provider integration is "done" when:

1. `pnpm build` is clean.
2. The new `Fetch via <Provider>` command appears in the Obsidian command palette.
3. Running the command on a file with a `url` frontmatter field populates `og_title`, `og_description`, `og_image`, `og_favicon`, `og_last_fetch` correctly, with all string values double-quoted.
4. The existing OpenGraph.io and Direct Fetch commands still work (no regression).
5. Error paths (network failure, 429, 4xx, empty body) surface a Notice and do not corrupt the file's frontmatter.
6. If the provider requires a key, the settings tab has a field for it and the command surfaces a clear error when the field is empty.
