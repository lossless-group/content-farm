---
title: "Image Drop Confirmation Gate"
lede: >-
  An Obsidian plugin that asks where a dropped image goes before anything hits disk or network — a private chart on imgur is a phone call.
date_created: 2026-05-09
date_modified: 2026-05-09
status: Draft
category: Plan
authors:
  - Michael Staton
augmented_with:
  - Claude Code on Claude Opus 4.7 (1M context)
semantic_version: 0.0.0.1
tags:
  - Plan
  - Obsidian-Plugins
  - Image-Handling
  - Privacy
  - Editor-UX
related_files:
  - plugin-modules/cite-wide/src/modals/CitationModal.ts
  - context-v/plans/Create-a-Study-of-the-Best-Obsidian-Plugins.md
site_uuid: 3fce085b-a15c-4b37-82a2-73ae738b30bc
hex_code: hpayce
date_authored_initial_draft: 2026-05-09
date_authored_current_draft: 2026-05-09
publish: true
---

# Image Drop Confirmation Gate

## Why

We use Obsidian to write about companies. Sometimes the artifacts those companies share with us — a growth chart, a screenshot of a dashboard, a photo of a whiteboard — are not meant to leave a private context. We can write the article and publish thoughtfully; what we cannot do is let a screenshot end up on imgur because we forgot a plugin was set to auto-upload, or because we dragged an image into a note and Obsidian's default behavior ran ahead of our judgment.

Today the failure mode is silent. Drag a file in, Obsidian copies it into the vault attachments folder. Or — if a plugin like `obsidian-imgur-plugin` is installed and configured to "always upload" — the image is on a third-party CDN before the cursor finishes moving. Neither outcome is *wrong*; both are wrong as defaults for our workflow.

The fix is a small plugin that puts a deliberate decision between the drop and the destination. One modal, three or four destinations, sensible defaults, easy to dismiss. It's a velocity *helper*, not a velocity tax — because the alternative is reviewing the attachments folder and re-screening the imgur dashboard at the end of the week, which we won't do.

This plan describes that plugin. The interception pattern is borrowed directly from `obsidian-imgur-plugin`, which is the original inspiration; this plugin generalizes the gate and removes the imgur-specific bias.

## The user experience

Imagine the user drags a PNG into a note.

```
┌────────────────────────────────────────────────────────────┐
│  Image dropped: dashboard-q3.png  (412 KB · 1920×1080)     │
│                                                            │
│  Where should this go?                                     │
│                                                            │
│   ●  Vault attachments          (default; private)         │
│   ○  ImageKit (configured)      sensitive: company-private │
│   ○  Imgur (public CDN)                                    │
│   ○  Cancel — don't insert anything                        │
│                                                            │
│   [ ] Remember choice for this session                     │
│                                                            │
│                            [ Cancel ]   [ Insert ]         │
└────────────────────────────────────────────────────────────┘
```

The behaviors:

- **Vault attachments** — Obsidian's normal drop behavior. The image goes into the vault's configured attachments folder; the markdown link is inserted at the cursor.
- **ImageKit (or any configured private host)** — uploaded to the user's own ImageKit (or S3, or Bunny) with no public listing; markdown link points at the private CDN URL.
- **Imgur (public CDN)** — explicit opt-in per drop. We *want* the friction.
- **Cancel** — no insert, no copy, nothing on disk, nothing on the wire.

The "Remember choice for this session" checkbox keeps the modal from becoming nagware during a long writing session where the user has already decided every image is going to the vault — but it does not persist across Obsidian restarts. Persistent "always do X" policy lives in plugin settings, behind explicit opt-in.

Multi-file drops show one modal that applies to the whole batch. Mixed drops (image + non-image) treat the non-images as out of scope and let Obsidian handle them natively.

## How the interception works (technical foundation)

Obsidian's `Workspace` exposes two events that fire before the editor processes a drop or paste:

```ts
this.registerEvent(this.app.workspace.on('editor-drop',  this.onDrop))
this.registerEvent(this.app.workspace.on('editor-paste', this.onPaste))
```

Callback signatures:

```ts
(e: DragEvent,      editor: Editor, view: MarkdownView) => void
(e: ClipboardEvent, editor: Editor, view: MarkdownView) => void
```

The `obsidian-imgur-plugin` reference implementation gave us the load-bearing pattern. Distilled:

1. **Read files** from `e.dataTransfer.files` (drop) or `e.clipboardData.files` (paste).
2. **Filter** for images. If none, return early — Obsidian handles non-images natively.
3. **Call `e.preventDefault()` synchronously**, before the first `await`. This is the moment that blocks Obsidian's default attachment-import.
4. **Show the modal**, await the user's choice.
5. **Branch**:
   - Vault → re-dispatch a synthetic event copy into Obsidian's internal `clipboardManager` so the default path runs cleanly. (The imgur plugin uses `view.currentMode.clipboardManager.handleDrop(copy)` / `handlePaste(copy)` — undocumented but stable; alternative is `app.vault.createBinary()` + `app.fileManager.generateMarkdownLink()` + `editor.replaceRange()`.)
   - Private host → upload via the host's API, insert the returned URL as a markdown image at the cursor.
   - Public host → same as private host, different endpoint.
   - Cancel → do nothing.
6. **Re-entry guard**: subclass `DragEvent` / `ClipboardEvent` (or tag with a symbol) so the re-dispatched event isn't intercepted by our own handler — otherwise infinite loop.

A condensed sketch of the drop handler:

```ts
private onDrop = async (e: DragEvent, _ed: Editor, view: MarkdownView) => {
    if ((e as DragEventTagged).__gateRehandled) return       // re-entry guard
    const files = Array.from(e.dataTransfer?.files ?? [])
    const images = files.filter(f => f.type.startsWith('image/'))
    if (images.length === 0) return                          // not ours; let Obsidian run
    e.preventDefault()                                        // BEFORE any await

    const choice = await this.gateModal.ask(images)          // deferred-promise modal
    if (choice.kind === 'cancel') return
    if (choice.kind === 'vault') return this.fallthrough(e, view)
    if (choice.kind === 'host')  return this.upload(choice.host, images, view)
}
```

Full code lives in implementation; the prompt-doc that pairs with this plan will spell it out step by step.

## Gotchas surfaced from the reference plugin

These are real and we should not rediscover them.

1. **`preventDefault()` must be synchronous.** Once you `await` the modal, the browser has already given up on cancelling the default action. The pattern is: `preventDefault()` first, `await` second.
2. **The re-entry guard is mandatory.** When we re-dispatch a synthetic `DragEvent` to Obsidian's internal clipboard manager, our own handler will see it and re-prompt unless we tag the event.
3. **`clipboardManager` on `view.currentMode` is internal API**, not in `obsidian.d.ts`. The imgur plugin uses it via cast. We will too — but flag in code comments and in the reminder doc that this is the load-bearing internal call. The fallback if Obsidian ever removes it is the explicit `Vault.createBinary` + `FileManager.generateMarkdownLink` path.
4. **Mobile**: `editor-drop` does not fire on mobile (no drag affordance). `editor-paste` does fire from the share sheet. The plugin should be desktop-aware; on mobile it gates pastes only. Set `isDesktopOnly: false` in manifest but document the behavior.
5. **Canvas views** are not `MarkdownView`. The imgur plugin has a separate `createImgurCanvasPasteHandler` for canvas. We will explicitly scope v0.1 to markdown views and handle canvas in a follow-up if anyone asks.
6. **Multi-file drops are all-or-nothing for the gate**. Mixed image+text drops fall through entirely (Obsidian handles), matching the imgur plugin's `allFilesAreImages` semantic.
7. **Internal vault drags** (dragging an existing `TFile` from the file explorer into a note) produce a `DragEvent` with empty `dataTransfer.files` — the image filter naturally returns false and we skip. Confirmed in the imgur plugin behavior and the Obsidian docs.
8. **Native-OS file drags vs in-browser image drags** both produce `DataTransfer.files` with the right MIME, so a single check handles both.

## Architecture

Three concerns, three modules:

```
src/
├── main.ts                       Plugin entry; registers handlers; lifecycle
├── handlers/
│   ├── DropHandler.ts            editor-drop interception
│   └── PasteHandler.ts           editor-paste interception
├── modals/
│   └── ImageDropGateModal.ts     The decision modal
├── destinations/
│   ├── VaultDestination.ts       Re-dispatch into Obsidian's clipboardManager
│   ├── ImageKitDestination.ts    POST to ImageKit; insert returned URL
│   └── ImgurDestination.ts       POST to imgur; insert returned URL
├── utils/
│   ├── allFilesAreImages.ts
│   ├── DragEventCopy.ts          Synthetic DragEvent w/ re-entry tag
│   └── PasteEventCopy.ts         Synthetic ClipboardEvent w/ re-entry tag
└── settings/
    └── GateSettings.ts           Configured destinations, default choice, opt-in policies
```

The `destinations/` shape is the key abstraction. Each implements:

```ts
interface ImageDestination {
    id: string
    label: string
    visible(): boolean              // settings-driven; hidden if not configured
    insert(file: File, view: MarkdownView, editor: Editor): Promise<void>
}
```

This keeps the modal generic. Adding S3 or Bunny later is a `class S3Destination implements ImageDestination` plus a settings panel.

## Settings surface (v0.1)

- **Default destination** — what's pre-selected in the modal. Defaults to "Vault attachments".
- **Skip modal for vault drops** — escape hatch for the user who has already decided. Off by default; turning this on still gates *external* destinations.
- **ImageKit** — endpoint, API key, public/private toggle.
- **Imgur** — anonymous / OAuth, album ID. Off by default.
- **Mode policy**:
  - "Always confirm" (default; always show modal)
  - "Confirm for external destinations only" (vault drops fall through silently; only show modal if a non-vault destination is even possible)
  - "Confirm for sensitive notes only" (frontmatter gate — see open questions)

## Sensitive-note frontmatter gate (consideration)

A real question is whether the modal should *only* appear when the active note is tagged sensitive. Something like:

```yaml
---
imagery_policy: confirm-each
client: Acme Corp
---
```

When `imagery_policy: confirm-each` is in frontmatter, we always show the modal. When it's absent, we follow the user's global policy. This pairs well with our existing convention of writing per-client folders in the vault.

But this adds a layer of magic that has to be discovered. Open question: is the always-on modal's friction low enough that we don't need a frontmatter gate at all? I lean toward "ship without it, watch usage, add if friction shows up."

## Open questions

1. **Internal API risk.** `view.currentMode.clipboardManager` is undocumented. If we use it for the vault-fallthrough, we should also implement the explicit-API fallback (`Vault.createBinary` + `generateMarkdownLink`) and switch automatically if `clipboardManager` is missing. Worth the code? Probably yes.
2. **What happens for in-line pasted base64 images (clipboard screenshots)?** They arrive as files in `clipboardData.files` with `name = "image.png"`. Same flow should apply — but worth confirming the modal renders sensibly without a real filename.
3. **Frontmatter gate** — see above; ship without it for v0.1?
4. **Conflict with imgur-plugin** if the user has both installed. The two would race on `editor-drop`. We can document this and recommend disabling imgur-plugin if our gate has imgur as a destination. Or we can be loud about it on plugin load.
5. **Telemetry / log of decisions.** It would be nice — for our own audit purposes — to log which destination each drop went to, into a file in `_attachments/.gate-log.md` or similar. Probably yes; opt-out, not opt-in.
6. **Settings UI** for destinations. Each destination has different config; how do we keep the settings tab from becoming a mess? Tabs-within-tabs, or one accordion per destination? Defer to design pass.

## Naming

Working name: **Image Drop Gate** (plugin id: `image-drop-gate`).

Other candidates considered: *Imagery Conscience*, *Drop Confirm*, *Image Sentinel*. Settled on *Image Drop Gate* because it's literal. The repo would live under `lossless-group/image-drop-gate` and (eventually) symlink into `content-farm/plugin-modules/image-drop-gate` like its siblings.

## Phasing

**v0.1 — minimum useful gate**
- Drop & paste interception
- Vault destination (default; re-dispatch to internal clipboardManager + explicit-API fallback)
- One external destination wired up: ImageKit, since [[plugin-modules/image-gin]] already uses it
- Modal with three radio destinations, "remember for session" checkbox
- Settings: default destination, ImageKit endpoint/key
- Markdown views only

**v0.2 — polish**
- Imgur destination
- "Confirm for external only" policy mode
- Filename / size / preview thumbnail in modal
- Multi-file batch summary

**v0.3 — frontmatter gate**
- `imagery_policy:` frontmatter awareness
- Per-folder policy via folder notes (if we want)
- Canvas view support

**v1.0 — community release**
- Tested on mobile (paste only)
- Telemetry log opt-in
- Submit to Obsidian community plugin directory

## Cross-references

- [[plugin-modules/cite-wide/src/modals/CitationModal.ts]] — recent precedent for modal layout in our plugin family. The `modalEl` widening pattern documented in `perplexed/context-v/issues/Widen-Modals-in-Obsidian-using-CSS.md` applies here too.
- [[context-v/plans/Create-a-Study-of-the-Best-Obsidian-Plugins.md]] — `obsidian-imgur-plugin` belongs in that study; this plan is its first concrete output.
- [[plugin-modules/image-gin]] — already wraps ImageKit upload; the v0.1 ImageKit destination should call into image-gin's helper rather than re-implementing.
- Reference: `obsidian-imgur-plugin` source — `https://github.com/gavvvr/obsidian-imgur-plugin` (read for `editor-paste` / `editor-drop` interception, modal flow, fallthrough re-dispatch).
- Reference: Obsidian docs — `https://docs.obsidian.md/Reference/TypeScript+API/Workspace/on('editor-drop')`, `.../on('editor-paste')`, `.../FileManager/generateMarkdownLink`, `.../Vault/createBinary`.

## Next step

Pair this plan with a `context-v/prompts/` document that breaks v0.1 into ordered, verifiable steps:

1. Scaffold plugin (manifest, esbuild, `Plugin` subclass)
2. Register `editor-drop` handler with re-entry guard, log-only (no modal yet)
3. Add `allFilesAreImages` filter; verify non-image drops pass through
4. Implement modal class; wire up cancel / vault / external buttons
5. Implement `VaultDestination` via `clipboardManager` re-dispatch
6. Implement `VaultDestination` explicit-API fallback (test by stubbing out `clipboardManager`)
7. Implement `editor-paste` handler (mirror of drop)
8. Wire `ImageKitDestination` against the existing image-gin helper
9. Settings tab
10. Symlink into vault, manual QA pass

That's the prompt-doc; this is the plan-doc.
