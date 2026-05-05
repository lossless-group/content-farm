import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Lenient preprocessors — frontmatter in this tree is hand-authored
// across many hands, so we coerce gracefully rather than throwing.

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

// Plugin highlights — the curated gallery on the index page.
// One .md per plugin under splash/src/content/plugin-highlights/.
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
    })
    .passthrough(),
});

// Pseudomonorepo's own changelog/, sibling of splash/.
// Optional — collection is empty until changelog/ accumulates files.
const changelog = defineCollection({
  loader: glob({ pattern: '*.md', base: '../changelog' }),
  schema: z
    .object({
      title: lenientString,
      lede: lenientString,
      summary: lenientString,
      description: lenientString,
      date: lenientDate,
      date_created: lenientDate,
      date_modified: lenientDate,
      date_first_published: lenientDate,
      tags: lenientStringArray,
      authors: lenientStringArray,
      publish: lenientBoolean,
      status: lenientString,
      at_semantic_version: lenientString,
    })
    .passthrough(),
});

// Pseudomonorepo's context-v/, sibling of splash/.
// Walks subdirectories (specs, plans, chores, habits, blueprints, etc.).
const contextV = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../context-v' }),
  schema: z
    .object({
      title: lenientString,
      lede: lenientString,
      description: lenientString,
      date_created: lenientDate,
      date_modified: lenientDate,
      date_updated: lenientDate,
      authors: lenientStringArray,
      tags: lenientStringArray,
      status: lenientString,
      semantic_version: lenientString,
      publish: lenientBoolean,
    })
    .passthrough(),
});

export const collections = {
  'plugin-highlights': pluginHighlights,
  changelog,
  'context-v': contextV,
};
