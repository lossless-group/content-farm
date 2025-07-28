# Content Farm Obsidian Plugin

This is an attempt to unify a lot of content generating scripts into one plugin. 

***

# Modules in Content Farm
![Cite Wide: An Obsidian Community Plugin by The Lossless Group](https://i.imgur.com/CJ18gyp.png)
***
![Image Gin Plugin for Obsidian by The Lossless Group](https://i.imgur.com/jp2ME1E.png)
***
![Perplexed: An Obsidian Plugin for Perplexity and Perplexica](https://i.imgur.com/MVOK3rk.png)
***
![LMStud Yo Plugin for Obsidian by The Lossless Group](https://i.imgur.com/jp2ME1E.png)
***
![Open Graph Fetcher: An Obsidian Community Plugin by The Lossless Group](https://i.imgur.com/0v6sPkv.png)
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
