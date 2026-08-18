---
site_uuid: 2565b435-e44a-40e9-971e-24b01958252d
hex_code: qbb9pa
title: "Plugin OG images — ImageKit paths in use"
lede: "The CDN URLs the splash actually references for plugin share imagery, and why they are CDN URLs and not /public paths — Git LFS plus GitHub Pages serves a pointer file, not an image."
date_created: 2026-08-18
date_modified: 2026-08-18
date_authored_initial_draft: 2026-08-18
date_authored_current_draft: 2026-08-18
at_semantic_version: 0.0.1.0
status: Reference
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5 (1M context)
tags:
  - OG-Images
  - ImageKit
  - Stenographer
  - Perplexed
  - Share-Imagery
publish: false
---

# Plugin OG images — ImageKit paths in use

The share-image URLs referenced from `src/content/plugin-highlights/*.md`.
Every one below was verified HTTP 200 on 2026-08-18.

## Why these are CDN URLs and not `/public` paths

`*.jpg` is tracked by **Git LFS** in this repo, and GitHub Pages serves the LFS
**pointer file** rather than the image. A site-relative path answers `200` with
`content-type: image/jpeg` and about **131 bytes of text** — so it looks healthy
to a link checker and renders as nothing to a human. This is the single reason
the imagery moved to ImageKit; it is not a preference.

Local originals still live in `public/` as the source of truth for regeneration.
They are not what gets served.

## Stenographer

### `banner_image` — 16:9

Default OpenGraph / Twitter card.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/stenographer-og/Stenographer__Obsidian-Community-Plugin--Banner_20260817T222205Z.jpg
```

**Alt:** Isometric illustration: a purple studio microphone on a turquoise floor against a dark wall, with a long ribbon of printed transcript paper running diagonally across the floor and arching past the microphone base

### `banner_tall_image` — 3:4

Taller crop for feeds that letterbox 16:9.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/stenographer-og/Stenographer__Obsidian-Community-Plugin--BannerTall_20260817T223629Z.jpg
```

**Alt:** Isometric illustration: a purple microphone with a rectangular mesh head in a yoke mount, standing where a turquoise floor meets a dark wall, with a ribbon of printed transcript paper curling in an S-shape around its base

### `banner_tall_max_image` — 2:3

Most extreme banner ratio.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/stenographer-og/Stenographer__Obsidian-Community-Plugin--BannerTallMax_20260817T223630Z.jpg
```

**Alt:** Isometric illustration: a charcoal condenser microphone suspended in a black shock-mount cradle above a turquoise floor, encircled by a loop of printed transcript paper, with purple and orange rounded hills along the horizon

### `portrait_image` — 4:5

Instagram-style portrait.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/stenographer-og/Stenographer__Obsidian-Community-Plugin--Portrait_20260817T223631Z.jpg
```

**Alt:** Isometric illustration: a purple microphone with a gold mesh head on a turquoise floor, two sheets of printed transcript paper lying flat beneath it, teal rolling hills along the horizon under a dark sky

### `portrait_tall_image` — 9:16

WhatsApp / iMessage tall unfurl, story formats.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/stenographer-og/Stenographer__Obsidian-Community-Plugin--PortraitTall_20260817T223632Z.jpg
```

**Alt:** Isometric illustration: a magenta microphone with a brass grille suspended in a purple shock-mount cradle, a ribbon of printed transcript paper spiralling around its base on a turquoise floor

### `square_image` — 1:1

Avatar, gallery tile, square card.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/stenographer-og/Stenographer__Obsidian-Community-Plugin--Square_20260817T223633Z.jpg
```

**Alt:** Isometric illustration: a bold purple microphone on a round stand against a dark herringbone-textured wall, with a ribbon of printed transcript paper curling across the turquoise floor toward the lower left

## Perplexed

### `banner_image` — 16:9

Default OpenGraph / Twitter card.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/perplexed-og/Perplexed__Obsidian-Community-Plugin--Banner_20260817T221604Z.jpg
```

### `banner_tall_image` — 3:4

Taller crop for feeds that letterbox 16:9.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/perplexed-og/Perplexed__Obsidian-Community-Plugin--BannerTall_20260817T225002Z.jpg
```

### `banner_tall_max_image` — 2:3

Most extreme banner ratio.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/perplexed-og/Perplexed__Obsidian-Community-Plugin--BannerTallMax_20260817T225003Z.jpg
```

### `portrait_image` — 4:5

Instagram-style portrait.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/perplexed-og/Perplexed__Obsidian-Community-Plugin--Portrait_20260817T225004Z.jpg
```

### `portrait_tall_image` — 9:16

WhatsApp / iMessage tall unfurl, story formats.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/perplexed-og/Perplexed__Obsidian-Community-Plugin--PortraitTall_20260817T225005Z.jpg
```

### `square_image` — 1:1

Avatar, gallery tile, square card.

```
https://ik.imagekit.io/xvpgfijuw/content-farm/perplexed-og/Perplexed__Obsidian-Community-Plugin--Square_20260817T225006Z.jpg
```

> **Alt text still to be written.** These six have not been looked at,
> and alt text written without seeing an image is worse than none —
> it satisfies a linter while telling a screen-reader user nothing.

## Notes

**A duplicate set exists at `/stenographer/og-images/`.** Uploaded 2026-08-18,
byte-identical to the `/content-farm/stenographer-og/` set above, from a run that
did not check whether the imagery was already hosted. Nothing references it. It
should be purged:

```bash
node ~/.claude/skills/prep-images-for-embed/scripts/prep-images.mjs \
  --purge-folder /stenographer/og-images
```

**Uploads are JPEG on purpose.** ImageKit content-negotiates on `Accept`: a JPEG
source serves WebP where accepted and falls back to JPEG everywhere else.
Measured on the banner — 66KB JPEG, 30KB WebP. Uploading WebP instead makes the
fallback a PNG up to three times larger.

**Responsive variants need no re-upload** — append a transformation, `?tr=w-800`.

**Re-running an upload never overwrites a live URL.** The ISO timestamp in each
filename makes every run unique — which is also how the duplicate above happened.
Check `--list-folder` before uploading.
