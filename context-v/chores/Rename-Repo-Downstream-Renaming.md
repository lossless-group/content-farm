---
title: "Renaming a Repo and managing Downstream Effects"
lede: "It's not as simple as renaming the github path."
date_created: 2026-05-04
date_modified: 2026-05-05
status: Active
category: Chore
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
applies_to: every Obsidian plugin in content-farm/plugin-modules/
tags:
  - Chore
  - Obsidian-Plugins
  - Naming
  - Branding
  - Refactors
site_uuid: cdedb7ee-c8fd-4f24-bc25-7718ec6cbe42
hex_code: z9z0u9
date_authored_initial_draft: 2026-05-05
date_authored_current_draft: 2026-05-05
publish: true
---

  Files modified (12):
  - README.md
  - plugin-modules/cite-wide/README.md (and the GitHub URL lossless-group/open-graph-fetcher →
  lossless-group/metafetch)
  - plugin-modules/metafetch/: manifest.json, package.json, community-plugins.json, main.ts,
  esbuild.config.mjs, src/settings/settings.ts, README.md, changelog/2025-07-18_01.md, plus the CSS
  comment

  File renamed: src/styles/open-graph-fetcher.css → src/styles/metafetch.css (used git mv; the
  esbuild.config.mjs entry point already points to the new path).

  Things I deliberately left alone — flag if you want them changed too:
  1. PascalCase class names (OpenGraphFetcherModal, BatchOpenGraphFetcherModal, OpenGraphPlugin,
  OpenGraphSettings, OpenGraphSettingTab) and their files OpenGraphFetcherModal.ts,
  BatchOpenGraphFetcherModal.ts — outside the two literal strings you specified.
  2. CSS class names like .opengraph-fetcher-modal, .batch-opengraph-fetcher-modal, .opengraph-* —
  these use opengraph (no hyphen), so they didn't match open-graph-fetcher. Note the ribbon-icon
  class in main.ts did match and is now metafetch-ribbon-icon, which means there's no longer matching
   CSS for it.
  3. Strings like "Open Graph data", "OpenGraph.io", "OpenGraph metadata" — these refer to the Open
  Graph protocol and the OpenGraph.io API, not the plugin name, so I left them.
  4. Two notes worth raising explicitly:
    - The historical changelog 2025-07-18_01.md documenting the original 0.1.2 release was retitled
  to "Metafetch Plugin Release 0.1.2" — your call whether you want the historical record to reflect
  the original name.
    - plugin-modules/metafetch/ is a submodule, so these changes show up inside its own repo and need
   a commit there before the parent repo can record the new submodule SHA.

  Next step you may want: rename the local submodule path from plugin-modules/metafetch (already
  done) and update .gitmodules URL — current entry already says
  https://github.com/lossless-group/metafetch.git, so that's set.