// @ts-check
import { defineConfig } from 'astro/config';

// Splash for the content-farm pseudomonorepo.
// Hosted on GitHub Pages from lossless-group/content-farm.
// Live URL: https://lossless-group.github.io/content-farm/
//
// If a custom domain is added later, set `site` to that domain and `base` to '/'.
// (Distinct from any future custom-domain marketing site — that would live elsewhere.)
export default defineConfig({
  site: 'https://lossless-group.github.io',
  base: '/content-farm/',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
