/**
 * /llms.txt — index of corpus content for LLM consumers.
 *
 * Spec: https://llmstxt.org/
 *
 * The human-editable prose template for this file lives at
 * `splash/src/llms/llms.md` (with token documentation in
 * `splash/src/llms/README.md`). This file is the dumb assembler: it loads
 * the template, computes dynamic values, and substitutes tokens. To tweak
 * the voice or framing of /llms.txt, edit the markdown — not this file.
 *
 * content-farm splashes a curated plugin catalog plus rolled-up changelog
 * and context-v from each plugin submodule. The index lists all three:
 * plugins (sorted by `order`), changelog (grouped by `from`), context-v
 * (grouped by `from`). Provenance is the `from` field; this site does not
 * use `source_repo_slug`.
 *
 * Conformance note: the spec assumes the file lives at the host root
 * (https://host/llms.txt). The splash deploys under a path
 * (/content-farm/), so the file lives at
 * https://lossless-group.github.io/content-farm/llms.txt. Tools pointed
 * explicitly at that URL still work; convention-based discovery starts
 * working once `astro.config.mjs` flips `base` to '/'.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_NAME } from '../lib/seo';
import template from '../llms/llms.md?raw';

export const GET: APIRoute = async () => {
  const site = import.meta.env.SITE ?? 'https://lossless-group.github.io';
  const base = import.meta.env.BASE_URL ?? '/';
  const root = new URL(base, site).toString().replace(/\/$/, '');

  // ── Plugins (curated highlights collection) ──────────────────────────
  const plugins = (await getCollection('plugin-highlights')).slice().sort((a, b) => {
    const orderA = (a.data as any).order ?? 999;
    const orderB = (b.data as any).order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const ta = ((a.data as any).title ?? a.id).toLowerCase();
    const tb = ((b.data as any).title ?? b.id).toLowerCase();
    return ta.localeCompare(tb);
  });

  const pluginLines: string[] = [];
  for (const plugin of plugins) {
    const data = plugin.data as any;
    const title = data.title ?? plugin.id;
    const url = `${root}/plugins/${plugin.id}/`;
    const lede = data.lede ?? data.description;
    pluginLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
  }

  // ── Changelog (rolled-up; same publish gate as [...slug].astro) ──────
  const changelogAll = await getCollection('changelog');
  const changelogPublished = changelogAll.filter((e) => (e.data as any).publish !== false);

  const changelogByFrom = new Map<string, typeof changelogPublished>();
  for (const entry of changelogPublished) {
    const from = (entry.data as any).from || 'content-farm';
    if (!changelogByFrom.has(from)) changelogByFrom.set(from, [] as any);
    changelogByFrom.get(from)!.push(entry);
  }
  const changelogFroms = [...changelogByFrom.keys()].sort();
  for (const from of changelogFroms) {
    changelogByFrom.get(from)!.sort((a, b) => {
      const da = (a.data as any).date_modified ?? (a.data as any).date_created ?? (a.data as any).date ?? (a.data as any).date_authored_current_draft ?? (a.data as any).date_authored_initial_draft;
      const db = (b.data as any).date_modified ?? (b.data as any).date_created ?? (b.data as any).date ?? (b.data as any).date_authored_current_draft ?? (b.data as any).date_authored_initial_draft;
      const ta = da ? new Date(da).getTime() : 0;
      const tb = db ? new Date(db).getTime() : 0;
      if (ta !== tb) return tb - ta; // most recent first
      const titleA = ((a.data as any).title ?? a.id).toLowerCase();
      const titleB = ((b.data as any).title ?? b.id).toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }

  const changelogLines: string[] = [];
  for (const from of changelogFroms) {
    changelogLines.push(`### ${from}`);
    changelogLines.push('');
    for (const entry of changelogByFrom.get(from)!) {
      const data = entry.data as any;
      const title = data.title ?? entry.id;
      const url = `${root}/changelog/${entry.id}/`;
      const lede = data.lede ?? data.summary ?? data.description;
      changelogLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
    }
    changelogLines.push('');
  }

  // ── Context-V (rolled-up; same publish gate as [...slug].astro) ──────
  const contextVAll = await getCollection('context-v');
  const contextVPublished = contextVAll.filter((e) => (e.data as any).publish !== false);

  const contextVByFrom = new Map<string, typeof contextVPublished>();
  for (const entry of contextVPublished) {
    const from = (entry.data as any).from || 'content-farm';
    if (!contextVByFrom.has(from)) contextVByFrom.set(from, [] as any);
    contextVByFrom.get(from)!.push(entry);
  }
  const contextVFroms = [...contextVByFrom.keys()].sort();
  for (const from of contextVFroms) {
    contextVByFrom.get(from)!.sort((a, b) => {
      const ta = ((a.data as any).title ?? a.id).toLowerCase();
      const tb = ((b.data as any).title ?? b.id).toLowerCase();
      return ta.localeCompare(tb);
    });
  }

  const contextVLines: string[] = [];
  for (const from of contextVFroms) {
    contextVLines.push(`### ${from}`);
    contextVLines.push('');
    for (const entry of contextVByFrom.get(from)!) {
      const data = entry.data as any;
      const title = data.title ?? entry.id;
      const url = `${root}/context-v/${entry.id}/`;
      const lede = data.lede ?? data.description ?? data.purpose;
      contextVLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
    }
    contextVLines.push('');
  }

  // ── Distinct repo count: union of `from` values across rolled-up sets ─
  const allFroms = new Set<string>([...changelogFroms, ...contextVFroms]);

  const tokens: Record<string, string> = {
    SITE_NAME,
    PLUGIN_COUNT: String(plugins.length),
    CHANGELOG_COUNT: String(changelogPublished.length),
    CONTEXTV_COUNT: String(contextVPublished.length),
    REPO_COUNT: String(allFroms.size),
    LLMS_FULL_URL: `${root}/llms-full.txt`,
    LLMS_INDEX_URL: `${root}/llms.txt`,
    PLUGIN_INDEX: pluginLines.join('\n').trimEnd(),
    CHANGELOG_INDEX: changelogLines.join('\n').trimEnd(),
    CONTEXTV_INDEX: contextVLines.join('\n').trimEnd(),
  };

  const body = template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : match,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
