---
title: "Stenographer: an Obsidian Plugin that Transcribes Audio Content"
lede: "Drop a YouTube, SoundCloud, or other listenable link into Obsidian and Stenographer turns it into a fully-frontmattered note with a streaming, AI-generated transcript — sources become searchable knowledge in one move."
date_created: 2026-05-07
date_modified: 2026-05-07
authors:
  - Michael Staton
augmented_with:
  - Pi on Claude Opus 4.7 (1M context)
semantic_version: 0.0.0.1
tags:
  - Spec
  - Obsidian-Plugins
  - Content-Farm
  - Audio-Transcription
  - Streaming-AI
status: Draft
---

# Stenographer: an Obsidian Plugin that Transcribes Audio Content

<!-- developing -->

## Summary

Stenographer is an Obsidian plugin that follows a "listenable link" — YouTube, SoundCloud, podcast episode, raw audio URL — and produces a single Markdown note: provider metadata as YAML frontmatter at the top, a faithful AI-generated transcript streamed into the body. The goal is to make ephemeral spoken content first-class material in an Obsidian vault, with no leaving the editor and no after-the-fact cleanup.

## Prior art

- [[Create-an-Audio-Transcriber-plus-Layered-Value]] — the broader vision spec that frames audio-to-note as a value-layered workflow (transcript + summary + citations + …). Stenographer is the focused first cut: provider metadata + accurate transcript, nothing more layered yet. References [`obra/Youtube2Webpage`](https://github.com/obra/Youtube2Webpage) as a working precedent for the YouTube-to-document shape.
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

// TBD — to be developed in dialog. Likely sections to populate: command surface, settings shape, file-creation rules (path, filename derivation, collision policy), frontmatter schema, transcript formatting (timestamps? speaker tags?), error handling, retry/resume on long transcripts.

## Open questions

- [ ] Where does the source URL come from — clipboard, modal input, current-line link, or all three?
- [ ] Single transcription provider at v1 or a Perplexed-style multi-provider settings tab from day one?
- [ ] Does Stenographer download the audio itself, or does it pass the URL through to a provider that ingests directly?
- [ ] Filename derivation: provider title slug? date prefix? user prompt?
- [ ] What happens on very long content (multi-hour podcasts) — chunking, resume, progress reporting?
- [ ] How much should overlap with the broader [[Create-an-Audio-Transcriber-plus-Layered-Value]] spec — does Stenographer subsume it, or stay strictly the "raw transcript" cut while the broader spec covers layered value?

## Related

- [[Create-an-Audio-Transcriber-plus-Layered-Value]]
- [[../explorations/Using-APIs-to-Ingest-More-Data]]
- `plugin-modules/metafetch/`
- `plugin-modules/perplexed/`
