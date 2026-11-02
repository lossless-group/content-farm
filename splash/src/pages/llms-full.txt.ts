/**
 * /llms-full.txt — concatenated raw markdown of every published corpus entry.
 *
 * Spec: https://llmstxt.org/
 *
 * The human-editable prose template for this file lives at
 * `splash/src/llms/llms-full.md` (with token documentation in
 * `splash/src/llms/README.md`). This file is the dumb assembler: it loads
 * the template, gathers the corpus bodies, and substitutes tokens. To tweak
 * voice or framing, edit the markdown — not this file.
 *
 * content-farm concatenates three collections in order: plugin-highlights
 * (the curated catalog), then changelog, then context-v. Within each
 * collection, entries are sorted by `from` (provenance) then alphabetically
 * by title so the file diffs cleanly across builds.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_NAME } from '../lib/seo';
import template from '../llms/llms-full.md?raw';

type Kind = 'plugin' | 'changelog' | 'context-v';

interface Section {
  kind: Kind;
  urlPath: 'plugins' | 'changelog' | 'context-v';
  entries: Array<{ id: string; data: any; body?: string }>;
}

export const GET: APIRoute = async () => {
  const site = import.meta.env.SITE ?? 'https://lossless-group.github.io';
  const base = import.meta.env.BASE_URL ?? '/';
  const root = new URL(base, site).toString().replace(/\/$/, '');

  // Plugins — sort by order then alpha (matches the splash gallery).
  const plugins = (await getCollection('plugin-highlights')).slice().sort((a, b) => {
    const orderA = (a.data as any).order ?? 999;
    const orderB = (b.data as any).order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const ta = ((a.data as any).title ?? a.id).toLowerCase();
    const tb = ((b.data as any).title ?? b.id).toLowerCase();
    return ta.localeCompare(tb);
  });

  // Changelog — published only; sort by from, then date desc, then title.
  const changelogAll = await getCollection('changelog');
  const changelogPublished = changelogAll.filter((e) => (e.data as any).publish !== false);
  changelogPublished.sort((a, b) => {
    const fa = ((a.data as any).from || 'content-farm').toLowerCase();
    const fb = ((b.data as any).from || 'content-farm').toLowerCase();
    if (fa !== fb) return fa.localeCompare(fb);
    const da = (a.data as any).date_modified ?? (a.data as any).date_created ?? (a.data as any).date ?? (a.data as any).date_authored_current_draft ?? (a.data as any).date_authored_initial_draft;
    const db = (b.data as any).date_modified ?? (b.data as any).date_created ?? (b.data as any).date ?? (b.data as any).date_authored_current_draft ?? (b.data as any).date_authored_initial_draft;
    const ta = da ? new Date(da).getTime() : 0;
    const tb = db ? new Date(db).getTime() : 0;
    if (ta !== tb) return tb - ta;
    const titleA = ((a.data as any).title ?? a.id).toLowerCase();
    const titleB = ((b.data as any).title ?? b.id).toLowerCase();
    return titleA.localeCompare(titleB);
  });

  // Context-V — published only; sort by from, then title alpha.
  const contextVAll = await getCollection('context-v');
  const contextVPublished = contextVAll.filter((e) => (e.data as any).publish !== false);
  contextVPublished.sort((a, b) => {
    const fa = ((a.data as any).from || 'content-farm').toLowerCase();
    const fb = ((b.data as any).from || 'content-farm').toLowerCase();
    if (fa !== fb) return fa.localeCompare(fb);
    const ta = ((a.data as any).title ?? a.id).toLowerCase();
    const tb = ((b.data as any).title ?? b.id).toLowerCase();
    return ta.localeCompare(tb);
  });

  const sections: Section[] = [
    { kind: 'plugin', urlPath: 'plugins', entries: plugins as any },
    { kind: 'changelog', urlPath: 'changelog', entries: changelogPublished as any },
    { kind: 'context-v', urlPath: 'context-v', entries: contextVPublished as any },
  ];

  const bodyParts: string[] = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      const data = entry.data as any;
      const title = data.title ?? entry.id;
      const from = data.from || (section.kind === 'plugin' ? entry.id : 'content-farm');
      const sourcePath = data.from_path || data.source_relative_path || entry.id;
      const url = `${root}/${section.urlPath}/${entry.id}/`;

      bodyParts.push('---');
      bodyParts.push('');
      bodyParts.push(`## ${title}`);
      bodyParts.push('');
      bodyParts.push(`- Kind: \`${section.kind}\``);
      bodyParts.push(`- Source (\`from\`): \`${from}\``);
      bodyParts.push(`- Source path: \`${sourcePath}\``);
      bodyParts.push(`- Canonical URL: ${url}`);
      const dm = data.date_modified ?? data.date_last_updated;
      if (dm) {
        const d = dm instanceof Date ? dm : new Date(dm);
        if (!Number.isNaN(d.getTime())) bodyParts.push(`- Last modified: ${d.toISOString().slice(0, 10)}`);
      }
      bodyParts.push('');
      bodyParts.push(entry.body ?? '');
      bodyParts.push('');
    }
  }

  // Distinct `from` values across rolled-up changelog + context-v.
  const allFroms = new Set<string>();
  for (const e of changelogPublished) allFroms.add(((e.data as any).from || 'content-farm'));
  for (const e of contextVPublished) allFroms.add(((e.data as any).from || 'content-farm'));

  const tokens: Record<string, string> = {
    SITE_NAME,
    PLUGIN_COUNT: String(plugins.length),
    CHANGELOG_COUNT: String(changelogPublished.length),
    CONTEXTV_COUNT: String(contextVPublished.length),
    REPO_COUNT: String(allFroms.size),
    LLMS_INDEX_URL: `${root}/llms.txt`,
    CORPUS_BODIES: bodyParts.join('\n').trimEnd(),
  };

  const body = template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : match,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
