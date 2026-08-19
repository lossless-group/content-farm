---
title: "Stenographer: an Obsidian Plugin that Transcribes Audio Content"
lede: "Drop a YouTube, SoundCloud, or other listenable link into Obsidian and Stenographer turns it into a fully-frontmattered note with a streaming, AI-generated transcript — sources become searchable knowledge in one move."
date_created: 2026-05-07
date_modified: 2026-08-08
authors:
  - Michael Staton
augmented_with:
  - Pi on Claude Opus 4.7 (1M context)
  - Claude Code on Claude Opus 5 (1M context)
semantic_version: 0.0.1.0
tags:
  - Spec
  - Obsidian-Plugins
  - Content-Farm
  - Audio-Transcription
  - Streaming-AI
status: In Progress
site_uuid: 1f90459b-5a73-490f-b3ac-696b9316ef2f
hex_code: j9rma8
date_authored_initial_draft: 2026-05-07
date_authored_current_draft: 2026-05-07
publish: true
---

# Stenographer: an Obsidian Plugin that Transcribes Audio Content

<!-- v0.1.0 shipped 2026-08-08 as plugin-modules/stenographer -->

## Summary

Stenographer is an Obsidian plugin that follows a "listenable link" — YouTube, SoundCloud, podcast episode, raw audio URL — and produces a single Markdown note: provider metadata as YAML frontmatter at the top, a faithful AI-generated transcript streamed into the body. The goal is to make ephemeral spoken content first-class material in an Obsidian vault, with no leaving the editor and no after-the-fact cleanup.

## Prior art

- [`obra/Youtube2Webpage`](https://github.com/obra/Youtube2Webpage) — a working precedent for the YouTube-to-document shape. Carried over from the one-day stub spec that preceded this one ("Create an Audio Transcriber, with extra layers of value", 2026-05-06), which held nothing else and has been removed.
- [[../explorations/Using-APIs-to-Ingest-More-Data]] — explores third-party fetchers (Jina Reader, Firecrawl, etc.) and the "metadata to frontmatter, body to note" pattern Metafetch already implements for OpenGraph. Stenographer is the audio-shaped sibling.
- `plugin-modules/metafetch/` — established pattern for "fetch from a URL → write frontmatter to a note" inside Obsidian.
- `plugin-modules/perplexed/` — established pattern for streaming AI responses into the editor in real time.

## Goals

- Accept a listenable link (YouTube first; SoundCloud, podcast feeds, direct audio URLs as targets). 
 - A Command triggers a Modal that can take a link and manage options.
 - A Command triggers the Modal from a selected link within the markdown file.
- Resolve provider metadata (title, channel/host, duration, publish date, description, thumbnail, canonical URL) and write it to frontmatter.
- Connects to either an ideal AI provider for transcripts (Whisper, ElevenLabs, Virlo, AssemblyAI, Supadata) or a low cost alternative (e.g., Scraper, local whisper.cpp).
- Generate and stream (or fetch asynchronously) a full, accurate transcript into the note body.
- Live inside Obsidian's command palette / link context — same UX shape as Metafetch and Perplexed.
- Established configuration and settings patterns that allow the in-focus document to accurately reference BOTH the Obsidian backlink to the transcript and the source link.
- Uses the Obsidian UI API to display the output in a way that Obsidian can render, enabling features like linking to specific timestamps.
- Generates `:::transcript` syntax for "Lossless Flavored Markdown" (LFM) so Astro-Knots sites can render interactive transcript components.

### Wish List / Nice-to-Haves

- When given a playlist or channel, 
 - [ ] an option to process all items in the playlist or channel.
 - [ ] an option to select some items from the playlist or channel, via search or scroll.
 - [ ] an option to process items in parallel.

## Provider Strategy

Stenographer follows a **Hybrid Provider Path** to balance metadata intelligence with raw transcription speed:

### 1. The Intelligence Engine (Virlo AI / Supadata)
- **Target:** Short-form social content (Shorts, TikTok, Reels) and metadata-dense research.
- **Value:** Ingests URLs directly (no local dependencies), extracts 40+ metadata fields (hooks, sentiment, topics), and provides a high-quality transcript + summary.
- **Mode:** Asynchronous (Submit → Poll/Wait → Populate).

### 2. The Scraper Engine (obra / jdepoix)
- **Target:** Videos with existing captions (most of YouTube).
- **Value:** **Fastest & Free.** Pulls existing human or auto-generated `.vtt` tracks directly from the provider.
- **Mode:** Instant (Fetch → Populate).

### 3. The Workhorse Engine (AssemblyAI / ElevenLabs / Whisper)
- **Target:** Long-form content (podcasts, lectures), videos without captions.
- **Value:** High-accuracy, **Speaker Diarization** (knowing who said what), and supports **Streaming Token UX**.
- **Mode:** Streaming (Real-time).

## Metadata Schema (Virlo/Supadata Mapping)

When using the Intelligence Engine, Stenographer maps the response to the following frontmatter schema:

```yaml
title: "Video Title"
source: "https://youtube.com/watch?v=..."
channel: "Channel Name"
date_published: YYYY-MM-DD
duration_seconds: 120
intelligence:
  primary_topic: "Main topic string"
  hook_text: "The verbatim hook used"
  sentiment: "positive/neutral/negative"
  summary: "AI generated summary"
  transcript_quality: "clean"
  language: "en"
```

## LFM Transcript Syntax

To ensure compatibility with Astro-Knots and interactive media players, transcripts are wrapped in a container directive:

```markdown
:::transcript
[00:00:15] **Speaker**: This is the first line of the transcript.
[00:01:02] **Speaker**: And here is the next section.
:::
```
*Note: Timestamps should use the `[HH:MM:SS]` or `[MM:SS]` format to trigger timestamp-linking in LFM-aware renderers.*

## UX Workflow

### Async Workflow (e.g., Virlo)
1. **Trigger:** User launches `Stenographer: Transcribe Link`.
2. **Input:** Modal accepts URL and provider choice.
3. **Submission:** Plugin kicks off the job via the **Homegrown API Helper** (see exploration); shows an Obsidian `Notice`: *"Stenographer: Ingesting audio via proxy... this may take a minute."*
4. **Success:** Once complete, Stenographer creates the Note, populates frontmatter + body, and notifies the user.

### Streaming Workflow (e.g., AssemblyAI)
1. **Trigger:** User launches `Stenographer: Transcribe Link`.
2. **Execution:** Plugin creates the Note immediately.
3. **Streaming:** Transcript text streams token-by-token into the body under the `:::transcript` tag.

## Constraints & Assumptions

- **Ingest Strategy:** External URLs are handled by the **Lossless API Helper** (Fly.io) or managed APIs to avoid local dependency issues in Obsidian.
- **LFM Invariant:** Transcripts must be authored such that they remain readable in plain markdown while remaining "hydratable" by LFM components.
- Follows the established Content Farm plugin shape (esbuild bundle, `manifest.json`, `main.ts`).

## Design

**As built in v0.1.0** (`plugin-modules/stenographer`). The Provider Strategy above describes the
full three-engine ambition; v1 implements engines 1 and 3, and defers engine 2 (the scraper)
because it is the one that requires the proxy.

### The v1 constraint that shaped everything

v1 was scoped as **direct-from-plugin to managed APIs, no infrastructure**. That collides with one
non-obvious fact: **AssemblyAI, Deepgram, and ElevenLabs will not ingest a YouTube page.** They
require a direct media URL, and producing one from YouTube means running `yt-dlp` somewhere —
precisely the Lossless API Helper described in
[[../explorations/Enabling-Obsidian-Plugins-to-access-Homegrown-API-Helpers]], which does not exist yet.

Supadata ingests the platform URL itself. So the engine split is forced, not chosen:

| Link shape | Engine | Why |
|---|---|---|
| YouTube / TikTok / Instagram / X / Facebook | Supadata | Only engine that accepts a platform page URL without a server |
| Direct media URL (`.mp3`, `.m4a`, `.wav`, …) | AssemblyAI (when keyed), else Supadata `generate` | Only engine here that does speaker diarization |
| Anything else | Supadata `generate` | Accepts arbitrary public file URLs; try rather than refuse |

Routing lives in one function (`src/utils/urls.ts::chooseEngine`) and the modal renders its verdict
live, before any credit is spent.

### Command surface

- `Transcribe a link` — opens the modal empty.
- `Transcribe the link under the cursor` — prefers the editor selection, falls back to the current
  line, so a cursor resting in a link works without precise selection.
- Ribbon icon → same modal.

Both commands converge on one modal, so there is exactly one place a transcription is configured.

### Settings shape

Provider keys (Supadata, AssemblyAI) · engine override (`auto` / forced) · Supadata mode
(`native` / `generate` / `auto`) · preferred language · job timeout · transcript folder · date-prefix
filenames · open-after-create · link-back toggle · characters-per-line · speaker labels ·
eight configurable frontmatter field names.

### File-creation rules

- **Path:** configurable folder, created recursively if missing.
- **Filename:** provider title, stripped of filesystem-illegal characters, capped at 120 chars;
  optional `YYYY-MM-DD ` prefix. Falls back to `Transcript <epoch>` when the title is empty or
  entirely punctuation (real on TikTok/Shorts).
- **Collision:** append ` 2`, ` 3` — Obsidian's own convention. **Never overwrite**: a transcript can
  represent minutes of paid API time.

### Transcript formatting

`:::transcript` LFM block, `[HH:MM:SS]` (or `[MM:SS]` under an hour), `**Speaker**:` prefix when the
engine diarizes. Caption tracks arrive as 2–5 word fragments; adjacent fragments merge up to a
configurable character budget, **but a speaker change always breaks the line** regardless of length.
An empty or untimed result still emits a well-formed block — a half-open directive would corrupt
every renderer downstream.

### Error handling

Failures are ranked by what they cost the user. Metadata is fetched first (it names the file) but
returns `null` on failure and the run continues — losing a title is annoying, discarding a paid-for
transcript is not. An empty transcript stops the run with an actionable message. Provider errors
carry stable codes (`NO_API_KEY`, `AUTH_FAILED`, `NOT_FOUND`, `TRANSCRIPT_UNAVAILABLE`,
`RATE_LIMITED`, `JOB_FAILED`, `TIMEOUT`, `ENGINE_MISMATCH`) so callers branch without string-matching.

### Long content

Supadata returns HTTP 202 + `jobId` for anything over ~20 minutes; Stenographer polls at 1s
(provider guidance) and AssemblyAI at 3s, reporting elapsed seconds into the status Notice, and
aborts on a configurable timeout (default 600s) rather than hanging. No chunking or resume in v1 —
both providers handle long media server-side. **Resume across an Obsidian restart is not implemented**;
a job in flight when the app closes is lost.

## Open questions

- [x] **Where does the source URL come from?** All three, converging on one modal: modal input,
      editor selection, current-line link. Clipboard is not read automatically — silently acting on
      clipboard contents is surprising.
- [x] **Single provider at v1 or multi-provider from day one?** Two engines from day one, because
      the YouTube-vs-direct-audio split is a hard capability boundary, not a preference. The
      settings tab follows the Perplexed multi-provider shape.
- [x] **Does Stenographer download the audio itself?** No. It passes the URL through to a provider
      that ingests directly. This is the entire reason Supadata is the primary engine.
- [x] **Filename derivation?** Provider title slug, optional date prefix (setting), collision-safe.
- [x] **Very long content?** Async job + polling + progress reporting + configurable timeout.
      No chunking; no resume across restart.
- [x] How much should overlap with the broader "layered value" framing — does Stenographer subsume it? **Resolved 2026-08-18: yes.** That spec never got past a link and a bullet, and Stenographer outgrew it within a day. It has been removed rather than left as a stub competing for the same subject. The layered value it gestured at — summary, citations, an `intelligence:` layer over the raw transcript — belongs in this spec's Wish List, not a separate document.

## Deferred to v2

Named here so the v1 boundary is legible rather than accidental:

- **Zoom recordings.** Local Zoom files are a file-picker path, not a URL path; cloud recordings need
  OAuth, app registration, and recording-scope permissions. Neither fits the "paste a link" surface.
- **Streaming token-by-token** into the note body. v1 creates the note once the transcript is complete.
  Neither engine's REST surface streams partial transcripts for pre-recorded media.
- **The scraper engine** (`jdepoix` / `obra`) — needs the Lossless API Helper.
- **Playlists and channels** — the Wish List above.
- **The `intelligence:` frontmatter block** — hooks, sentiment, topics, summary.
- **Mobile.** `isDesktopOnly: true` in v1; nothing in the code requires desktop, but it is untested.

## Related

- [[../explorations/Using-APIs-to-Ingest-More-Data]]
- `plugin-modules/metafetch/`
- `plugin-modules/perplexed/`
