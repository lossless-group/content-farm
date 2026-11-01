import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ─── Lenient preprocessors ───────────────────────────────────────────────────
// Frontmatter spans many months and many hands. Coerce gracefully; never throw.

const lenientString = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().optional(),
);

const lenientStringArray = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return [v];
    return v;
  },
  z.array(z.string()).optional(),
);

const lenientNumber = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.number().optional(),
);

const lenientBoolean = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.boolean().optional(),
);

// ─── Plugin highlights (local, curated) ──────────────────────────────────────

const pluginHighlights = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/plugin-highlights' }),
  schema: z
    .object({
      title: lenientString,
      lede: lenientString,
      order: lenientNumber,
      status: lenientString,
      repo: lenientString,
      icon: lenientString,
      featured: lenientBoolean,
      tags: lenientStringArray,
      /** "ours" (default) or "inspirational" — drives section grouping on the index. */
      category: lenientString,
      /**
       * URL on community.obsidian.md when the plugin has been accepted into
       * Obsidian's Community Plugins directory. Presence of this field is
       * the visual differentiator on the index — published plugins get a
       * "Community Plugin" pill and an Obsidian-icon link next to GitHub.
       */
      community_url: lenientString,
    })
    .passthrough(),
});

// changelog and context-v are live collections: see src/live.config.ts.

export const collections = {
  'plugin-highlights': pluginHighlights,
};
