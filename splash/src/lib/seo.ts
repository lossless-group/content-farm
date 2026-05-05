/**
 * Site-wide SEO + OpenGraph registry for the content-farm splash.
 *
 * One source of truth for titles, descriptions, and og:image overrides.
 * Pages either pass values directly to <MetaTags> or look themselves up
 * via the helpers below.
 *
 * Defaults:
 *   - The default OG image is the local seedling-on-stack art at
 *     /ogimage__Content-Farm--Default.png (real dimensions 1408×704).
 *   - Per-plugin pages (changelog/context-v entries with a `from` slug)
 *     resolve to the plugin's `banner_image` from src/content/plugin-highlights/.
 *   - This is a public site (GitHub Pages); default robots is index,follow.
 *
 * See blueprint: lossless-monorepo/content/lost-in-public/blueprints/Maintain-an-Elegant-Open-Graph-System.md
 * See playbook:  ~/.claude/skills/astro-knots/references/playbooks/opengraph-system.md
 */

import { getCollection } from 'astro:content';

/* ──────────────────────────────────────────────────────────────────────
   Site-wide constants
   ────────────────────────────────────────────────────────────────────── */

export const SITE_NAME = 'content-farm';

export const SITE_TAGLINE =
  "A suite of Obsidian plugins for AI-augmented writing, from The Lossless Group.";

/** Path (relative to /public, base prefix applied at render time). */
export const DEFAULT_OG_IMAGE = '/ogimage__Content-Farm--Default.png';
export const DEFAULT_OG_IMAGE_WIDTH = 1408;
export const DEFAULT_OG_IMAGE_HEIGHT = 704;
export const DEFAULT_OG_IMAGE_TYPE = 'image/png';
export const DEFAULT_OG_IMAGE_ALT =
  'A seedling sprouting from a tidy stack of paper sheets — content-farm.';

/** Plugin banner_image dimensions (Image-Gin standard wide format). */
export const PLUGIN_OG_IMAGE_WIDTH = 1200;
export const PLUGIN_OG_IMAGE_HEIGHT = 630;
export const PLUGIN_OG_IMAGE_TYPE = 'image/webp';
export const PLUGIN_OG_IMAGE_ALT =
  'Plugin banner — an Obsidian community plugin from content-farm.';

/** Standard <title> suffix appended to per-page titles. */
export const TITLE_SUFFIX = 'content-farm';

/** Char limits for unfurler safety. Applied at render time. */
export const CHAR_LIMITS = {
  title: 60,
  description: 155,
} as const;

/* ──────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────── */

export interface SeoEntry {
  /** Bare title — the suffix is appended automatically. */
  title: string;
  /** <meta description>, og:description, twitter:description. */
  description: string;
  /** Override the default OG image. Path or absolute URL. */
  ogImage?: string;
}

/* ──────────────────────────────────────────────────────────────────────
   One-off / index pages
   ────────────────────────────────────────────────────────────────────── */

export const STATIC_SEO = {
  root: {
    title: 'A small farm of writing tools',
    description:
      "Nine Obsidian plugins, one vault, working in chorus. AI-assisted drafting, citations, image generation, search-augmented enhancement — and the connective tissue to keep them in step.",
  } satisfies SeoEntry,
  changelogIndex: {
    title: 'Changelog',
    description:
      'Ship notes from the content-farm pseudomonorepo. What landed across the plugins, and the spec or blueprint that asked for it.',
  } satisfies SeoEntry,
  contextVIndex: {
    title: 'Notes (context-v)',
    description:
      "Specs, plans, blueprints, chores. The thinking that underwrites the code, kept in the repo's context-v/ and rendered when marked publishable.",
  } satisfies SeoEntry,
};

/* ──────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────── */

/** Compose the final <title> by appending the suffix. */
export function buildPageTitle(title: string): string {
  if (!title) return TITLE_SUFFIX;
  if (title === TITLE_SUFFIX) return title;
  return `${title} — ${TITLE_SUFFIX}`;
}

/** Truncate at word boundary with ellipsis if over limit. */
export function truncate(s: string, limit: number): string {
  if (!s || s.length <= limit) return s;
  const cut = s.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/**
 * Map a `from` provenance value (plugin slug or 'content-farm') to its
 * banner_image URL from the plugin-highlights collection. Returns undefined
 * for 'content-farm' or any slug not present in the collection — callers
 * fall back to DEFAULT_OG_IMAGE.
 */
export async function getPluginOgImage(from: string | undefined): Promise<string | undefined> {
  if (!from || from === 'content-farm') return undefined;
  try {
    const plugins = await getCollection('plugin-highlights');
    const match = plugins.find((p) => p.id === from);
    const banner = match?.data?.banner_image;
    return typeof banner === 'string' && banner.length > 0 ? banner : undefined;
  } catch {
    return undefined;
  }
}
