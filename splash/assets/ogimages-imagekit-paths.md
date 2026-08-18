---
site_uuid: 2565b435-e44a-40e9-971e-24b01958252d
hex_code: qbb9pa
title: "Stenographer OG images — ImageKit paths"
lede: "CDN URLs and alt text for the seven Stenographer share images. Absolute URLs, because a relative path will not unfurl."
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
  - Share-Imagery
publish: false
---

# Stenographer OG images — ImageKit paths

Seven share images for the Stenographer plugin, uploaded to ImageKit on 2026-08-18.
Local originals live in `splash/public/`; **these CDN URLs are what should be
referenced in `og:image` tags.** An unfurler fetching a relative path gets nothing.

## The URLs

### Banner — 1312×736 (16:9)

Default OpenGraph / Twitter card. The safe pick for any surface that doesn't specify.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--Banner_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a purple studio microphone on a turquoise floor against a dark wall, with a long ribbon of printed transcript paper running diagonally across the floor and arching past the microphone base

### Default — 1312×736 (16:9)

Byte-identical to Banner — see the note below.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--Default_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a purple studio microphone on a turquoise floor against a dark wall, with a long ribbon of printed transcript paper running diagonally across the floor and arching past the microphone base

### BannerTall — 864×1152 (3:4)

Taller crop for feeds that letterbox 16:9.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--BannerTall_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a purple microphone with a rectangular mesh head in a yoke mount, standing where a turquoise floor meets a dark wall, with a ribbon of printed transcript paper curling in an S-shape around its base

### BannerTallMax — 832×1248 (2:3)

Most extreme banner ratio.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--BannerTallMax_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a charcoal condenser microphone suspended in a black shock-mount cradle above a turquoise floor, encircled by a loop of printed transcript paper, with purple and orange rounded hills along the horizon

### Portrait — 896×1120 (4:5)

Instagram-style portrait.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--Portrait_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a purple microphone with a gold mesh head on a turquoise floor, two sheets of printed transcript paper lying flat beneath it, teal rolling hills along the horizon under a dark sky

### PortraitTall — 736×1312 (9:16)

WhatsApp / iMessage tall unfurl and story formats.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--PortraitTall_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a magenta microphone with a brass grille suspended in a purple shock-mount cradle, a ribbon of printed transcript paper spiralling around its base on a turquoise floor

### Square — 1024×1024 (1:1)

Avatar, gallery tile, and square card slots.

```
https://ik.imagekit.io/xvpgfijuw/stenographer/og-images/Ogimage__Stenographer--Square_20260818T034605Z.jpg
```

**Alt text:** Isometric illustration: a bold purple microphone on a round stand against a dark herringbone-textured wall, with a ribbon of printed transcript paper curling across the turquoise floor toward the lower left

## Notes

**`Default` is a byte-identical copy of `Banner`.** Same md5, same 1312×736. Both
were uploaded so every documented name resolves, but they are one image. Worth
deciding whether `Default` should be a distinct composition or simply dropped in
favour of pointing default consumers at `Banner`.

**The uploaded filenames read `Ogimage__`, not `ogimage__`.** The prep script
Title-Cases every segment, which collides with the house convention where a
lowercase leading token marks a *kind of asset* rather than a proper noun —
`ogimage__Lossless-At--Banner.jpg` is the documented shape. The URLs above are
correct as uploaded; the script is what needs fixing, not these links.

**Uploaded as JPEG deliberately.** ImageKit content-negotiates: a JPEG source
serves WebP to browsers that accept it and falls back to JPEG for unfurlers.
Uploading WebP instead makes that fallback a PNG up to three times larger.

**Re-running the upload will not overwrite these.** The ISO timestamp makes every
run produce new filenames, so published URLs are safe — at the cost of
accumulating near-duplicates in the folder. Prune deliberately:

```bash
node ~/.claude/skills/prep-images-for-embed/scripts/prep-images.mjs \
  --list-folder /stenographer/og-images
```

**Responsive variants need no re-upload** — append an ImageKit transformation,
e.g. `?tr=w-800`.
