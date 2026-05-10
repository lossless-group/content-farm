# Source of truth: human-editable prose for the llms.txt endpoints

These markdown files are read at build time by the endpoints in
`splash/src/pages/llms.txt.ts` and `splash/src/pages/llms-full.txt.ts`. The
endpoints are deliberately dumb — they do token substitution and append the
dynamic content. **All voice, framing, and structural prose lives here, not
in TypeScript.**

If you want to tweak the wording on `/llms.txt` or `/llms-full.txt`, edit
the corresponding `.md` file in this directory and rebuild. No code changes.

## Files

- `llms.md` — template for `/llms.txt` (the link index).
- `llms-full.md` — template for `/llms-full.txt` (the concatenated full content).

## Tokens (substituted at build time)

| Token | Replaced with |
|---|---|
| `{{SITE_NAME}}` | `SITE_NAME` from `splash/src/lib/seo.ts` (currently `content-farm`) |
| `{{PLUGIN_COUNT}}` | Number of entries in the `plugin-highlights` collection |
| `{{CHANGELOG_COUNT}}` | Number of published entries in the `changelog` collection (`publish !== false`) |
| `{{CONTEXTV_COUNT}}` | Number of published entries in the `context-v` collection (`publish !== false`) |
| `{{REPO_COUNT}}` | Number of distinct `from` provenance values across published changelog + context-v entries |
| `{{LLMS_FULL_URL}}` | Absolute URL to `/llms-full.txt` |
| `{{LLMS_INDEX_URL}}` | Absolute URL to `/llms.txt` |
| `{{PLUGIN_INDEX}}` | Markdown link list of plugins (sorted by `order`, then alpha by id), used in `llms.md` |
| `{{CHANGELOG_INDEX}}` | Markdown link list of changelog entries grouped by `from`, used in `llms.md` |
| `{{CONTEXTV_INDEX}}` | Markdown link list of context-v entries grouped by `from`, used in `llms.md` |
| `{{CORPUS_BODIES}}` | Concatenated raw bodies (plugin-highlights + changelog + context-v), each preceded by a metadata header — used in `llms-full.md` |

Tokens are simple `{{NAME}}` placeholders — no Mustache, no Handlebars, no
templating engine. If a token is missing in the markdown, the endpoint emits
the file without it; if the markdown references a token the endpoint doesn't
register, the placeholder passes through unchanged so the typo is visible in
the output. If you add a new dynamic value, register it in the endpoint's
substitution map and document it here.

## Site-specific notes

- content-farm splashes a curated **plugin catalog**. The `plugin-highlights`
  collection drives both the landing-page gallery and the `## Plugins`
  section of `/llms.txt`.
- Provenance for rolled-up content uses the `from` field (a plugin slug, or
  `'content-farm'` for parent-authored entries). This site does not use
  `source_repo_slug`.
- The publish predicate matches the page templates: `data.publish !== false`.
  The `unionLoader` already drops `publish: false` entries at load time, so
  this filter is defensive — keep it in lockstep with `[...slug].astro`.

## Why a separate directory and not `src/lib/` or `src/content/`?

`src/lib/` is for code (TypeScript). `src/content/` is for Astro content
collections, which expect specific schemas and Astro-managed loaders. These
files are neither — they're prose templates that the build step reads as raw
strings via Vite's `?raw` import. Giving them their own directory keeps the
purpose obvious and makes the source-of-truth boundary easy to find.
