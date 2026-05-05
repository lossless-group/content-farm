

  1. Get a Magnific API key from their dashboard (URL was in the 401 response:
  https://www.magnific.com/developers/dashboard/api-key).
  2. Open Obsidian Settings → Image Gin → Freepik Image Search → paste the new key into "Freepik API
  Key" (UI label is still "Freepik" — see below).
  3. Reload the plugin (toggle off/on in Community Plugins, or Cmd+R).
  4. Try a search.

  Open question for you to decide later (no action now):

  Want me to do a full rename freepik → magnific across the codebase — settings schema, settings UI
  labels, file names (freepikService.ts, FreepikModal.ts), class names, command id
  (search-freepik-images), CSS classes (freepik-grid, freepik-thumbnail etc.)? It's mechanical but
  touches a lot of files and needs a one-shot migration in loadSettings() so your existing data.json
  doesn't lose the saved key/enabled-flag. Worth doing once the integration is confirmed working —
  I'd rather not move the ground under your feet while you're still verifying credentials.