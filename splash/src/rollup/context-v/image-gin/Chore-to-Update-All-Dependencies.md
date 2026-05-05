---
from: image-gin
from_path: Chore-to-Update-All-Dependencies.md
---
<!-- Rolled up from image-gin/context-v/Chore-to-Update-All-Dependencies.md. Edit at the source, not here. Re-run `pnpm rollup:sync` to refresh. -->


  1. tsconfig.json — TS 6 deprecated moduleResolution: "node" and bare baseUrl. Switched to
  moduleResolution: "bundler" (correct for esbuild) and dropped baseUrl + paths (the paths entry just
   re-stated the default node_modules lookup). Also added "types": ["node"] because TS 6 + bundler
  resolution no longer auto-includes @types/node — without this, Buffer, require, path, fs,
  child_process were all undefined.
  2. src/services/imageCacheService.ts — fixed two pre-existing strict-TS errors (unused Vault
  import; unused settings field). The unused-field fix actually wires the service to respect
  settings.imageCache.cacheFolder instead of a hardcoded path — same default value, but the
  user-configurable setting now does something.
  3. src/services/imageCacheService.ts & src/services/recraftImageService.ts — vault.createBinary
  calls: new @types/node types Uint8Array as Uint8Array<ArrayBufferLike> which no longer satisfies
  Obsidian's ArrayBuffer parameter. Pass arrayBuffer directly in one spot, bytes.buffer as
  ArrayBuffer in the other (safe — new Uint8Array(length) always allocates a real ArrayBuffer).
  4. src/styles/current-file-modal.css + src/modals/FreepikModal.ts — the import
  '../styles/freepik.css' in FreepikModal was being silently ignored by esbuild (it warned about it
  on every prior build), so freepik styles were never reaching users. Removed the JS import and added
   @import './freepik.css' to the CSS entry point so the styles actually ship now.

  Known cosmetic warnings (not failures): obsidian 1.12.3 declares peer deps on slightly different
  @codemirror/state and @codemirror/view patch versions than what got installed. These are
  externalized in esbuild so they don't affect the build, but if you ever want them to align you can
  pnpm add -D @codemirror/state@6.5.0 @codemirror/view@6.38.6.