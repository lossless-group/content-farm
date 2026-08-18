---
title: Moving Beyond Simple API Calls — LLM Orchestration Options for Our Plugins
date_created: 2026-05-09
type: exploration
status: open
tags: [llm, orchestration, langchain, ai-sdk, mastra, adk, obsidian-plugin]
related:
  - "[[Textgenerator-Analysis]]"
site_uuid: d3a78400-e9d9-4661-95fb-be1d66a2e17e
hex_code: j68ryw
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
lede: "Locks the `cf` codefence grammar and holds the line on direct vendor SDKs — Vercel AI SDK if we outgrow them, never LangChain."
summary: "Exploration that fixes the LLM-orchestration posture for every content-farm plugin. Carries the locked D0-D4 decisions for the cf/cft codefence grammar (fence invariants, longest-prefix verb resolution, execution model, template registry under zz-cf-lib/) alongside the framework comparison and its decision table. An agent about to add LLM calls to a plugin should read the decision table before choosing a dependency, and read D0-D4 before touching codefence parsing. Per-Directory-Profile-Templates is the narrow first slice actually specced for build; everything else here is deferred."
---

# Moving Beyond Simple API Calls

## Use-case anchor — Tooling profile population

Grounding the abstraction in the real workload driving this exploration.

**Situation.** `Tooling/` in the vault contains ~1600 deeply nested files. Each is a profile (company / service / app / open-source repo). Today they are mostly *empty* below the frontmatter:
- Frontmatter is populated by **Filestarter** (vault-wide UUID, slug, Astro-friendly fields) and **Metafetch** (`og_image`, `og_favicon`, `og_description`).
- Tags are added by hand against Obsidian's overly-flexible tag system. Inconsistent (e.g., `AI-for-Developers` vs. `Developer-AI` proliferate because autocomplete doesn't dedupe).
- Body is empty or near-empty: 0–few backlinks, 0–few embedded YouTube links.

The same pattern repeats across `Sources/`, `Vocabulary/`, etc.

**Goal.** Two-stage content development pipeline:

1. **Initial pass (batch).** Run a structured template against every file in a chosen subfolder (e.g., `Tooling/Agentic AI/Agentic Workspaces/*`, ~30–50 files). Each file gets a heading skeleton populated by Perplexity Deep Research, output filtered to roughly fit the outline. ~70% quality target. Sequential or parallel.
2. **Per-section iterative improvement.** For high-priority files (the ones likely to be shared), invoke section-level verbs to lift toward publishing quality: improve a section, generate imagery, augment with recent news, recommend authoritative sources, fix citations.

**Desired structural outline** (the template's heading skeleton):

```
# Features
## Screenshots
## Product Roadmap / Announcements
## Recent Developments

# History and Origin Story
## Fundraising History
## Notable Team Members

# Market Sizing
## Pricing
## Revenue Trajectory Estimates

# Competitive Landscape
## Who it's for, who it's not for
## Viable Alternatives
```

**Pain points with current Perplexed plugin.**
- Doesn't elegantly use the existing content in the target file (frontmatter, backlinks, OG metadata, any prose already present).
- Returns a single text blob, not section-structured output keyed to headings.
- No section-level refinement workflow — every iteration is a full re-run.

### Architectural implications

This use case validates the **verb / template split** and surfaces requirements not covered by D1–D4 as previously locked:

- **Verb** = executable primitive. One API call (or call chain) + deterministic filter + optional sub-agent reformat. Examples: `ask`, `research-section`, `improve-section`, `extract-funding`, `extract-pricing`, `find-screenshots`, `suggest-alternatives`. Each verb declares its `context-from` contract (frontmatter, existing headings, existing content under heading, backlinks, OG metadata) and ships its own filter chain.
- **Template** = markdown file whose **heading skeleton is part of its semantics**. Each heading hosts an embedded `cf` block that invokes a verb scoped to that section. Re-running a single section is a one-block operation, not a full re-instantiation.

#### New requirements surfaced

1. **Headings as section handles.** A `cf` block under `## Fundraising History` knows its scope and target heading; the runtime writes into that heading's range, not blindly appending. Boundary-aware writing is a *primitive*, not just a wishlist verb.
2. **Output modes**, settable at template default and overridable per `cf` block:
   - `fill-if-empty` — don't touch sections that already have prose (default for batch).
   - `augment` — append to existing.
   - `revise-with-context` — use existing as context, replace with improved.
   - `skip-if-present` — don't run if the section has content.
3. **`context-from` contract.** Verbs declare what target-file context they consume; templates set the menu. Fixes Perplexed's "doesn't elegantly use existing content."
4. **Batch instantiation as a distinct command.** "Run template T across folder F" with concurrency limits, progress UI, resume-on-failure, per-file log. Distinct from D2's "run cf under cursor." Probably `Run template across folder…`.
5. **Verb-internal filter chain.** Each verb is `primary call → deterministic filter → optional sub-agent reformat`, declared in the verb's definition. Templates don't see it; verbs encapsulate it.
6. **Two-tier registry.** Verbs at `zz-cf-lib/verbs/<verb>/<variant>.md`. Templates at `zz-cf-lib/templates/<name>.md`. Different roots, different commands, different lifecycles. (Supersedes the single-root sketch in D4.)

#### Concrete template shape

```markdown
---
title: Tooling Profile (Company / Service / App)
applies-to-paths: ["Tooling/**"]
---

# About this template
[Human explainer prose. Ignored at runtime.]

```cft batch
provider: perplexity
model: sonar-deep-research
context-from: [frontmatter, existing-headings, existing-content, backlinks]
output-mode: fill-if-empty
modifiers: [preserve-citations, preserve-backlinks]
concurrency: 3
```

# Features
```cf research-section `{topic="core product features", structure="bulleted"}`
```
## Screenshots
```cf find-screenshots `{count="3", aspect="landscape"}`
```
## Recent Developments
```cf research-section `{topic="news and developments, last 90 days"}`
```
... (rest of skeleton with embedded cf blocks per section)
```

#### v1 build order

1. **Verb runtime** — `cf` parser, dispatcher, longest-prefix match, append-below output, streaming, stop. Unlocks ad-hoc calls in any note.
2. **Initial verbs** — `ask`, `research-section`, `improve-section`, `extract-funding`, `extract-pricing`, `find-screenshots`, each with filter chain and `context-from` contract.
3. **Section-aware writing** — boundary-aware writer; powers heading-scoped `cf` blocks and the `expand-under-heading` selection-surface verb.
4. **Template instantiation, single file** — "Run template T on this file." Walks heading skeleton, executes embedded `cf` blocks, respects output modes.
5. **Batch** — same as (4) over a glob, with concurrency / progress / resume.

(1)–(3) is independently useful for high-priority files inside weeks. (4)–(5) is what makes 1600 files tractable.

---

## Locked decisions (working session, 2026-05-09)

These are signed off in the working session and supersede the open questions further down. Grammar and execution model first; verb registry, citation strategy, and template resolution still pending.

### D0 — Codefence syntax invariants (must hold for every `cf` and `cft` block)

Hard rules imposed by Obsidian's markdown parser. These supersede anything in the per-decision sections below; any design that violates them is wrong.

- **Opening fence line carries everything.** Language token (`cf` or `cft`), classes, and the args block must all be on the same line as the opening triple-backticks. No metadata on subsequent lines is part of the fence header.
- **Closing fence line is exactly three backticks**, on a line by themselves. **No** language token, **no** args, **no** trailing characters. The parser will not associate metadata after the closer with the block.
- **All internal structure lives in the body.** If we need to split a block into sub-sections (e.g. YAML config + prompt body), we use a body-line separator — *never* the close fence. Conventions:
  - `---` on its own line = YAML doc separator. Use to split config-on-top from prompt-on-bottom inside `cft` blocks.
  - `=== END ===` or `END` on its own line = explicit section/closure marker if a verb needs it. Optional; use only when a verb's parser needs an unambiguous boundary inside the body.
- **Body can be empty.** A `cf` block whose entire intent fits on the opening line writes no body and goes straight to the closer. E.g. `` ```cf research-section `{topic="…"}` `` ↵ `` ``` ``.

### D1 — Codefence grammar (Q1)

Single language token, **bare strings address commands**, **literal `{}` injects values**:

```
```cf <verb> [<sub-verb>] [modifier...] [`{key="value", ...}`]

{body}

```
```

Concrete example:

```
```cf improve-selection preserve-citations `{wordCount="200", sources="strict"}`

The selected paragraph appears here as the prompt body.

```
```

- **One** Obsidian codeblock processor registered for `cf`.
- **Bare tokens** form a *command path* (`verb` or `verb subverb`) followed by zero or more *modifiers*. Tokens also serve as CSS hooks on the rendered DOM (`cf cf-image cf-image-generate cf-brand-style`).
- **Command-path depth is bounded at 2** (`verb` or `verb subverb`). Anything beyond depth 2 is a modifier or an arg. Keeps the registry tractable and discoverable.
- **Verb resolution = longest-prefix match against the registry.** The dispatcher walks tokens left-to-right against the registered verb tree; the deepest match is the verb path, the remainder are modifiers. No `--` separator needed.
- **Args block** is a literal `{key="value", ...}`. HTML-attribute style: quoted strings, unquoted booleans, comma- or space-separated keys. For nested/array values, a single `data='{...}'` arg holding JSON5 is the escape hatch.
- **Backticks around the args block are optional** — required only when an arg value contains markdown-active characters (`]]`, `}`, backticks). Parser strips them either way.
- **At least one verb token required** — every cf block is self-documenting. No silent default.
- **Reserved verbs (initial)**: `ask`, `mermaid`, `svg`, `canvas`, `image generate`, `image recreate`, `suggest-sources`, `generate-file`, plus selection-surface verbs `improve-selection`, `expand-under-heading`.
- **Reserved modifiers (initial)**: `preserve-citations`, `preserve-backlinks`, `sources-from-selection-only`, `preview`, `dry-run`, `replace-previous`, `strict-citations`.
- **Arg-value interpolation is deferred.** v1 args are literal strings/booleans only. If we later want runtime substitution (e.g., `arg1="{{title}}"` → frontmatter field), we'll use a distinguishable delimiter (`{{var}}` or `${var}`) so it can't collide with the args-block `{...}` braces.

### D3 — Citation & backlink preservation (Q3)

Backlinks in our notes follow the Obsidian-aliased form `[[<vault-path>|<display-name>]]` (or un-aliased `[[<vault-path>]]`), and they almost always anchor on **proper nouns** (companies, essays, public figures). That makes deterministic preservation tractable: proper-noun tokens survive paraphrase intact, so we can match them in the model's output and rewrap.

**Strategy:**
- **Default = deterministic alias-match registry post-filter.**
  1. Extract registry from the input selection: `{ path, alias, basename }` for every wikilink.
  2. Scan the model's output for occurrences of `alias` and `basename`, case-insensitive, word-boundary-anchored.
  3. Rewrap the **first** occurrence per entity in the original `[[path|alias]]` form. Don't rewrap subsequent occurrences (avoids wikilink soup).
  4. Report any registry entry with zero matches as a non-blocking warning.
- **Edge cases handled in v1:**
  - Possessives / pluralization stay outside the link (`[[…|Mastra.ai]]'s`).
  - Min-length / capitalization gate to avoid generic-token false positives (alias must contain ≥1 capital AND be ≥3 chars, OR be multi-word).
  - Same display name with different paths → prefer the path that appeared in the input.
  - Un-aliased links → match on basename, restore as un-aliased.
- **Modifier `strict-citations`** triggers an LLM second pass *only* when the deterministic post-filter reports unresolved entries. Second pass receives original selection, first-pass output, and the missing-entity list, and is asked to reintroduce them.
- **LFM hex-code citations** get a parallel handler with the same shape (extract → match → restore), kept pluggable as a sibling to wikilink preservation rather than entangled with it.
- **Out of scope for v1**: auto-linking new entities the model writes about that happen to exist in the vault — that's link suggestion, a separate feature.

### D4 — Template definition & resolution (Q4)

Templates live as ordinary markdown files in a **visible, configurable directory** in the vault. They are *not* hidden by Obsidian, not stuffed into plugin settings JSON, and not co-located with content. Reason: users edit templates inside Obsidian itself; templates need to be first-class browsable vault files.

**Default directory name: `zz-cf-lib/`.** The `zz-` prefix sorts the directory last in Obsidian's file explorer (ASCII sort), keeping it visually out of the way of content; `cf-lib` makes its purpose obvious. User-configurable via plugin setting, but the default is a name unlikely to collide with content directories.

#### Template file shape

Two zones inside one file, cleanly separated by a codefence:

```markdown
---
title: Improve Selection — Strict Sources
description: Rewrites selection while keeping only citations already present.
surface: selection
---

# Improve Selection (Strict Sources)

Free-form human-facing explainer prose. Notes on when to use this template,
tuning advice, examples, links to related templates. The runtime ignores
everything outside the `cft` block.

```cft
provider: anthropic
model: claude-opus-4-7
max_tokens: 4096
system: |
  You are a careful editor. Preserve every wikilink and citation present
  in the input.
modifiers:
  - preserve-citations
  - sources-from-selection-only

---

Rewrite the following selection while preserving every wikilink and citation:

{{selection}}
```
```

- **Frontmatter** = template metadata (`title`, `description`, `surface`, anything custom). Semi-standard: a small set is required to register; users may add free-form keys without breaking anything.
- **Markdown body outside `cft`** = explainer / docstring. Pure prose. Editable by humans without affecting execution.
- **`cft` codefence** = the executable definition. Internally split by `---` into a YAML config block (provider, model, params, system prompt, modifiers — including provider-specific knobs like Perplexity's `search_domain_filter` or Gemini's `safetySettings`) and a prompt-body block (free text, with context-variable interpolation TBD in a later decision).
- **Why a codefence and not just markdown body**: matches Obsidian's broader convention that codefences wrap plugin-controlled / non-prose content. Cleanly separates "what the user reads" from "what the dispatcher executes." Text Generator's mistake was running handlebars over the entire markdown body, which means every typo in your explainer prose is a potential prompt injection or render bug. We avoid that.
- **One `cft` block per file in v1.** Multi-step pipelines (generate → critique → revise) are deferred — that's where workflow orchestration starts mattering, and where Mastra becomes worth a real look.

#### Verb registry from folder structure

The folder hierarchy under the templates root **is** the verb registry:

```
zz-cf-lib/
  improve-selection/
    default.md
    preserve-citations.md
    sources-from-selection-only.md
  image/
    generate.md
    recreate.md
  expand-under-heading/
    default.md
  ask/
    default.md
```

- `zz-cf-lib/<verb>/<variant>.md` registers `verb` (with `variant` either `default` or a modifier). `zz-cf-lib/<verb>/<subverb>/<variant>.md` registers `verb subverb`.
- No `verb:` field needed in frontmatter — the path is the source of truth. Zero-config registration.
- A single verb can have multiple files (provider variants, model presets); selection at runtime via an arg, or by plugin default.

#### Per-directory default templates (the wishlist item)

Resolved by **mirroring vault structure** under the templates root. When `cf <verb>` is invoked from a note at `essays/2026/foo.md`, the resolver checks, in order:

1. `zz-cf-lib/essays/2026/<verb>/default.md`
2. `zz-cf-lib/essays/<verb>/default.md`
3. `zz-cf-lib/<verb>/default.md` (global fallback)

This makes "default template per directory" *infrastructural*, not a separate mapping that could drift from the vault. No mapping file, no settings JSON, no pollution of content directories — the templates folder simply mirrors the structure where you want overrides.

#### Out of scope for v1

- Multi-`cft`-block files (workflows).
- Context-variable interpolation grammar inside the prompt body (`{{selection}}`, `{{frontmatter.x}}`, etc.) — covered by a later decision; for now, assume Handlebars-style and revisit when we wire it up.
- Template inheritance / composition (`extends:` another template). Useful, deferred.

### D2 — Execution model (Q2)

**Command-driven, output appended below the fence, cf block is ephemeral scaffolding.**

- Execution is invoked via a command (`Run codefence under cursor`) or a toolbar button rendered alongside the cf block in preview mode. **Never auto-run on render.**
- **Output is clean markdown**, written *after* the closing fence with a blank line separator. No wrapper, no delimiter, no metadata in the doc — so when the user deletes the cf block, the output stands as authored prose.
- **Workflow**: `cf → cf + output → (user deletes cf) → output`. The cf block is scaffolding; the output is the artifact.
- **Re-run**: default = append a new output below prior outputs (lets users compare runs). Modifier `replace-previous=true` swaps that for a single live-output workflow.
- **Streaming**: tokens stream into the document by default. A `Stop` command cancels; whatever streamed stays in the doc.
- **Errors**: appended as a `> [!cf-error]` callout — visible, distinct, easy to delete, won't be confused with prose.
- **Two execution surfaces** are official:
  - **Codefence verbs** — invoked from a `cf` block; output appended.
  - **Selection-command verbs** — invoked from the command palette while text is selected; output replaces/augments selection, no cf involved.
  Each verb declares which surface(s) it supports.

### Open

- **Q3** — Citation/backlink preservation strategy (deterministic-first vs. always LLM second-pass).
- **Q4** — Default-template resolution location (plugin settings vs. `.templates/` mirror vs. root YAML).
- **Q5–Q8** — see *Load-bearing questions* below.

---

## Wishlist (raw, 2026-05-09)

Capability ideas to evaluate against any orchestration choice. Grouped roughly by primitive; refinement is in progress in the working session, not yet reconciled.

### Template system
- A **template syntax that uses Obsidian codefences + arguments** to make API calls with enough request context to get back ideal output.
- **Template-folder conventions** that are simple for both agents and humans to understand.
- **Default template per directory**, without polluting the directory itself.

### Selection-improvement modes
Verbs that operate on the current Obsidian selection:
- **Preserve-and-add**: keep the selected content verbatim; only append.
- **Revise + mixin**: produce a more robust, enhanced section that preserves the original meaning and any **citations and backlinks** already in the selection.
- **Use context in selection, total rewrite**: full rewrite, but informed by the selection as context.
- **Improve selection with only included sources**: the LLM may only reference source links / citations present in the included selection.
- **Improve based on outline in codefence**: the codefence supplies an outline; the model writes against it.

Ideally, the model's output is filtered through a second agent call (or a deterministic script / decision rule) to reformat citations and backlinks correctly.

### Boundary-aware writing
- **Run-with-heading**: take the heading immediately above the cursor, stream content at an intended word count, only create *sub*-headings, and stop at the next heading of the same level. E.g. invoked under an `## H2` it never writes past the next `## H2`.

### Generative outputs
- Generate **Mermaid** chart.
- Return **relevant images** to embed, using Obsidian embed syntax (`![[…]]`); if the returned images aren't satisfactory, allow refinement of the search.
- **Recreate a selected image** with brand-style specifics.
- Generate **JSONCanvas** based on page or selection content.
- Generate **SVG** based on selection content; generate SVG based on a codefence prompt.
- **Generate a new file from a template.**

### Source/citation awareness
- **Recommend authoritative sources** to enhance the selection.

---

## Context

Most of our `plugin-modules/*` plugins (perplexed, metafetch, grab-reference, image-gin, cite-wide, etc.) currently make direct, one-shot HTTP calls to a single AI vendor. As we start wanting **multi-provider support**, **streaming**, **tool calling**, **structured output**, and eventually **multi-step agents**, the question is what orchestration layer — if any — we should adopt.

The reference point in our own tree is the Text Generator plugin (see `[[Textgenerator-Analysis]]`), which bundles **LangChain.js** plus 10+ `@langchain/*` provider packages directly into its Obsidian bundle. That's the heavy end of the spectrum. Google's **ADK (Agent Development Kit)** is the other shape we considered — a server-runtime agent framework.

This file captures the tradeoffs so we can make a deliberate choice before any plugin adds a framework dependency.

## Why ADK doesn't fit our plugin runtime

Google ADK is **Python-first** (with a Java port). It assumes a server runtime — long-running agents, tool registries, A2A protocols. None of that maps cleanly into an Obsidian plugin, which ships as a single `main.js` loaded into Electron's renderer process. To use ADK from a plugin you'd need to ship a separate Python sidecar that the plugin talks to over HTTP/IPC. That's a different product (a desktop service), not a plugin.

ADK is worth keeping in mind for **server-side** workloads — e.g., a content-farm worker that ingests, classifies, and routes content offline. It is not the right tool inside an Obsidian plugin bundle.

## The TS-native landscape (early 2026)

In rough order of traction:

### 1. Vercel AI SDK (`ai` + `@ai-sdk/<provider>`)

What most new TS LLM apps actually use today. Provider-agnostic via per-vendor packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`, `@ai-sdk/perplexity`, ollama community adapter, etc.). Core primitives:

- `generateText` / `streamText` — single-shot or streaming completion.
- `generateObject` / `streamObject` — structured output via Zod schemas.
- Tool-calling loops (`tools: { ... }`) that run a basic agent loop natively.
- First-class streaming with cancellation.

Bundle size is dramatically smaller than LangChain because each provider is a separate package and there's no kitchen-sink "community" tier pulled along by transitive deps. Same "swap the provider import" ergonomics that Text Generator gets from LangChain, without the dependency mass.

**Best fit when**: a plugin needs many providers, streaming, tool-calling, and/or structured output, but stays inside the Obsidian process.

### 2. Mastra

TS-native agent framework with workflows, memory, and evals. Heavier than Vercel AI SDK, lighter than LangChain. Closest spiritual cousin to ADK in the TS world. Designed for real agent runtimes — overkill for a plugin that just wants to call Claude with a structured prompt, but worth a serious look if/when we build a content-farm *server* in TS rather than Python.

**Best fit when**: we need a real multi-step agent with persistent memory and workflow orchestration — and we're staying in TS.

### 3. OpenAI Agents SDK (TS)

Good if you're OpenAI-leaning and want their agent loop. **Provider lock-in defeats the point** for a plugin that wants to support Anthropic, Gemini, Ollama, and Perplexity alongside OpenAI. Skip for plugin-modules; possibly fine for a single-vendor server tool.

### 4. LlamaIndex.TS

Heavier, RAG-focused. Probably not what we want for these plugins. Reconsider if/when we build a vault-wide retrieval feature.

### 5. Direct vendor SDKs

The lightest possible option: `@anthropic-ai/sdk`, `openai`, `@google/genai`, `ollama`. If a plugin only needs 2–3 providers and basic streaming + tool use, this beats every framework on bundle size and clarity. The cost is writing a small provider-switching layer ourselves — typically one file, ~100–200 LOC, that exposes a `generate({ provider, model, messages, tools, stream })` shape and dispatches to the right SDK.

This is what we should default to until a concrete feature forces us up the stack.

## Decision framework for a given plugin

| Plugin needs | Recommended layer |
|---|---|
| One vendor, one-shot call, no streaming | Direct SDK (status quo) |
| ≤3 providers, streaming, basic tool use | Direct SDKs + a small in-repo dispatch helper |
| Many providers, streaming, structured output, lightweight tool-calling | **Vercel AI SDK** |
| Multi-step agent with memory/workflows, in-process | **Mastra** |
| Server-side agent runtime, tolerant of Python sidecar | **Google ADK** (out of process) |
| Heavyweight, "does everything," willing to pay the bundle tax | LangChain.js (what Text Generator chose) |

## What this means for content-farm

Two action lines:

1. **Plugins (`plugin-modules/*`)**: hold the line on direct SDKs until a plugin has a concrete need — multi-provider switching, structured output with Zod, or a real tool-calling loop — that direct SDKs make awkward. When that happens, **Vercel AI SDK is the default**, not LangChain. We do not want 10+ `@langchain/*` packages in any plugin bundle.

2. **Server-side workloads** (anything that runs outside Obsidian — ingestion workers, scheduled jobs, batch classifiers): keep the door open to **Mastra** (if we stay TS) or **ADK** (if Python is acceptable for a specific worker). Decide per-worker, not globally.

## Open questions

- What's the actual measured bundle-size delta between `Vercel AI SDK + 3 providers` vs. our current `@anthropic-ai/sdk` baseline in something like `perplexed`? Worth a small spike.
- Is there any plugin in `plugin-modules/` *today* whose feature backlog has crossed the "direct SDK is awkward" threshold? If yes, that's the natural pilot.
- Do we want a tiny shared `@lossless/llm` helper inside the monorepo (provider switch + streaming + Zod parse) so plugins don't each rebuild the same dispatcher? Probably yes once two plugins need it.
- For the eventual content-farm server: Mastra vs. ADK is a real fork. Worth a separate exploration once that workload is concrete.

## References

- Text Generator analysis (LangChain in practice in an Obsidian plugin): `[[Textgenerator-Analysis]]`
- Vercel AI SDK docs: https://sdk.vercel.ai
- Mastra: https://mastra.ai
- Google ADK: https://google.github.io/adk-docs/
