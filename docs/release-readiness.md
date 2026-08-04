# Release readiness

Version: 1.0.0
Prepared: 2026-08-04

## Validation checklist

- [x] Official requirements researched — `docs/research.md`, current first-party sources accessed 2026-08-04.
- [x] Code reviewed — API, lifecycle, security, privacy, mobile, accessibility, performance, and unload paths inspected and corrected.
- [x] Lint passed — `npm run lint`.
- [x] Type checking passed — `npm run typecheck`.
- [x] Tests passed — 4 files, 22 tests.
- [x] Production build passed — minified `main.js` generated.
- [x] Plugin installed in test vault — release files copied to the exact plugin-ID folder.
- [x] Runtime test completed — `docs/runtime-validation.md`.
- [x] Usability review completed — labels, explanations, next actions, privacy disclosure, and empty states verified.
- [x] Performance test completed — `docs/performance.md`.
- [x] Mobile compatibility evaluated — static review, mobile emulation, and phone-width layout passed; physical-device limitation documented.
- [x] Security and privacy reviewed — no runtime network, telemetry, external account, unsafe HTML, note writes, or adapter assumptions; `npm audit` reported zero vulnerabilities.
- [x] Documentation completed — README, changelog, contributing, security, license, research, runtime, and performance documents.
- [x] Manifest validated — identity, author, semantic version, minimum version, description, and mobile flag checked.
- [x] `versions.json` validated — `1.0.0` maps to `1.5.12`.
- [x] GitHub repository updated — validated release commit pushed to `origin/main`.
- [ ] Release tag created — pending tag `1.0.0` after the final push.
- [ ] GitHub release published — pending release workflow/authenticated GitHub operation.
- [ ] Release assets verified — pending published download verification for `main.js`, `manifest.json`, and `styles.css`.
- [ ] Obsidian submission completed — pending the current plugin portal workflow and required policy confirmation.

## Current external constraint

The configured GitHub repository is private: unauthenticated repository and API requests both return HTTP 404. Obsidian requires the repository and release assets to be public.

The initial commit contains unrelated medical PDFs, generated health data, media, and IDE files in Git history. Those files are absent from the current release tree, but changing the existing repository to public would expose its earlier history. The task explicitly prohibits destructive history rewriting and force-pushing, so no public-visibility change, release tag, or portal submission was attempted without a new authorization decision.

A safe route is to preserve the current repository under a private archive name, create a new public `alex3l3t33/knowledge-heatmap` repository with a clean release-only history, and update the local remote. This requires the repository owner's explicit approval because it changes GitHub repository identity and visibility. A destructive history purge is not recommended.

The current official submission route is the Obsidian plugin portal, not a pull request to `obsidianmd/obsidian-releases`. Submission and acceptance are separate states.
