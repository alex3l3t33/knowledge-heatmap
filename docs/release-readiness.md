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
- [x] GitHub repository updated — release commit `385e7c316e5d8e6064a7f32b7b1b8dc8a9051e2c` pushed to public `origin/main`; public CI passed.
- [x] Release tag created — exact unprefixed tag `1.0.0` points to the validated release commit.
- [x] GitHub release published — [1.0.0](https://github.com/alex3l3t33/knowledge-heatmap/releases/tag/1.0.0); release workflow passed.
- [x] Release assets verified — published `main.js`, `manifest.json`, and `styles.css` downloaded successfully and matched the local SHA-256 hashes.
- [ ] Obsidian submission completed — the current plugin portal requires a signed-in interactive browser and developer-policy confirmation; no controllable browser session was available.

## Current external constraint

The repository owner changed `alex3l3t33/knowledge-heatmap` to public. Public CI and the tag-triggered release workflow passed, and all three release assets are downloadable.

The Obsidian plugin portal remains the only incomplete step. Browser automation reported that no controllable browser was connected, so the signed-in form and required developer-policy confirmation could not be completed. Connect a browser through **Settings → Computer use**, then resume this task; alternatively, submit `https://github.com/alex3l3t33/knowledge-heatmap` manually at [community.obsidian.md](https://community.obsidian.md) under **Plugins → New plugin**.

The initial commit still contains unrelated private artifacts in history. The owner made the repository public after this risk was reported. Those files are absent from the current tree, but no destructive history purge was performed because force-pushing and history rewriting were explicitly prohibited.

The current official submission route is the Obsidian plugin portal, not a pull request to `obsidianmd/obsidian-releases`. Submission and acceptance are separate states.
