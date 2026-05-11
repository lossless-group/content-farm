---
version: alpha
name: Content Farm — Astro Knots Dark
description: >-
  Design system for the content-farm splash site. Dark vibrant-minimal aesthetic
  with mesh-gradient background, monospace headlines, and brand-cyan accents.
  Tokens mirror the CSS custom properties in src/layouts/BaseLayout.astro's
  :root block — that file remains the runtime source of truth; this DESIGN.md
  is the human- and agent-readable contract.
colors:
  # ── Surfaces ─────────────────────────────────────────────────────────
  surface-base: "#0a0a0f"          # body background; the "void" the mesh sits on
  surface-soft: "#11111a"          # next-shade-up surface
  surface-elevated: "#161623"      # palette window, modals
  surface-card: "#161623"           # base for translucent card backgrounds (used at 65% alpha)

  # ── Lossless brand accents ───────────────────────────────────────────
  primary: "#04e5e5"               # cyan — the brand primary, drives most accents
  primary-soft: "#6fffd6"          # aquamarine — partner to primary in gradients
  accent-magenta: "#bf23f7"        # purple-magenta — secondary accent
  accent-violet: "#7c5cff"         # blue-violet — tertiary accent

  # ── Text ────────────────────────────────────────────────────────────
  on-surface: "#f1f5f9"            # primary text
  on-surface-soft: "#cbd5e1"       # secondary text, descriptions
  on-surface-dim: "#94a3b8"        # tertiary text, captions
  on-surface-dimmer: "#64748b"     # quaternary, dates, weakest

  # ── Borders ─────────────────────────────────────────────────────────
  border: "#ffffff"                # rendered at 0.08 alpha at runtime
  border-strong: "#ffffff"         # rendered at 0.16 alpha at runtime
  border-accent: "#04e5e5"         # rendered at 0.35 alpha — focus / hover borders

  # ── Semantic ────────────────────────────────────────────────────────
  status-stable: "{colors.primary-soft}"
  status-beta: "{colors.primary}"
  status-alpha: "{colors.accent-magenta}"
  status-experiment: "{colors.accent-violet}"

typography:
  # Two families: Inter for prose, JetBrains Mono for headlines, code,
  # eyebrows, button labels, and anything that should feel "engineered."
  display-hero:
    fontFamily: JetBrains Mono
    fontSize: 4rem               # clamp(2.5rem, 6vw, 4rem) at top
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.5rem             # clamp(1.875rem, 3.5vw, 2.5rem)
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 1.4rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: Inter
    fontSize: 0.9rem
    fontWeight: 400
    lineHeight: 1.6
  mono-md:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.5
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.04em
  label-eyebrow:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.16em
  label-pill:
    fontFamily: JetBrains Mono
    fontSize: 0.7rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.06em

rounded:
  sm: 6px       # tags, small inputs
  md: 12px      # cards, modals, palette items
  lg: 18px      # primary cards, palette window, tables
  xl: 28px      # hero panels, large containers
  full: 9999px  # pills, CTA buttons, icon buttons

spacing:
  # Base scale — rem-anchored. Numeric "8px-grid" equivalents shown for
  # cross-walking against Figma / Tailwind defaults.
  base: 1rem            # 16px
  "1": 0.25rem          # 4px
  "2": 0.5rem           # 8px
  "3": 0.75rem          # 12px
  "4": 1rem             # 16px
  "6": 1.5rem           # 24px
  "8": 2rem             # 32px
  "12": 3rem            # 48px — section-head margin-bottom, inter-section gap
  "16": 4rem            # 64px — hero bottom padding, foot block
  "24": 6rem            # 96px — trailing page padding

  # Layout-named tokens
  container-max: 1200px
  container-padding: 24px         # {spacing.6}
  gutter: 16px                    # default card-grid gap (2-col)
  gutter-wide: 24px               # 3-col card-grid gap
  section-padding-block: 48px     # padding-block on every .perplexed-landing > section

components:
  # ── Pill (status indicator) ───────────────────────────────────────────
  pill:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.on-surface-soft}"
    typography: "{typography.label-pill}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  pill-stable:
    textColor: "{colors.primary-soft}"
    backgroundColor: "rgba(111, 255, 214, 0.08)"
  pill-beta:
    textColor: "{colors.primary}"
    backgroundColor: "rgba(4, 229, 229, 0.08)"
  pill-alpha:
    textColor: "{colors.accent-magenta}"
    backgroundColor: "rgba(191, 35, 247, 0.08)"

  # ── CtaButton (the reusable primary CTA) ──────────────────────────────
  cta-primary:
    backgroundColor: "linear-gradient(120deg, {colors.primary}, {colors.primary-soft})"
    textColor: "{colors.surface-base}"
    typography: "{typography.mono-md}"
    rounded: "{rounded.full}"
    padding: "12px 22px"
  cta-primary-hover:
    # Adds glow shadow on hover at 0 12px 32px rgba(4, 229, 229, 0.35)
    backgroundColor: "linear-gradient(120deg, {colors.primary}, {colors.primary-soft})"
  cta-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.on-surface}"
    typography: "{typography.mono-md}"
    rounded: "{rounded.full}"
    padding: "12px 22px"
  cta-link:
    backgroundColor: transparent
    textColor: "{colors.on-surface-dim}"
    typography: "{typography.mono-md}"
    padding: "12px 4px"

  # ── PluginCard (the card on the splash index) ────────────────────────
  plugin-card:
    backgroundColor: "rgba(22, 22, 35, 0.65)"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  plugin-card-featured:
    # featured cards add a 135deg cyan + magenta tint gradient over surface-card
    backgroundColor: "rgba(22, 22, 35, 0.65)"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"

  # ── Footer GitHub icon button (sibling of .card-link in PluginCard) ──
  card-github-icon:
    backgroundColor: "rgba(10, 10, 15, 0.55)"
    textColor: "{colors.on-surface-dim}"
    rounded: "{rounded.full}"
    size: "36px"
  card-github-icon-hover:
    backgroundColor: "rgba(4, 229, 229, 0.08)"
    textColor: "{colors.primary}"

  # ── Core / Surface / Primitive cards (page-internal cards) ───────────
  core-card:
    backgroundColor: "{components.plugin-card.backgroundColor}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  surface-card:
    backgroundColor: "{components.plugin-card.backgroundColor}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"

  # ── Templates table ─────────────────────────────────────────────────
  templates-table:
    backgroundColor: "{components.plugin-card.backgroundColor}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"

  # ── Callout (purple-bordered editorial-stance card) ──────────────────
  callout:
    backgroundColor: "rgba(191, 35, 247, 0.04)"
    textColor: "{colors.on-surface-soft}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"

  # ── Palette window (Cmd-P teaser) ────────────────────────────────────
  palette-window:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface-soft}"
    rounded: "{rounded.lg}"
    padding: "0"

# ─── Imagery — Ideogram API recipe ─────────────────────────────────────
# Custom token group (outside the Stitch spec's standard groups).
# Spec-compliant consumers preserve unknown top-level keys, so this is
# safe to keep here as the single source of truth for image-generation.
#
# The contract: every Ideogram request for a Content Farm asset uses the
# values below for ALL fields. The only per-request variables are:
#   - `prompt`           — subject + composition (see imagery.prompt)
#   - `aspect_ratio`     — one of imagery.aspect_ratios
#   - `num_images`       — optional, defaults to 1
# Anything else is locked. This is what produces a coherent visual
# family across banners, portraits, squares, and tall chat previews.
imagery:
  provider: ideogram
  endpoint: POST https://api.ideogram.ai/v1/ideogram-v3/generate
  content_type: multipart/form-data

  # ── Locked defaults — DO NOT vary per request ───────────────────────
  defaults:
    style_type: AUTO              # NOTE: must be AUTO (or GENERAL) whenever
                                  # style_reference_images is uploaded — the
                                  # v3 API enforces this mutually-exclusive
                                  # constraint and rejects DESIGN/REALISTIC/
                                  # FICTION when a reference image is set.
                                  # The reference image carries the design
                                  # aesthetic anyway.
    magic_prompt: OFF             # disables Ideogram's prompt-rewriter;
                                  # rewriting is the #1 source of drift
                                  # across "identical" requests
    rendering_speed: QUALITY      # use TURBO only when iterating prompts
    seed: 1138                    # canonical seed; bump only when the
                                  # visual canon itself shifts

  # ── Locked negative prompt — exclude this from every generation ────
  # Short on purpose. Each token competes with the positive prompt for
  # attention; long negatives dilute hard composition asks.
  negative_prompt: >-
    text, typography, lettering, logos, watermarks, central subject
    filling frame, photorealistic human faces, saturated, rainbow,
    vibrant, oversized subject, subject in top half

  # ── Locked color palette — Content Farm brand, weighted ─────────────
  # Sum of weights does not need to equal 1; Ideogram interprets the
  # weights as relative emphasis. Surface-base dominates so generations
  # default to the dark canvas. Cream is reserved as the "subject" tone
  # carried over from the existing banner.
  color_palette:
    members:
      - { color_hex: "#0a0a0f", color_weight: 0.45 }    # surface-base (void)
      - { color_hex: "#04e5e5", color_weight: 0.20 }    # primary (cyan)
      - { color_hex: "#6fffd6", color_weight: 0.15 }    # primary-soft (aquamarine)
      - { color_hex: "#bf23f7", color_weight: 0.10 }    # accent-magenta
      - { color_hex: "#c8b893", color_weight: 0.10 }    # warm cream (sprout / subject)

  # ── Locked style reference — uploaded as style_reference_images ─────
  # This is the strongest consistency signal in the v3 API. Every
  # request uploads this file; texture, lighting, isometric language,
  # and atmospheric mood are inherited from it.
  style_reference:
    path: public/ogimage__Content-Farm--Default.png
    mime: image/png

  # ── Aspect ratio enum — pick one per request ────────────────────────
  # Maps Lossless format names to Ideogram's allowed values.
  aspect_ratios:
    banner: 16x9                  # OG / Twitter / Slack / generalized share
    portrait: 4x5                 # LinkedIn portrait, Instagram feed
    portrait_tall: 9x16           # Stories, Reels, TikTok
    square: 1x1                   # avatars, square unfurls, fallbacks
    banner_tall: 3x4              # WhatsApp / iMessage previews (default tall)
    banner_tall_max: 2x3          # dramatic-tall variant; use sparingly

  # ── Prompt convention — the ONLY free-text per request ─────────────
  # Constraints documented in the Imagery prose section below. The
  # `pattern` here is the empirical empty-space-first structure (from
  # iter3 — subject-first prompts let the subject grow into the overlay
  # zone). Two clauses separated by a period:
  #   1. Top region: declared as empty negative space with concrete
  #      content (a "dark gradient sky" — model has to render it).
  #   2. Bottom region: contains the actual subject.
  # Explicit numeric proportions ("1/3", "2/3"), never soft terms
  # ("lower portion"). See the prose Imagery section for the iter1→iter3
  # rationale.
  prompt:
    pattern: "Top 1/3 of frame is empty negative space, {empty_region_content}. Bottom 2/3 contains {subject}."
    max_chars_recommended: 220    # empirical ceiling for hard-ask survival
    forbid:
      # Vocabulary that belongs in tokens, NOT in the prompt:
      - brand names ("Lossless", "Content Farm")
      - color names ("cyan", "aquamarine", "dark")
      - aesthetic adjectives ("vibrant-minimal", "build-in-public")
      - texture descriptors ("paper-cut", "isometric", "atmospheric")
      # All of the above are already locked via style_reference_images +
      # color_palette + style_type. Repeating them in the prompt only
      # dilutes the model's attention budget for the actual subject.
---

# Content Farm — Design System

> The runtime source of truth is `src/layouts/BaseLayout.astro`'s `:root` block,
> which defines the CSS custom properties consumed by every page-scoped style.
> This document is the **human- and agent-readable** contract that explains the
> system's intent. Keep the two in sync when either changes.

## Brand & Style

Content Farm is a pseudomonorepo of small Obsidian plugins ("a small farm of writing tools"). The splash site is the gallery: a single index page that lists the plugins, plus one dedicated landing page per plugin once a plugin becomes complex enough to deserve its own URL (today: only `/perplexed/`).

The aesthetic is **dark vibrant-minimal**: a near-black canvas (`#0a0a0f`) with a subtle multi-stop mesh-gradient and a faint grid overlay; brand-cyan and aquamarine as the primary accents; monospace headlines and command-palette-flavored UI cues throughout. The emotional register is *engineered but inviting* — work-in-public, deliberately built, never marketingese.

Tone calibration:

- **Confident, not loud.** Glows are present but understated; gradients are accents, not backgrounds. The hero is the only place a full-volume gradient text appears.
- **Build-in-public energy.** Specs, plans, and chores live in `context-v/`; the splash reflects that posture by treating product narrative and engineering changelog as adjacent surfaces, not separate audiences.
- **Command-palette literacy.** The Cmd-P teaser, the kbd-block visual treatment on commands, and the per-plugin "see the command palette entry" framing are the consistent metaphor. If a new component needs to teach a user *how it feels to use the plugin*, lean on the palette metaphor first.

## Colors

The palette is rooted in a single near-black surface and a single brand accent; everything else is either a tonal layer, an alpha variant, or a supporting accent for differentiation across card grids.

- **Surface — Void (`#0a0a0f`):** The body background. Sits beneath the fixed `.bg-mesh` element that paints a triple radial-gradient (cyan top-left, magenta top-right, aquamarine bottom-center) and a faint grid overlay.
- **Surface — Soft (`#11111a`):** One tonal step up; reserved for sections that need a perceptible "panel" treatment without leaving the dark canvas.
- **Surface — Elevated (`#161623`):** Used for the palette window, modals, and the Cmd-P teaser shell. The "highest" non-card surface.
- **Surface — Card (`rgba(22, 22, 35, 0.65)`):** All cards (plugin cards, core cards, surface cards, primitives, install/pipeline/changelog items) use this translucent variant of surface-elevated. The transparency lets the mesh-gradient bleed through subtly on edges.
- **Primary — Brand Cyan (`#04e5e5`):** The primary accent. Drives focus rings, command-palette cursor color, primary CTAs, accent borders. Used sparingly so it always reads as "this is the action / this is meaningful."
- **Primary Soft — Aquamarine (`#6fffd6`):** Partner to brand cyan; together they form the signature `linear-gradient(120deg, ...)` used on the primary CTA, hero gradient text, and the headline gradient.
- **Accent — Magenta (`#bf23f7`):** Secondary accent. Used on the editorial-stance callout and on the "magenta" core-card variant. Signals "noteworthy" or "alternate-track."
- **Accent — Violet (`#7c5cff`):** Tertiary accent. Used on the "violet" core-card and surface-card variants for differentiation when four parallel cards need four readable identities.
- **Text — On Surface (`#f1f5f9`):** Body text, headings, primary copy.
- **Text — Soft (`#cbd5e1`):** Descriptions and section ledes.
- **Text — Dim (`#94a3b8`):** Captions, eyebrows, metadata, weakest tags.
- **Text — Dimmer (`#64748b`):** Reserved; used today only on the share-button "feedback" tooltip and changelog dates.

**Borders.** Three levels of border alpha tune the visual weight of every box:

- `--clr-border` (white at 8% alpha): default; most cards.
- `--clr-border-strong` (white at 16% alpha): pills, kbd blocks, palette-window outer edge.
- `--clr-border-accent` (cyan at 35% alpha): hover / focus borders on interactive cards.

**Status pills** carry their own tinted background-and-border combination (stable=aquamarine, beta=cyan, alpha=magenta, experiment=violet), all at ~8% fill and ~40% border alpha, so they coexist with the dark surface without becoming louder than primary CTAs.

## Typography

Two families. **Inter** for prose (`body-*`, `headline-lg`). **JetBrains Mono** for everything that should feel "engineered": headlines on per-component cards, eyebrows, command-palette mimicry, pills, kbd-blocks, and CTA button labels. The mono-in-headlines choice is deliberate — it's the cue that this site is a developer-facing surface, not a marketing landing.

- **Display Hero (`display-hero`):** The plugin landing-page H1 (e.g. "perplexed"). JetBrains Mono 700 at `clamp(2.5rem, 6vw, 4rem)`, tight `-0.04em` letter-spacing, line-height 1.05. This is the only place the mono headline reaches its full size.
- **Headline LG (`headline-lg`):** Section H2 across the site. Inter 700 at `clamp(1.875rem, 3.5vw, 2.5rem)`. Sans-serif here for readability when the H2 carries the section's persuasive lede.
- **Headline MD/SM (`headline-md`, `headline-sm`):** Card titles. Back to JetBrains Mono — these label discrete components, so the mono treatment reads as "name of a thing."
- **Body LG / MD / SM:** Inter at 1.25rem / 1rem / 0.9rem, line-height 1.5–1.65. Section ledes use body-lg or body-md; card descriptions use body-sm.
- **Mono MD / SM:** Default for everything in the "Cmd-P aesthetic" — kbd-block keys, command-palette result lines, pill text, footer link rail.
- **Label Eyebrow (`label-eyebrow`):** The 0.75rem, 0.16em letter-spaced uppercase that introduces every section ("THE PARADIGM," "WHAT YOU CAN DO," etc.). Always in `--clr-text-dim`. Provides rhythm — the eye anchors on these before the H2 lands.
- **Label Pill (`label-pill`):** 0.7rem at 0.06em — tighter than eyebrow because pills sit in tight UI spaces.

**Reading-width convention.** Section ledes cap at 65ch via `.section-lede { max-width: 65ch }`. Section heads themselves now span the container width (no max-width on the wrapper) so headlines don't wrap mid-phrase — only the lede paragraph keeps a reading column.

## Layout & Spacing

A **fixed-max-width** layout: every page wraps content in `.container { max-width: 1200px; padding-inline: 24px; margin-inline: auto; }`. The 1200px ceiling matches the typical "comfortable on a 14-inch laptop, breathes on a 27-inch monitor" target.

**Vertical rhythm.** Every section under `.perplexed-landing` gets `padding-block: var(--space-12)` (48px top, 48px bottom). The hero and foot sections override with `var(--space-16)` (64px) for slightly more presence. This produces consistent inter-section gaps of **96px** regardless of how visually heavy each section's content is — the cure for the "messaging crowded by adjacent illustration" failure mode the first draft hit.

**Section-internal rhythm.** Inside a section: the section-head has `margin-bottom: var(--space-12)` (48px) before the first grid or table. Section-head children (`eyebrow → h2 → lede`) use `var(--space-3)` and `var(--space-4)` to step down naturally.

**Grid gap convention:**

- **2-column card grids** (cores, surfaces): `gap: var(--space-4)` (16px).
- **3-column card grids** (primitives, customize): `gap: var(--space-6)` (24px). Wider gap because neighbors are closer; without the bump the cards crowd.

**Centered content** uses `width: 100%; max-width: <N>; margin-inline: auto;` (explicit, not the `margin: 0 auto` shorthand). When two centered blocks live in the same section, they share a `max-width` so their left/right edges align (e.g. the templates-table and the editorial-stance callout both at 920px).

**Container padding.** `.container` reserves `var(--space-6)` (24px) on each side. This is the minimum air between any content and the viewport edge — never let an element extend past that gutter.

## Elevation & Depth

The system is **mostly flat**, with depth conveyed through **tonal layers and accent glow** rather than heavy box shadows. Three signals:

1. **Tonal layering.** Surface-base (body) → surface-card (cards at 65% alpha over surface-elevated) → surface-elevated (palette window). Each layer reads as "one shelf up" without needing a drop shadow.
2. **Border accents on hover.** Cards transition `border-color` to `--clr-border-accent` (cyan 35%) on hover, plus a `transform: translateY(-2px)` lift. No shadow on this hover — the border-color shift is the affordance.
3. **Cyan glow shadow as the brand's "weight."** Reserved for two contexts: the primary CTA button at full size (`box-shadow: var(--shadow-glow-cyan)`) and the palette window (`box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), var(--shadow-glow-cyan)`). Anywhere else, glow is opt-in — never default. At card-scale, the CTA button drops the resting glow and shows it only on hover, so the button doesn't compete with the GitHub-icon button next to it.

The fixed `.bg-mesh` element provides ambient depth via three soft radial gradients (~12% opacity each) and a faint 64×64 grid overlay masked toward the top of the viewport. This sits at `z-index: 0` with `pointer-events: none`; everything else is `z-index: 1`. The mesh is the only ambient lighting; do not add a second layer of background gradient.

## Shapes

The shape language is **moderately rounded with sharp typography**. Four levels in the `rounded` scale plus `full`:

- **`sm` (6px):** Tags, the kbd-block tokens, palette-prompt badge. Reserved for the smallest interactive surfaces.
- **`md` (12px):** Standard cards (privacy card, install items, pipeline items, changelog items, the customize-card cluster).
- **`lg` (18px):** Headline cards (plugin cards, core cards, surface cards, templates table, callout, palette window). The "main attraction" cards on every page.
- **`xl` (28px):** Reserved for hero-scale containers; not currently used in the splash but the token is available.
- **`full` (9999px):** Pills, status badges, CTA buttons (pill-shape), icon buttons (perfect circle at 36px size).

**Border thickness.** All borders are 1px solid by default; the editorial-stance callout uses an asymmetric 3px purple left-border atop the 1px overall border to signal "set-aside content." The templates table uses a 3px colored left-edge inside each row (via `::before`) for per-row accent.

**Icons.** Use SVG icons with `stroke-width: 2`, rounded line-caps and joins (the share button is the canonical example). The GitHub icon is the only filled SVG — Octocat is a brand mark and renders correctly only as a filled glyph.

## Components

### CtaButton (the primary CTA)

The reusable primary action button. Lives at `src/components/basics/CtaButton.astro`. Three variants:

- **Primary:** Cyan→aquamarine gradient, dark text (`--clr-bg`), `box-shadow: var(--shadow-glow-cyan)`. Pill-shaped. `padding: 12px 22px`, `font-size: 0.875rem`, JetBrains Mono 600. On hover: lifts 1px, glow shadow intensifies.
- **Ghost:** Translucent surface (`rgba(255,255,255,0.04)`), light text, strong-border outline. Pairs with primary as a "secondary action" inline.
- **Link:** No surface, dim text. For tertiary inline actions.

**Card-scope override.** Inside `.card-foot`, the primary CTA tightens to `padding: 7px 16px` and `font-size: 0.78rem`, and *drops the resting glow shadow* (hover keeps a soft `0 4px 12px` glow). This keeps the card-scale button visually quiet next to the muted GitHub icon button it sits beside.

### PluginCard

The card on the splash index. Translucent surface-card background, 18px radius, 24px padding. Internal flex-column layout with the card-link wrapping the body (header / lede / tags) and the footer as a sibling so the footer's buttons aren't anchors-inside-anchor.

**Footer composition:**

- **GitHub icon button:** Always rendered when `repo` is present. 36×36 round, `rgba(10,10,15,0.55)` background, dim text → brightens to card accent on hover.
- **CTA button (primary):** Rendered only when `landingHref` is supplied (today: only the perplexed plugin). Sits to the right of the GitHub icon.

**Card-link target precedence:** explicit `href` prop → `landingHref` → `repo`. So perplexed's whole card body clicks through to `/perplexed/`; everyone else's clicks through to GitHub. The GitHub icon in the footer is always the explicit route to the repo.

**Top-right share button** (sibling of card-link) implements the Web Share API with a clipboard fallback. Same round 32×32 shape as the GitHub icon; same hover treatment.

**Featured variant** adds a 135deg cyan + magenta tint gradient over the surface-card background, plus a larger `card-title` size (1.5rem). Used for the plugin marked `featured: true` in `plugin-highlights/*.md` frontmatter.

### Core / Primitive / Surface cards

The three card-family variants used on the perplexed landing. All share the same surface treatment (surface-card background, 18px radius, 24px padding) but carry different accent stripes:

- **Core cards** (`.core--cyan`, `.core--magenta`, `.core--aqua`, `.core--violet`): a `--accent` token drives the eyebrow color and command-list highlight.
- **Surface cards** (`.surface--cyan/magenta/aqua/violet`): same accent system, plus a `--accent`-colored bullet glyph (`▸`) on each control-list item.
- **Primitive cards** (3-step "Template / Commands / Cleanup pipeline" trio): cyan step number, no per-card accent.

### Palette window (Cmd-P teaser)

A faux command-palette window: 760px max-width, surface-elevated background, 18px radius, with a top "bar" containing the `⌘P` prompt and a blinking cyan cursor, then a list of fake palette results. The first result row has a subtle cyan tint background (`rgba(4,229,229,0.06)`) to imply "this is the highlighted result." This metaphor recurs throughout the site — when a section needs to *show* an interaction, it uses this window pattern.

### Pill (status indicator)

Pill-shaped (radius: full), JetBrains Mono 0.7rem at 0.06em letter-spacing. Four `data-status` variants (Stable / Beta / Alpha / Experiment), each with an 8%-fill background and ~40% border-alpha in its own accent color. Never put more than one status pill on a card.

### kbd-block

The small monospace "⌘P" badge used to indicate command-palette entries. Inline-flex, `padding: 2px 6px`, JetBrains Mono 0.7rem, surface-card background with a strong border. Always pairs with a `.kbd-cmd` (full command name) inline. The pair reads as a single "command line" affordance.

### Editorial-stance callout

A purple-bordered set-aside card used when prose needs to call out a decision-rule that travels with the system (e.g., the anti-incumbent attribution rule). 920px max-width to align with the templates-table above it. 1px overall border + 3px purple left-border. Carries an eyebrow in `--clr-purple` and a small italic foot paragraph for "why this matters."

## Imagery

All Content Farm imagery is generated via Ideogram's v3 generate endpoint. The frontmatter's `imagery:` block is the **complete, locked recipe**: every field there is constant across every request. The only two things that vary per call are the `prompt` (the subject and its composition) and the `aspect_ratio` (one entry from the `imagery.aspect_ratios` enum).

This is on purpose. The single biggest cause of "why don't these four banners look like they belong together" is per-request drift in brand vocabulary, palette wording, and style adjectives smuggled into the prompt. Ideogram's v3 schema gives us structured channels for all of that — `style_reference_images`, `color_palette`, `style_type`, `magic_prompt` — and using them is strictly more reliable than typing the same adjectives into every prompt and hoping the model interprets them the same way twice.

### The locked channels (don't touch per request)

- **`style_reference_images`** — `public/ogimage__Content-Farm--Default.png` uploaded with every request. This is the canonical aesthetic anchor: warm cream subject on a desaturated cyan/violet atmospheric gradient, isometric paper-cut texture, soft chromatic depth. The v3 docs describe this as the strongest available consistency signal; in our case it carries every texture decision so the prompt doesn't have to.
- **`color_palette.members`** — the five-token weighted palette in the frontmatter. Surface-base dominates (0.45) so the dark canvas is the default ground; brand cyan + aquamarine carry the brand glow; magenta provides selective accent; cream is reserved for the subject pass-through.
- **`style_type: AUTO`** — required whenever `style_reference_images` is uploaded. The v3 API enforces mutual exclusion: `DESIGN` / `REALISTIC` / `FICTION` are rejected when a style reference is present (the reference image carries those aesthetic decisions anyway). `AUTO` lets the reference image drive style, which is what we want.
- **`magic_prompt: OFF`** — non-negotiable. With magic_prompt on, Ideogram rewrites your prompt before generation, which produces visible drift across "identical" runs. Off keeps the prompt verbatim and consistency holds.
- **`negative_prompt`** — short on purpose. The current set excludes `text, typography, lettering, logos, watermarks, central subject filling frame, photorealistic human faces, saturated, rainbow, vibrant, oversized subject, subject in top half`. The "central subject filling frame" and "subject in top half" exclusions are what preserve negative space for the SVG overlay; "subject in top half" was added after iter2 observation that the model keeps growing the subject up into the overlay zone. "saturated / rainbow / vibrant" were added when the multi-hex `color_palette` got interpreted as "make it colorful" rather than "weight these colors this way."
- **`seed: 1138`** — fixed canonical seed. With every other parameter locked, the seed carries the last fraction of consistency between requests. Override only when iterating a single prompt at low cost (`rendering_speed: TURBO`); bump the locked default only when the visual canon itself shifts (rebrand, new reference image).
- **`rendering_speed: QUALITY`** — for production assets. Use `TURBO` or `FLASH` only during prompt iteration to keep costs sane.

### The variable channels (the only things you change)

- **`prompt`** — one sentence. Two ingredients only:
  1. **Subject.** What the image depicts ("Isometric sprout growing from a stack of paper-cut tiles", "Three nested cubes rising from a horizon line", "A spool of thread unwinding into a typeset block of characters").
  2. **Composition — empty space as a first-class subject.** Lead the prompt with the empty region. State explicitly that the top region is empty negative space, and give that region its own concrete content (a "dark gradient sky", a "soft horizon glow", a "muted atmospheric backdrop"). Then state what fills the bottom region. The model treats both clauses as things to render — the sky is just as describable as the quill — and the subject can't grow up into the overlay zone because the sky is already there occupying it.

     **Bad (iter1, iter2):** subject-first framing. *"…in the lower third of the frame, top two-thirds open."* The model focused on rendering the subject correctly and treated the empty region as residual; the subject ballooned to ~85% canvas height.

     **Good (iter3):** empty-space-first framing. *"Top 1/3 of frame is empty negative space, dark gradient sky. Bottom 2/3 contains an isometric quill pen…, growing from a stack of paper-cut card tiles."* Two zones, two renderings, explicit numeric split. Subject stayed contained; overlay zone stayed empty.

     **Three rules that survive aspect-ratio changes:**
     - **Lead with the empty region**, not the subject — first sentence describes what's empty (and what content fills that emptiness, like a sky).
     - **Use explicit numeric proportions** ("top 1/3 / bottom 2/3"), not soft terms ("lower portion", "below the horizon").
     - **Reinforce in `negative_prompt`**: append the failure mode you observed (e.g., `subject in top half`). This actively penalizes growing the subject up.

  Target ≤220 characters. Past that, hard composition asks start losing to subject elaboration. If a prompt is creeping past 220, the right move is almost always to trim the subject elaboration, not the composition clause.

- **`aspect_ratio`** — pick from `imagery.aspect_ratios`. Mapping by use case:

  | Format key | Ideogram value | Use for |
  |---|---|---|
  | `banner` | `16x9` | Default share — OpenGraph, Twitter Cards, Slack unfurls |
  | `portrait` | `4x5` | LinkedIn portrait, Instagram feed post |
  | `portrait_tall` | `9x16` | Instagram Stories, Reels, TikTok |
  | `square` | `1x1` | Avatars, square OG fallbacks, Discord embed |
  | `banner_tall` | `3x4` | WhatsApp + iMessage chat-preview cards (the default tall) |
  | `banner_tall_max` | `2x3` | Same use as `banner_tall` when you want extra vertical drama |

### What a request looks like

Every Content Farm image generation, in full:

```http
POST https://api.ideogram.ai/v1/ideogram-v3/generate
Content-Type: multipart/form-data
Api-Key: $IDEOGRAM_API_KEY

prompt:                 "Top 1/3 of frame is empty negative space, dark
                         gradient sky. Bottom 2/3 contains an isometric
                         sprout growing from a stack of paper-cut tiles."
aspect_ratio:           16x9                                    # ← from enum
style_type:             AUTO                                    # locked — must be AUTO when style_reference_images is uploaded
magic_prompt:           OFF                                     # locked
rendering_speed:        QUALITY                                 # locked
seed:                   1138                                    # locked
negative_prompt:        "text, typography, lettering, logos, watermarks,
                         central subject filling frame, photorealistic
                         human faces, saturated, rainbow, vibrant,
                         oversized subject, subject in top half"   # locked
color_palette:          { "members": [ … 5 weighted members … ] }  # locked
style_reference_images: <upload public/ogimage__Content-Farm--Default.png>  # locked
```

A second request (different format, different subject) changes exactly two lines:

```diff
- prompt:        "Top 1/3 of frame is empty negative space, dark gradient sky. Bottom 2/3 contains an isometric sprout growing from a stack of paper-cut tiles."
+ prompt:        "Top 1/3 of frame is empty negative space, dark gradient sky. Bottom 2/3 contains three nested transparent cubes drifting above a horizon line."
- aspect_ratio:  16x9
+ aspect_ratio:  4x5
```

Everything else — style reference, palette, negative prompt, seed, rendering speed, style type, magic prompt flag — is byte-for-byte identical. That's what produces a coherent family.

### Anti-patterns

- **Putting brand or palette words in the prompt.** "Lossless cyan, dark vibrant-minimal, paper-cut isometric…" — every word here competes with the actual subject. The locked channels already encode this; repeating it costs accuracy on the composition ask.
- **Long negative prompts.** Each token in `negative_prompt` is also a competitor for attention. Stay close to the locked seven-token list.
- **Varying `magic_prompt` across requests.** This single flag is the largest source of "why don't these match." If you turn it on for one request, every other request in the set must turn it on too — and you should expect more drift.
- **Varying the seed across requests in the same set.** Different seeds produce different visual interpretations of identical parameters. Only override the seed when you're knowingly iterating one prompt at a time.
- **Subject-first framing for overlay-bearing imagery.** Saying *"subject in the lower third"* alone is not strong enough — the subject grows up into the overlay zone regardless. **Lead with the empty region as a first-class rendered subject** ("Top 1/3 of frame is empty negative space, dark gradient sky.") and put the actual subject in the second clause. Reinforce in `negative_prompt` with the specific failure mode (`subject in top half`). The lesson from iter1–iter3: empty space won't be left as residue; it has to be declared, named, and given content.

## Do's and Don'ts

- **Do** use monospace headlines on per-component cards and Inter on section H2s. The split is intentional: section H2s persuade, card headlines name.
- **Do** keep the primary CTA's full-volume glow shadow only at hero scale. Card-scale CTAs must drop the resting glow; hover restores a softer version.
- **Do** match card widths across a section so their left and right edges align (e.g., templates-table at 920px → editorial-stance callout at 920px).
- **Do** use the brand cyan as a focus / action color, sparingly enough that every appearance reads as meaningful.
- **Do** lean on the Cmd-P palette metaphor when teaching a user *what it feels like to use the plugin*.

- **Don't** introduce a third typeface. Inter and JetBrains Mono are the system.
- **Don't** hard-code color values in component styles. Always reference the CSS custom properties (which mirror the `colors:` tokens above). The day a light or vibrant mode lands in `BaseLayout`, components that used tokens will compose correctly; components that hard-coded won't.
- **Don't** add a second background gradient layer; the fixed `.bg-mesh` is the only ambient lighting.
- **Don't** use `margin: 0 auto` shorthand for centered content. Use the explicit `width: 100%; margin-inline: auto;` pair. It removes auto-margin shorthand ambiguity and produces predictable rhythm when sibling blocks have different `max-width`s.
- **Don't** mix card padding scales within a card grid. All card primitives on this site use `padding: var(--space-6)` (24px). Sub-card padding (e.g., the install-item leading number column) inherits that scope.
- **Don't** place buttons inside `<a>` wrappers. The PluginCard pattern (card-link wraps content; footer is a sibling with explicit buttons) is the model — anchor-in-anchor is invalid HTML and breaks Web Share API.
- **Don't** ship more than 2 font weights from a single family on the same page. The system pre-loads Inter 400/500/600/700/800 and JetBrains Mono 400/500/600; use the lightest weight that conveys the hierarchy.
