---
title: Symlinked vault folders are invisible to the Obsidian index
lede: "Half our vault's top-level folders are symlinks into the monorepo. `vault.getAbstractFileByPath()` doesn't reliably see them, so every plugin that checks 'does this folder exist' before creating it is one symlink away from an EEXIST crash."
date_created: 2026-08-08
date_modified: 2026-08-08
type: issue
status: open
target_repo: content-farm
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 5 (1M context)
affects:
  - stenographer
  - filestarter
  - file-transporter
  - grab-reference
  - image-gin
related:
  - "[[Stenographer-an-Obsidian-Plugin-that-transcribes-Audio-Content]]"
site_uuid: 0acc5ad8-5a82-4944-9c77-38f40f804aef
hex_code: 7pj0h5
date_authored_initial_draft: 2026-08-08
date_authored_current_draft: 2026-08-08
publish: true
---

# Symlinked vault folders are invisible to the Obsidian index

## The setup that triggers it

The `lossless` vault aliases content out of the monorepo with symlinks:

```
/Users/mpstaton/content-md/lossless/Sources
    -> /Users/mpstaton/code/lossless-monorepo/content/sources
```

This is a deliberate and load-bearing pattern — it's how vault-authored content
and repo-managed content stay one corpus. It is not going away, so plugins have
to tolerate it.

## The failure

Obsidian maintains its own in-memory index of the vault. **Symlinked directories
are not reliably present in that index**, even though the files inside them open,
render, and link normally. That produces a specific and confusing failure in the
standard "ensure the folder exists" idiom:

```ts
// The idiom every one of our plugins reaches for. It is wrong here.
if (app.vault.getAbstractFileByPath(folder) === null) {
    await app.vault.createFolder(folder);   // throws: folder already exists
}
```

The index says the folder is missing. The filesystem disagrees. `createFolder`
hits a real directory and throws, and whatever the plugin was doing dies —
**after** the expensive part of the work has already happened.

For Stenographer, "the expensive part" is a paid transcription API call. A user
who sets their transcript folder to `Sources/Transcripts` — a perfectly ordinary
choice, and the one actually attempted on 2026-08-08 — would burn credits, then
lose the result to an EEXIST on a folder plainly visible in the file explorer.

## The fix

Check existence twice, and treat the create as best-effort:

```ts
if (app.vault.getAbstractFileByPath(current) !== null) continue;  // index
if (await app.vault.adapter.exists(current)) continue;            // filesystem

try {
    await app.vault.createFolder(current);
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
}
```

`vault.adapter.exists()` goes to the filesystem rather than the index, which is
what makes it see through the symlink. The `try/catch` is the third belt: it
covers races and any unindexed case the adapter also misses. The ordering
matters — the index check is cheapest and correct in the common case, so it
stays first.

Landed in Stenographer's `src/services/pipeline.ts::ensureFolder`.

## Where else this lurks

Any plugin in `plugin-modules/` that creates a folder before writing a file has
the same exposure. Worth an audit pass:

- `filestarter` — scaffolds new files from templates into configured folders
- `file-transporter` — moves files between folders by rule
- `grab-reference` — captures references into a vault structure
- `image-gin` — writes generated images to an assets folder

The audit is mechanical: grep for `createFolder` and check whether the guard in
front of it consults only `getAbstractFileByPath`.

```bash
grep -rn "createFolder" plugin-modules/*/src plugin-modules/*/main.ts
```

## The general lesson

**Obsidian's index is a cache of the filesystem, not the filesystem.** Any
plugin that treats an index miss as proof of absence will misbehave in a vault
built on symlinks — and ours is. When the answer matters (before a destructive
op, before an expensive op, before a create), ask the adapter.

## Related sightings from the same session

Two other things surfaced while diagnosing this, both **outside** Stenographer,
both worth their own investigation:

1. **Something rewrites frontmatter after note creation.** A note created by
   Stenographer came back with `date_created`, `date_modified`, and an empty
   `tags:` key that the plugin never writes, and with URL values unquoted where
   the plugin always double-quotes. Obsidian Linter or a Templater rule is
   post-processing new notes. Mostly harmless, but it means "the plugin wrote
   this" is not a safe assumption when debugging frontmatter.

2. **Something injects wikilinks into note bodies.** The same note's transcript
   contained
   `[[Tooling/Software Development/Developer Experience/DevTools/Pi Coding Agent|Pi]]`
   where the speaker had simply said "Pi". **This one is not harmless** — a
   transcript is a verbatim record, and silently rewriting the words inside it
   destroys the property that makes it worth having. Whatever auto-linker is
   doing this should be scoped to exclude `:::transcript` blocks, or excluded
   from the transcript folder entirely.
