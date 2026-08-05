# Obsidian release and submission research

Accessed: 2026-08-05

This document summarizes current first-party requirements used to prepare Knowledge Heatmap. It intentionally paraphrases the sources rather than reproducing them.

## Official sources consulted

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Submission requirements for plugins](https://docs.obsidian.md/Plugins/Releasing/Submission%20requirements%20for%20plugins)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin%20guidelines)
- [Developer policies](https://docs.obsidian.md/Developer%20policies)
- [Obsidian October plugin self-critique checklist](https://docs.obsidian.md/oo/plugin)
- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
- [Versions reference](https://docs.obsidian.md/Reference/Versions)
- [Mobile development](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development)
- [Optimize plugin load time](https://docs.obsidian.md/plugins/guides/load-time)
- [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian API type definitions](https://github.com/obsidianmd/obsidian-api)
- [Obsidian releases and community directory data](https://github.com/obsidianmd/obsidian-releases)
- [Current community plugin list](https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json)
- [GitHub artifact-attestation guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [GitHub `actions/attest`](https://github.com/actions/attest)

## 2026-08-05 sample-plugin and release review

The official sample plugin was compared at commit `07ceb81d1fb3384af611ebf665a1ec42a7e5926d` (2026-08-02). Knowledge Heatmap now follows its current Node 20/22/24 CI matrix, `actions/checkout@v6`, `actions/setup-node@v6`, `actions/attest@v4`, exact unprefixed npm version tags, EditorConfig baseline, and inline development source-map options. Project-specific validation, tests, release tag checks, and privacy constraints remain stricter than the sample.

GitHub's current guidance requires `id-token: write` and `attestations: write` for build provenance. The release workflow grants those permissions, attests `main.js`, `manifest.json`, and `styles.css` together after a successful build, then uploads the same files to the GitHub release. The attestation can be verified with `gh attestation verify <asset> --repo alex3l3t33/knowledge-heatmap` after a release created by the updated workflow exists.

## Current submission workflow

The current official workflow no longer asks authors to fork `obsidianmd/obsidian-releases` or open a pull request. The former plugin review file now redirects to the developer guidelines, and the repository's plugin PR template has been removed. Initial plugins are submitted through [community.obsidian.md](https://community.obsidian.md): sign in with an Obsidian account, link the repository-owning GitHub account, choose **Plugins → New plugin**, enter the repository URL, review the developer policies, and submit. The directory reads `manifest.json` from the default branch HEAD and performs automated review. Submission is not acceptance.

The repository must be public and its default branch must contain an accurate root `README.md`, `LICENSE`, `manifest.json`, and source. Before submission, a published GitHub release must exist with a tag exactly equal to the manifest version. The release needs separate `main.js` and `manifest.json` assets plus `styles.css` when the plugin uses styles. The production bundle should be minified. `main.js` should be a release asset rather than committed source.

## Manifest, identity, and versions

- Required plugin manifest fields are `id`, `name`, `version`, `minAppVersion`, `description`, `author`, and `isDesktopOnly`.
- Versions use strict `x.y.z` semantic versioning.
- IDs contain lowercase letters and hyphens, cannot contain `obsidian`, and cannot end in `plugin`.
- Names must be unique, short, descriptive, Basic Latin, and must not include “Obsidian” or “Plugin”.
- Descriptions must be clear, no more than 250 characters, use correct product capitalization, contain no emoji/special decoration, and end with a period.
- `fundingUrl` is only for financial-support services and should be omitted when unused.
- The plugin directory folder must match the plugin ID.
- `versions.json` maps plugin versions to the minimum compatible Obsidian version. It is consulted for compatible fallback releases and only needs a new entry when the minimum version changes; including the initial mapping is conventional and useful.
- The checked directory list had no `knowledge-heatmap` ID or exact `Knowledge Heatmap` name on 2026-08-04. Related heatmap plugins exist, but none has this identity or the same note-maintenance scoring focus.

Project identity is therefore fixed as:

- Repository: `alex3l3t33/knowledge-heatmap`
- Plugin ID: `knowledge-heatmap`
- Display name: `Knowledge Heatmap`

## README, licensing, privacy, and security

The README must explain purpose and usage. It should also disclose payments, required accounts, network use, access outside the vault, ads, server-side telemetry with a privacy policy, and closed-source components whenever any apply. Community plugins may not contain client-side telemetry, self-install/update code, dynamic internet ads, or hidden/obfuscated behavior. Network use must be necessary and explained. Every plugin needs a license and must honor licenses and attribution of reused code.

Knowledge Heatmap's intended posture is simpler: no account, payments, ads, telemetry, network requests, external-file access, or note writes. It reads Markdown notes and Obsidian's local metadata cache only. The README must state this explicitly. Dependencies must be few, locked, audited, and never loaded dynamically from a remote service. User-derived strings must be rendered with DOM helpers instead of `innerHTML` or equivalent unsafe HTML sinks.

## API, lifecycle, and cleanup

- Use the plugin-provided `this.app`, not the debug global.
- Register Obsidian events, DOM events, commands, and intervals with plugin/component registration helpers when available.
- Release timers, subscriptions, observers, modal work, cached state, and other owned resources on unload/close.
- Do not detach custom-view leaves during `onunload`.
- Use `Vault` APIs rather than direct adapter access; never assume `FileSystemAdapter` on mobile.
- Use `normalizePath` for user-entered vault paths.
- Prefer `Vault.cachedRead` for display/analysis reads.
- If editing is ever added, use `Editor` for the active note, `Vault.process` for background edits, `FileManager.processFrontMatter` for frontmatter, and `FileManager.trashFile` for deletion.
- Avoid default command hotkeys and redundant plugin names/IDs in command names.
- Avoid deprecated APIs, debug logs, global mutable state, `var`, broad `any`, unsafe casts, and hardcoded `.obsidian` paths.

Knowledge Heatmap performs no note modification or deletion, so the editing APIs above are intentionally not needed.

## Performance

Plugin `onload` should only register inexpensive capabilities. Initial UI/data work belongs after `workspace.onLayoutReady`, and vault `create` handlers should not react to the initialization event flood before layout readiness. Release bundles should be minified.

Large-vault analysis should use `vault.getMarkdownFiles()` once per refresh, reuse cached content metrics for unchanged files, precompute link counts in linear time, debounce file-event bursts, periodically yield to the UI thread, reject stale/cancelled runs, and cap incremental DOM rendering. It must not repeatedly iterate the vault to look up a known path; path lookups use the direct Vault methods where needed.

## UI and accessibility

- UI copy uses sentence case.
- Command names omit the plugin name because Obsidian already groups them.
- Styling belongs in scoped CSS classes and uses Obsidian CSS variables, not JavaScript style assignments or broad core-style overrides.
- Settings should not start with a redundant top-level heading; headings are only useful for multiple real sections and should use `Setting.setHeading()`.
- Controls need clear names, descriptions, labels, visible keyboard focus, non-color status text, understandable empty/error/loading states, and native keyboard-operable elements.
- Narrow/mobile layouts must reflow without horizontal overflow. Light and dark themes must remain legible.

## Desktop and mobile compatibility

Node.js and Electron APIs are desktop-only. Mobile-compatible plugins must avoid top-level Node/Electron imports, `FileSystemAdapter` assumptions, `process.platform`, and regex lookbehind that breaks older iOS WebViews. Knowledge Heatmap needs only cross-platform Obsidian and Web APIs, so `isDesktopOnly` should be `false`. Desktop mobile emulation is a useful additional check, but does not replace eventual testing on physical iOS/Android devices.

## Repository issues found before implementation

- `manifest.json` used invalid `min_obsidian_version` and `main` properties and omitted required `isDesktopOnly` and `minAppVersion`.
- The author was the placeholder `Codex`; the confirmed public author name is Alexandre CharByte and the GitHub owner is `alex3l3t33`.
- The plugin could not compile: invalid Obsidian imports, wrong relative imports, a nonexistent `addCommand_` method, and `unloaded` instead of `onunload`.
- The data service returned mock notes rather than vault data.
- The modal queried a missing element and assigned unsanitized note names through `innerHTML`.
- Scoring depended directly on `Date.now()`, had inconsistent comments/formulae, did not explain factor contributions, and classified only by age while displaying a different composite score.
- There was no settings UI or persistence, event handling, cache, debounce, cancellation, error/empty state, accessibility support, or resource cleanup.
- There was no lockfile, linter, tests, production build configuration, `versions.json`, README, license, changelog, contribution/security guidance, CI, release workflow, or dedicated release installer.
- The tracked initial commit accidentally included unrelated IDE files, swap files, media, generated charts, a blood-work script, and medical PDFs. They were removed from the current release tree, but remain in the first commit's history. Making that repository public would expose the earlier history; fully purging it would require a destructive history rewrite/force-push, which is explicitly out of scope and prohibited by the task instructions.
- No tags or GitHub releases existed at audit time.
- GitHub CLI was installed but its saved token was invalid at audit time. Local work can continue; publishing requires another authenticated path or re-authentication.
