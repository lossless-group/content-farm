# Content Farm Obsidian Plugin

This is an attempt to unify a lot of content generating scripts into one plugin. 

***

# Modules in Content Farm

## Lossless created Obsidian Plugins:

## AI API Modules for Content Generation:
![Perplexed: An Obsidian Plugin for Perplexity and Perplexica](https://i.imgur.com/MVOK3rk.png)
***
![Image Gin Plugin for Obsidian by The Lossless Group](https://i.imgur.com/jp2ME1E.png)
***
![LMStud Yo: An Obsidian Community Plugin by The Lossless Group](https://i.imgur.com/qZbLKzJ.png)
***

## Content Metadata Modules for better, unique Citations and connecting to Open Graph metadata from the web:
![Cite Wide: An Obsidian Community Plugin by The Lossless Group](https://i.imgur.com/CJ18gyp.png)
***
![Metafetch: An Obsidian Community Plugin by The Lossless Group](https://i.imgur.com/0v6sPkv.png)
***

## Third Party Obsidian Plugins:
![Obsidian Git: A fork of Obsidian Git by [Vinzent03](https://github.com/Vinzent03)](https://i.imgur.com/0v6sPkv.png)

Thanks to [Vinzent03](https://github.com/Vinzent03) for his [Obsidian Git](https://github.com/Vinzent03/obsidian-git) plugin.

***


## Features

 - Generate images via API from an image prompt
    - Automate downloading and uploading to remote image storage and delivery service.
 - Tap your local Perplexica instance to generate citation-driven text. 
 - Format citations in Obsidian's citation format, with a hex code for unique citation markers across all content.
 - 

## See it in action in our content repository:
https://github.com/lossless-group/lossless-content

***
# Below is from the original sample plugin README 
It has helpful information for plugin authors
***


## Adding to thge plugin community

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL


```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api

# Patterns

## Modal Patterns

Three modals now on the unified wide-modal pattern:

  LMStudioModal → "Ask LM Studio"

  - Header + subtitle ("Run queries against your local LM Studio server…")
  - Question section — full-width textarea, Cmd/Ctrl+Enter submits
  - Model section — Setting dropdown with live taglines for all 5 listed models (Granite, Phi-4,
  Gemma-3, Llama-3.2, custom-model placeholder), Max Tokens text input, Temperature slider (0–2, step
   0.1, dynamic tooltip — replacing the previous bare number input)
  - System Prompt section — own labeled textarea using monospace + smaller min-height (multi-line so
  it's a poor fit for Setting)
  - Include in response — Images toggle
  - Behavior — Stream Response toggle (default on)
  - Footer: Cancel + Ask LM Studio CTA

  TextEnhancementModal → "Enhance Selected Text with Perplexity"

  - Header + subtitle (mentions sonar-pro + streaming + Citations)
  - Selected Text section — read-only textarea with --background-secondary tint visually
  distinguishing it from editable input
  - Enhancement Prompt section — pre-filled from the template, editable, Cmd/Ctrl+Enter submits,
  button disables to "Enhancing…" during the call
  - Footer: Cancel + Enhance Text CTA

  TextEnhancementWithImagesModal → "Get Related Images for Selected Text"

  - Header + subtitle (sonar-pro + streams image markers)
  - Same two-textarea structure: read-only Selected Text + editable Image Request Prompt
  - Footer: Cancel + Get Related Images CTA
  - Bonus fix: unified the CSS class name. The .ts was using 'get-related-images-modal' while the
  file/class was TextEnhancementWithImagesModal and the CSS file was
  text-enhancement-with-images-modal.css — all three names now match.

  All three use modalEl.addClass(...) (the wide-modal CSS unlock from
  context-v/issues/Widen-Modals-in-Obsidian-using-CSS.md), zero .modal-content padding, BEM-scoped
  class names, theme-token colors, and the 600px responsive breakpoint with column-reverse footer +
  full-width buttons.

  URLUpdateModal skipped intentionally — it's a single-input utility that doesn't have enough content
   to justify the sectioned layout. Let me know if you'd like a light pass on it too (just the
  wide-modal unlock + the same button chrome) so it visually matches the family without the heavy
  header/section/footer scaffolding.