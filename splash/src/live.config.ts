import { defineLiveCollection } from 'astro:content';
import { z } from 'astro/zod';
import { corpusLiveLoader, locateChangelog, locateContextV } from '@loaders/corpusLiveLoader';

// changelog and context-v are read from GitHub when a page is requested, so a
// new document appears without a rebuild. See src/loaders/corpus.ts.
//
// The loader validates these itself rather than handing them to Astro: Astro
// fails the whole collection on one invalid entry, and frontmatter here spans
// many months and many hands.

// ─── Lenient preprocessors ───────────────────────────────────────────────────
// Coerce gracefully; never throw.

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

const lenientBoolean = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.boolean().optional(),
);

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

// ─── Collections ─────────────────────────────────────────────────────────────

const changelog = defineLiveCollection({
  loader: corpusLiveLoader({ name: 'changelog', schema: changelogSchema, locate: locateChangelog }),
});

const contextV = defineLiveCollection({
  loader: corpusLiveLoader({ name: 'context-v', schema: contextVSchema, locate: locateContextV }),
});

export const collections = {
  changelog,
  'context-v': contextV,
};
