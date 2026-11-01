// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Splash for the content-farm pseudomonorepo, served by Vercel.
//
// Rendered per request, so a document pushed to any plugin's changelog/ or
// context-v/ appears without a rebuild. See src/loaders/corpus.ts.
//
// Set SITE_URL when a custom domain is added. Otherwise Vercel tells us the
// project's production URL at build time.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  site: process.env.SITE_URL ?? (productionHost ? `https://${productionHost}` : 'http://localhost:4321'),
  output: 'server',
  adapter: vercel(),
  trailingSlash: 'ignore',
});
