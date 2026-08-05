# Contributing

Thank you for improving Knowledge Heatmap.

## Before opening a change

- Search existing issues and keep proposals focused on the reliable note-maintenance MVP.
- Do not include private vault content, credentials, personal paths, or exported diagnostics containing note text.
- Preserve the local-first, read-only design unless a separately reviewed feature explicitly requires otherwise.

## Development workflow

1. Install Node.js 20 or newer.
2. Run `npm ci`.
3. Make a focused change with meaningful tests.
4. Run `npm run validate`.
5. For UI or lifecycle changes, install the build in a disposable vault and verify load, unload, themes, keyboard use, narrow layout, and the developer console.

The validation command treats warnings as failures, confirms the unsafe-call and unsafe-return rules remain enabled at error severity, enforces the strict compiler options in `tsconfig.json`, runs the test suite, builds the production bundle, and validates the release files. Core scoring tests should use an injected analysis time so results remain deterministic. Avoid Node or Electron APIs in plugin runtime code because mobile support is required.

## Pull requests

Explain the user-visible behavior, risks, validation performed, and any privacy, security, performance, or compatibility effect. Keep generated vault data, `node_modules`, `main.js`, and personal Obsidian state out of commits.
