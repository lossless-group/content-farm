---
title: stenographer
lede: Paste a YouTube link, get a note with the whole transcript in it — timestamped, speaker-labeled, in your folder, under your frontmatter keys.
order: 15
status: Beta
repo: https://github.com/lossless-group/stenographer
icon: 🎙️
featured: true
tags: [Audio-Transcription, YouTube, Podcasts, Obsidian-Plugins]
---

The best thinking in a lot of fields is spoken now — the two-hour podcast, the conference talk, the founder interview posted on a Tuesday. To a vault built on text, all of it is a dead URL you can't search, can't link into, can't quote without scrubbing a timeline by hand. Stenographer closes that in one command: provider metadata lands in YAML frontmatter, the words land in the body as an LFM `:::transcript` block with `[HH:MM:SS]` timestamps and speaker labels. A YouTube link writes `youtube_url`, Apple Podcasts writes `apple_podcasts_url` — vaults refer to sources by where they came from, so the plugin does too. Two engines, routed by link shape and shown to you before you spend a credit: Supadata takes platform URLs (the only path to YouTube without standing up a server), AssemblyAI takes direct audio files and returns them diarized. Bring your own key; both have free tiers.
