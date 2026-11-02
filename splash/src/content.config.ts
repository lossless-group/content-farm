import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { corpusLoader, locateChangelog, locateContextV } from '@loaders/corpusLoader';

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

const lenientDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
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

// ─── Schemas — every field optional, passthrough preserves the rest ─────────

const provenanceFields = {
  /** Source: 'content-farm' for parent-authored entries, plugin slug otherwise. */
  from: lenientString,
  /** Path within the originating repo's content root. */
  from_path: lenientString,
  /** True when the entry came from a legacy fallback path (context-v/changelogs/). */
  legacy: lenientBoolean,
};

const changelogSchema = z
  .object({
    ...provenanceFields,
    title: lenientString,
    lede: lenientString,
    summary: lenientString,
    description: lenientString,
    date: lenientDate,
    date_created: lenientDate,
    // Editorial pair — declared so they coerce to Date like the other date
    // fields. Undeclared they arrive as raw strings via .passthrough(), and
    // any chain falling through to them hands a string to .toISOString().
    date_authored_initial_draft: lenientDate,
    date_authored_current_draft: lenientDate,
    date_modified: lenientDate,
    date_first_published: lenientDate,
    // Release narratives (changelog/releases/<version>.md) carry this one.
    // Declared for the same reason as the editorial pair above: undeclared it
    // arrives as a raw string through .passthrough(), and any date chain that
    // falls through to it hands a string to .toISOString().
    date_last_updated: lenientDate,
    tags: lenientStringArray,
    authors: lenientStringArray,
    publish: lenientBoolean,
    status: lenientString,
    at_semantic_version: lenientString,
    augmented_with: lenientStringArray,
    files_changed: lenientStringArray,
    // Release-narrative discriminators. `category: Release` is what separates a
    // release page from a dated ship note in the same feed — declared so a
    // filter or highlight treatment can rely on it rather than fishing it out
    // of passthrough data.
    category: lenientString,
    release_tag: lenientString,
  })
  .passthrough();

const contextVSchema = z
  .object({
    ...provenanceFields,
    title: lenientString,
    lede: lenientString,
    description: lenientString,
    purpose: lenientString,
    date_created: lenientDate,
    // Editorial pair — declared so they coerce to Date like the other date
    // fields. Undeclared they arrive as raw strings via .passthrough(), and
    // any chain falling through to them hands a string to .toISOString().
    date_authored_initial_draft: lenientDate,
    date_authored_current_draft: lenientDate,
    date_modified: lenientDate,
    // `date_last_updated` is the canonical 'any touch' key (35 files use it).
    // `date_updated` was declared here but appears in zero documents.
    date_last_updated: lenientDate,
    last_verified: lenientDate,
    authors: lenientStringArray,
    tags: lenientStringArray,
    status: lenientString,
    semantic_version: lenientString,
    publish: lenientBoolean,
    augmented_with: lenientStringArray,
    applies_to: lenientString,
  })
  .passthrough();

// changelog and context-v are read from GitHub when the site builds. See
// src/loaders/corpus.ts.

// ─── Collections ─────────────────────────────────────────────────────────────

const changelog = defineCollection({
  loader: corpusLoader({ name: 'changelog', locate: locateChangelog }),
  schema: changelogSchema,
});

const contextV = defineCollection({
  loader: corpusLoader({ name: 'context-v', locate: locateContextV }),
  schema: contextVSchema,
});

export const collections = {
  'plugin-highlights': pluginHighlights,
  changelog,
  'context-v': contextV,
};
