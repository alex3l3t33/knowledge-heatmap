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
- [ ] GitHub repository updated — pending final commit and push.
- [ ] Release tag created — pending tag `1.0.0` after the final push.
- [ ] GitHub release published — pending release workflow/authenticated GitHub operation.
- [ ] Release assets verified — pending published download verification for `main.js`, `manifest.json`, and `styles.css`.
- [ ] Obsidian submission completed — pending the current plugin portal workflow and required policy confirmation.

## Current external constraint

The GitHub CLI's saved token was invalid during the initial audit. The repository includes a tag-triggered release workflow so an authenticated `git push` can still create the published release through GitHub Actions. Authentication and portal access will be retried after the final local validation.

The current official submission route is the Obsidian plugin portal, not a pull request to `obsidianmd/obsidian-releases`. Submission and acceptance are separate states.
