# Research & Requirements

## Sources Consulted
- [Official Obsidian Developer Documentation]
- [Obsidian Help Documentation]
- [obsidianmd/obsidian-sample-plugin]
- [obsidianmd/obsidian-api]

## Relevant Current Requirements
- **Manifest**: `manifest.json` must include ID, name, version, etc.
- **Main Entry**: `main.js` must be the production bundle.
- **Styles**: `styles.css` for custom UI elements.
- **Bundling**: Use esbuild for TypeScript to JavaScript conversion.
- **Requirements**: Minimum Obsidian version must be specified based on API usage.

## Obsidian API Decisions
- **Plugin Lifecycle**: Use `registerPlugin` with a `Plugin` instance.
- **Event Listeners**: Listen for `_ready` or similar (standard lifecycle).
- **Note Indexing**: Use internal Obsidian indices where possible, but implement custom scoring logic.

## Minimum Supported Obsidian Version
- 1.0.0+ (unless specific modern features are used).

## Build and Release Requirements
- **Linting**: ESLint for TypeScript.
- **Bundling**: esbuild to produce `main.js`.
- **Manifest**: Valid JSON.

## Desktop and Mobile Compatibility
- Focus on desktop first, ensure common API usage is compatible with mobile.

## Performance Requirements
- Score calculations should be performed in a way that doesn't block the UI thread (use `requestAnimationFrame` or similar if needed for large vaults).

## Plugin Cleanup Requirements
- Properly unregister settings and listeners on disable.

## Restrictions
- No external network requests allowed.
- Local file access via Obsidian API only.
