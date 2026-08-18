---
title: Per-Directory Profile Templates — v0.1 Spike
date_created: 2026-05-09
type: spec
status: spike
related:
  - "[[Moving-Beyond-Simple-API-Calls]]"
  - "[[Textgenerator-Analysis]]"
site_uuid: e1131a1f-0704-4855-89bb-80ec0013d923
hex_code: a6n1g6
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
lede: "One Perplexity call per file, four template zones, and `***` as the scratch terminator — aborts rather than merge if the body has prose."
summary: "The v0.1 spike spec — the narrow first slice of Moving-Beyond-Simple-API-Calls, with everything else in that exploration explicitly deferred. Defines the template file's four zones, the zone-to-request map, the two interpolation variables, the single run command and its flow, output write logic, settings, execution pseudocode, and seven acceptance criteria. Also carries v0.2 feedback that supersedes parts of the spec (stream instead of buffer-then-write; wrap reasoning-model think blocks in a fenced block) and five open questions intended for sign-off before implementation."
---

# Per-Directory Profile Templates — v0.1 Spike

## Goal

Solve the immediate workload: ~1600 nearly-empty profile files in `Tooling/` (and similar shapes in `Sources/`, `Vocabulary/`) need a **consistent outline and a populated body**. The user picks a template, runs it against a target file, and the file's body gets filled with a structured Perplexity Deep Research response that follows the template's heading skeleton.

This spec is the **narrow first slice** of the broader design in [[Moving-Beyond-Simple-API-Calls]]. Everything in that exploration beyond what's specified here is explicitly deferred — see *Out of scope* below.

The win condition: a user can pick `tooling-profile` from a palette while viewing `Tooling/Agentic AI/Agentic Workspaces/Mastra.md`, and within ~30 seconds the file's body contains a coherent, citation-bearing profile that follows the template's heading skeleton — and the same template can be invoked to apply to other files in the same folder that produces an outline-consistent result.

## Out of scope (v0.1)

Explicit defer list. Each item is captured in [[Moving-Beyond-Simple-API-Calls]] and will land in later iterations.

- `cf` codefence invocation inside arbitrary user notes (ad-hoc generation, selection-surface verbs).
- Multi-call templates / per-section verbs. v0.1 = **one Perplexity call per target file**.
- Per-section re-run, section-aware writing, boundary-aware writer.
- Citation/backlink preservation as a deterministic post-filter (target files are empty; nothing to preserve yet).
- Output modes beyond "write to empty body / abort if body present."
- Image generation, screenshots, SVG, Mermaid, JSONCanvas.
- Multi-provider; **Perplexity only** for v0.1.
- Auto-template-resolution by directory mirroring under the templates root.
- Folder-batch command, concurrency, progress UI, resume-on-failure.
- Verb registry as a separate concept from templates.

## Template anatomy

Templates live as visible markdown files in a configurable directory. **Default: `zz-cf-lib/templates/`** (`zz-` sorts last in Obsidian's file explorer; `cf-lib` makes purpose obvious; user-overridable in plugin settings).

A template file has **four zones in linear order**:

1. **Frontmatter** — metadata (title, glob, description).
2. **Pre-`cft` explainer prose** — anything between frontmatter and the `cft` block. Free-form; the runtime ignores it. Useful for documenting when to use the template, tuning notes, examples.
3. **Exactly one `cft` block** — machine-readable config + system prompt. **Config only — no prompt body inside the fence.** YAML key/values, including a `system:` field for the system prompt.
4. **Post-`cft` skeleton** — everything from the line after the `cft` block to the end of the file. This is the **user prompt**: heading skeleton with per-section bullet instructions, sent verbatim to the model with `{{title}}` and `{{frontmatter}}` interpolated.

The skeleton lives **outside** the `cft` block specifically so it renders as native markdown in Obsidian (real headings fold, bullets format, wikilinks parse). What you see in preview is what the model sees as the user prompt.

Per the codefence-syntax invariants in [[Moving-Beyond-Simple-API-Calls]] (D0): opening fence carries the language token, body holds all internal structure (here, YAML only), closing fence is exactly three backticks.

### Why one `cft` block, not one per section

Multi-`cft` (one block per section) sounds like it gives finer-grained control, but in v0.1 it's strictly worse: it explodes a 12-section × 30-file batch into 360 API calls, requires the section-aware writer *now* (we deferred it to v0.4), and doubles the parser surface. With per-section bullets in the post-`cft` skeleton, the single user prompt already conveys section-specific requirements ("List each investor alphabetically under the table") to the model — which is what the user actually needs.

Per-section **re-run / refresh** (e.g., "refresh just the Recent Developments section every 90 days") is the legitimate use case for multi-`cft`. That's a v0.3+ concern, after the section-aware writer lands.

### Required frontmatter

```yaml
---
title: Tooling Profile (Company / Service / App)
applies-to-paths:
  - "Tooling/**"
description: Generates a structured profile for tooling entries.
---
```

- `title` — human-readable, shown in the picker.
- `applies-to-paths` — array of globs. **Suggestion-only in v0.1**: the picker filters templates whose glob matches the active file's path. The user always picks explicitly; no silent auto-application.
- `description` — one-line subtitle in the picker.

### `cft` block (config + system prompt only)

YAML config inside the fence. **No prompt body, no `---` separator — the user prompt lives below the fence as native markdown.** Closing fence is bare three backticks.

````
```cft
provider: perplexity
model: sonar-deep-research
max-tokens: 8000
search-recency: month
return-citations: true
system: |
  You are filling out a structured profile for the entity named "{{title}}".
  Existing metadata for this entity:
  {{frontmatter}}
  Produce markdown that follows the heading skeleton and per-section bullet
  instructions in the user prompt. Every heading must be present, even if a
  section reads "limited public information." Use inline citations. Prefer
  first-party sources.
```
````

### Post-`cft` skeleton (the user prompt)

Everything below the `cft` block is the user prompt. Authored as native markdown so Obsidian renders it correctly while editing. Per-section bullets are how the template author tells the model what each section should contain.

```markdown
# Features
- Describe core product features in 2–3 sentences each.
- Bullet 5–8 features in priority order.

## Screenshots
- Find 3 official screenshots from the product site.
- For each, write a 1-sentence caption.

## Product Roadmap / Announcements
- Public roadmap items and announcements from the past 6 months.
- Use dated bullets, most recent first.

## Recent Developments
- News and developments from the past 90 days. Cite sources inline.

# History and Origin Story
- Founding story, founders, key inflection points.

## Fundraising History
- Search for Pre-Seed, Seed, Series A, etc. announcements.
- Produce a markdown table with columns: Round | Date | Amount | Lead investor.
- Add a Total row at the bottom: `Total | — | $5M | 5,000,000 USD` (estimated or reported).
- Below the table, list each investor in alphabetical order, one per line.

## Notable Team Members
- Founders and notable leadership; one short paragraph each.

# Market Sizing
## Pricing
- Markdown table of pricing tiers if published.
- Note "no public pricing" if not.

## Revenue Trajectory Estimates
- Estimated or reported revenue / ARR. Cite source per figure.

# Competitive Landscape
## Who it's for, who it's not for
- Two short paragraphs. Be concrete about ICP and anti-ICP.

## Viable Alternatives
- 3–5 alternatives, one bullet each, with a brief rationale.
```

The runtime sends this skeleton (with `{{title}}` and `{{frontmatter}}` interpolated) as the user message. The model produces a response that follows the structure and respects the bullet instructions.

### Prompt assembly contract (implicit, no directives)

The runtime assembles the API call by zone, with no `prompt-from`, `include`, or rollup directives in the `cft` block. The contract:

- **Above `cft`** → reader context. Always omitted from the request.
- **Inside `cft`** → API config + `system:` prompt.
- **Below `cft`, up to the first `***` line (if any)** → the user prompt, sent with `{{title}}` / `{{frontmatter}}` interpolated.
- **Below the first `***` line** → excluded. This is the **authoring-scratch zone**: notes-to-self, tuning ideas, examples that should not be sent to the model.
- **No content below `cft`** → error: `Template has no skeleton`. No system-only fallback.

The full zone map of a template file:

| Zone | Region | Goes into request? |
|---|---|---|
| 1 | Frontmatter | No (metadata only) |
| 2 | Above `cft` | No (reader context) |
| 3 | Inside `cft` | YAML config + `system:` prompt |
| 4 | Below `cft`, above first `***` | Yes — user prompt |
| 5 | Below first `***` | No (authoring scratch) |

`***` is chosen over `---` as the terminator because `---` is overloaded (frontmatter delimiter; often used as a casual horizontal rule mid-prose). `***` is rare in normal authoring and reads unambiguously as "hard stop." Its presence below `cft` is optional — templates without `***` send everything below `cft` to end-of-file as the user prompt.

This implicit contract is the smallest possible parser surface: locate the `cft` block, slice the file into three pieces, send the YAML as config and the post-`cft` slice as the user prompt. An explicit `prompt-from:` directive may be added in v0.2 to support multiple skeletons in one template (e.g., short-form vs. long-form), but the implicit default will remain.

### Interpolation variables (v0.1 only)

Two, deliberately minimal:

- `{{title}}` — the target file's `title` frontmatter field if present; otherwise the file's basename without extension.
- `{{frontmatter}}` — the target file's full frontmatter rendered as a YAML block.

No `context-from` menu, no `{{selection}}`, no `{{existing-content}}` — those land when section-aware writing does. Literal `{{` and `}}` in template prose can be escaped as `\{{` and `\}}`.

## Run command

One command in the palette: **`Apply directory template to current file`**.

Flow:

1. User invokes the command while viewing a target file.
2. Plugin enumerates templates in `<templatesRoot>`.
3. Plugin filters to templates whose `applies-to-paths` matches the active file's vault-relative path.
   - If zero match: notice ("No template matches this file's path") and stop.
   - If one match: pre-select it but still confirm with the picker.
   - If multiple match: present picker.
4. User picks a template.
5. Plugin checks the target file's body. If non-empty (any non-whitespace after frontmatter), abort with a non-blocking notice: "File has existing body. Edit manually or delete body to re-run." Do not merge.
6. Plugin builds the prompt by interpolating `{{title}}` and `{{frontmatter}}` into the template's prompt body.
7. Plugin calls Perplexity Deep Research with the config from the `cft` block.
8. Plugin streams the response into the target file's body in real time.
9. A `Stop` command cancels mid-stream; whatever streamed remains in the file.

Folder-batch (`Apply directory template to all files in folder`) is explicitly deferred to v0.2.

## Output write logic

- **Frontmatter is byte-identical before and after the run.** Never modified.
- If the body is empty or whitespace-only → response is written there, streaming.
- If the body has any prose → abort with the notice above. v0.1 does not merge, augment, or revise.
- Errors (network, API error, timeout) → appended as a `> [!cf-error]` callout at the bottom of the body. Run terminates; no auto-retry.

## Settings

Minimum required for v0.1:

| Key | Type | Default | Notes |
|---|---|---|---|
| `perplexityApiKey` | string | `""` | Stored via Obsidian's secret storage if available, otherwise plain in `data.json`. Encryption is a v0.2 concern. |
| `templatesRoot` | string | `"zz-cf-lib/templates"` | Vault-relative path. Folder may not exist yet; if not, the picker shows zero templates. |
| `requestTimeoutMs` | number | `300000` | Perplexity Deep Research can take >1 min; default 5 min matches Text Generator. |
| `displayErrors` | boolean | `true` | When false, errors are toasted instead of inlined. |

## Execution flow (pseudocode)

```
onCommand("apply-directory-template-to-current-file"):
  active = workspace.activeFile()
  if !active: notice("No active file"); return

  templates = await listTemplates(settings.templatesRoot)
  matching  = templates.filter(t => globsMatch(t.appliesToPaths, active.path))
  if matching.empty: notice("No template matches this file's path"); return

  chosen = await pickTemplate(matching)
  if !chosen: return

  bodyText = readBodyAfterFrontmatter(active)
  if bodyText.trim().length > 0:
    notice("File has existing body. Edit manually or delete body to re-run.")
    return

  fmYaml = readFrontmatterAsYaml(active)
  title  = fmYaml.title ?? active.basename

  ctx          = { title, frontmatter: fmYaml.raw }
  systemPrompt = interpolate(chosen.cft.config.system, ctx)
  userPrompt   = interpolate(chosen.postCftSkeleton, ctx)

  apiConfig = omit(chosen.cft.config, ["system"])
  stream    = perplexity.deepResearch(
    { system: systemPrompt, user: userPrompt },
    apiConfig,
    { timeoutMs: settings.requestTimeoutMs }
  )
  cursor = endOfFile(active)
  for chunk in stream:
    if cancelled(): break
    appendAt(active, cursor, chunk)
    cursor += chunk.length
  if streamErrored:
    appendAt(active, cursor, errorCalloutFromError(streamError))
```

## Acceptance criteria (v0.1 "done")

1. With `perplexityApiKey` set and a template at `zz-cf-lib/templates/tooling-profile.md` (matching the example above), running the command on `Tooling/Agentic AI/Agentic Workspaces/Mastra.md` (non-empty frontmatter, empty body) produces a streamed body that follows the template's heading skeleton and includes inline citations.
2. Re-running on the same file aborts with the "existing body" notice; the file is not modified.
3. Frontmatter is byte-identical before and after a successful run.
4. The `Stop` command cancels mid-stream; partial output remains in the file.
5. Errors appear as a `> [!cf-error]` callout at the bottom of the body, and the run is marked complete (no auto-retry).
6. Running the same template against three different files in the same folder produces outline-consistent output (every required heading present in every file, in the same order).
7. Two seed templates ship with the spike to verify per-directory behavior:
   - `tooling-profile.md` — `applies-to-paths: ["Tooling/**"]`
   - `source-profile.md` — `applies-to-paths: ["Sources/**"]`

## Feedback from v0.2 use (queued for next iteration)

### Streaming preferred over buffer-then-write

Buffer-then-write means the user waits 30–60+ seconds (Deep Research) before seeing whether anything went wrong — auth, rate limit, malformed response, etc. Streaming makes the failure mode immediate (first chunk reveals it) and gives live visibility into progress, which matters for batch runs across 30+ files.

**v0.3 behavior:**
- Each file's response streams into the file as tokens arrive. Cursor anchors at the write point; partial output remains on cancel or error.
- For batch: streaming still serial across files. Inside one file: tokens write live.
- Cancel mid-stream → partial content stays in the file; batch advances to the next file (or stops if user cancelled the batch).
- Error mid-stream → existing partial content stays; an `> [!cf-error]` callout is appended below it (re-introduce the inline-callout error path that we deferred in v0.1).

This supersedes Open Question 2 in this spec (which we resolved as buffer-then-write for v0.1).

### `<think>` blocks from reasoning models must be wrapped, not raw

Perplexity Deep Research (and other reasoning models) sometimes emit a `<think>...</think>` block in the response. Written as raw HTML-like tags, they break Obsidian's markdown rendering — `<think>` is not a recognized HTML tag and Obsidian's renderer chokes on the surrounding content.

**v0.3 behavior:** post-process the model response before writing. Replace any `<think>...</think>` block (case-insensitive, including multi-line content) with:

````
```think-output
<original think content>
```
````

The `think-output` language tag is unique to us and renders as a normal fenced code block in Obsidian. The reasoning is preserved in the file (visible to the user, useful for debugging quality issues) without breaking page rendering.

This is a deterministic regex post-filter applied to every response, both streaming and non-streaming paths.

---

## Known gaps / next iterations (referenced for traceability)

- **v0.2** — Folder-batch run with concurrency, progress UI, per-file pass/fail log, resume-on-failure.
- **v0.3** — `cf` codefence runtime (per [[Moving-Beyond-Simple-API-Calls]] D1/D2), so individual sections can be re-run inline without re-running the whole template.
- **v0.4** — Section-aware writing + per-section output modes (`fill-if-empty`, `augment`, `revise-with-context`, `skip-if-present`).
- **v0.5** — Citation/backlink preservation (per D3) — relevant once target files are non-empty.
- **Later** — Multi-provider (Anthropic for cleanup sub-agent), image generation verbs, verb registry split, auto-resolution by directory mirroring.

## Open questions for sign-off before implementation

1. **`{{frontmatter}}` payload — full YAML, or filtered?** Frontmatter likely contains UUIDs, slugs, and other internal fields not useful to Perplexity (and possibly noisy). Options: (a) pass full YAML; (b) whitelist a small set (`title`, `og_description`, `tags`, `og_image`); (c) blacklist (everything except UUIDs and slugs). Recommend **(b)** with the whitelist exposed in plugin settings so users can adjust.
2. **Streaming vs. buffer-then-write.** Streaming is more responsive and matches the broader design ([[Moving-Beyond-Simple-API-Calls]] D2), but if the user edits the file mid-stream cursor behavior gets weird. Buffer-then-write is safer for v0.1. Recommend **buffer-then-write for v0.1**, switch to streaming once the editor-coexistence rules are figured out.
3. **Template picker UX.** Fuzzy-search modal like Obsidian's switcher, or a simple dropdown? Recommend **fuzzy modal** (matches Obsidian conventions; cheap to build with `FuzzySuggestModal`).
4. **Error reporting.** [[Moving-Beyond-Simple-API-Calls]] D2 says inline `> [!cf-error]` callout. For v0.1 first impressions, a transient toast might be friendlier — the user can re-run cleanly without first cleaning up an error block. Recommend **toast for hard errors (network/auth), inline callout for partial-stream failures** (where some content already wrote to the file).
5. **Plugin name / module location.** Does this live as a new plugin under `plugin-modules/`, or as a feature added to `perplexed`? Recommend **a new plugin** (call it `cf-lib` or `directory-templater` for now) so it doesn't conflate with `perplexed`'s ad-hoc Q&A surface and so the codefence runtime has a clean home for v0.3+.

Once these five are signed off, this is concrete enough to start implementation.
