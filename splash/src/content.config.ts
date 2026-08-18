import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readFile, glob as fsGlob } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseFrontmatter } from '@loaders/frontmatter';

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

// ─── Roll-up paths ───────────────────────────────────────────────────────────
// Astro runs this from the splash/ directory.
//
// Local content (content-farm's own changelog/ and context-v/) is read directly
// from the parent directory — no sync needed, edits show up immediately.
//
// Submodule content (rolled up from plugins via the GitHub Content API) lives
// at splash/src/rollup/ after `pnpm rollup:sync`. Build is pure file IO; no
// API, no auth, no rate limits.

const SPLASH_DIR = process.cwd();
const PARENT_DIR = resolve(SPLASH_DIR, '..');
const PARENT_CHANGELOG = resolve(PARENT_DIR, 'changelog');
const PARENT_CONTEXT_V = resolve(PARENT_DIR, 'context-v');
const ROLLUP_CHANGELOG = resolve(SPLASH_DIR, 'src', 'rollup', 'changelog');
const ROLLUP_CONTEXT_V = resolve(SPLASH_DIR, 'src', 'rollup', 'context-v');

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

// ─── Function loader: union local parent + synced rollup ─────────────────────

interface UnionLoaderOptions {
  /** Absolute path to local parent content directory. */
  localDir: string;
  /** Absolute path to the synced rollup directory. */
  rollupDir: string;
  /** Logical name for the collection — used in id and log lines. */
  collectionName: string;
  /** Provenance for files found at localDir. Defaults to 'content-farm'. */
  localProvenance?: string;
}

function unionLoader(options: UnionLoaderOptions) {
  return {
    name: `union-loader:${options.collectionName}`,
    load: async ({ store, parseData, logger }: any): Promise<void> => {
      store.clear();

      let local = 0;
      let rolled = 0;
      let skipped = 0;

      // 1. Local parent content (content-farm's own).
      try {
        for await (const file of fsGlob('**/*.md', { cwd: options.localDir })) {
          const abs = resolve(options.localDir, file);
          const text = await readFile(abs, 'utf8');
          const { data, body } = parseFrontmatter(text);
          const provenance = options.localProvenance ?? 'content-farm';
          const idBase = file.replace(/\.md$/, '');

          if (data.publish === false) {
            skipped++;
            continue;
          }

          const merged = {
            ...data,
            from: data.from ?? provenance,
            from_path: data.from_path ?? file,
          };

          const parsed = await safeParse({ id: `${provenance}/${idBase}`, data: merged }, parseData, logger);
          store.set({ id: `${provenance}/${idBase}`, data: parsed, body });
          local++;
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }

      // 2. Synced submodule rollup.
      try {
        for await (const file of fsGlob('**/*.md', { cwd: options.rollupDir })) {
          if (file === 'README.md' || file.endsWith('/README.md')) continue;
          const abs = resolve(options.rollupDir, file);
          const text = await readFile(abs, 'utf8');
          const { data, body } = parseFrontmatter(text);
          const idBase = file.replace(/\.md$/, '');

          if (data.publish === false) {
            skipped++;
            continue;
          }

          // The rollup dir is laid out as <plugin>/<rest>; the synced files
          // already carry from / from_path frontmatter we injected at sync
          // time. Trust those.
          const id = idBase;

          const parsed = await safeParse({ id, data }, parseData, logger);
          store.set({ id, data: parsed, body });
          rolled++;
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }

      logger.info(
        `[union:${options.collectionName}] ${local} local + ${rolled} rolled-up — ${skipped} skipped(publish:false). Run \`pnpm rollup:sync\` to refresh rolled-up content.`,
      );
    },
  };
}

async function safeParse(
  args: { id: string; data: unknown },
  parseData: (a: { id: string; data: unknown }) => Promise<unknown>,
  logger: { warn: (msg: string) => void },
): Promise<Record<string, unknown>> {
  try {
    return (await parseData(args)) as Record<string, unknown>;
  } catch (err) {
    logger.warn(`schema couldn't validate ${args.id} (${(err as Error).message}); storing raw frontmatter.`);
    return { ...(args.data as Record<string, unknown>) };
  }
}

// ─── Collections ─────────────────────────────────────────────────────────────

const changelog = defineCollection({
  loader: unionLoader({
    collectionName: 'changelog',
    localDir: PARENT_CHANGELOG,
    rollupDir: ROLLUP_CHANGELOG,
  }),
  schema: changelogSchema,
});

const contextV = defineCollection({
  loader: unionLoader({
    collectionName: 'context-v',
    localDir: PARENT_CONTEXT_V,
    rollupDir: ROLLUP_CONTEXT_V,
  }),
  schema: contextVSchema,
});

export const collections = {
  'plugin-highlights': pluginHighlights,
  changelog,
  'context-v': contextV,
};
