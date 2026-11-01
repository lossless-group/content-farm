/**
 * /sitemap.xml — written per request, because the pages it lists are. New
 * documents appear here the moment they appear on the site. @astrojs/sitemap
 * only knows about pages that exist at build time.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getCorpus } from '../lib/corpus';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET: APIRoute = async ({ site }) => {
  const plugins = await getCollection('plugin-highlights');
  const [changelog, contextV] = await Promise.all([getCorpus('changelog'), getCorpus('context-v')]);

  const paths = [
    '',
    'changelog/',
    'context-v/',
    'releases/',
    'perplexed/',
    ...plugins.map((plugin) => `plugins/${plugin.id}/`),
    ...changelog.map((entry) => `changelog/${entry.id}/`),
    ...contextV.map((entry) => `context-v/${entry.id}/`),
  ];

  const urls = paths
    .map((path) => {
      const encoded = path.split('/').map(encodeURIComponent).join('/');
      return `  <url><loc>${escapeXml(new URL(encoded, site).toString())}</loc></url>`;
    })
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
