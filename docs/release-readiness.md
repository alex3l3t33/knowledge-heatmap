# Release readiness

Version: 1.0.1
Prepared: 2026-08-05

## Release-hardening pass — 2026-08-05

- [x] Effective ESLint configuration verified — `no-unsafe-call` and `no-unsafe-return` are errors, not disabled or downgraded.
- [x] Zero-warning policy enforced — `eslint . --max-warnings=0` is part of `npm run lint` and `npm run validate`.
- [x] Strict TypeScript expanded and verified — unused code, missing overrides, unsafe index access, unreachable code, unused labels, and exact optional-property semantics are enforced in addition to `strict`.
- [x] Current official sample plugin compared — commit `07ceb81d1fb3384af611ebf665a1ec42a7e5926d`, dated 2026-08-02.
- [x] Sample-plugin infrastructure aligned — EditorConfig, unprefixed npm tags, development source-map options, current checkout/setup actions, and Node 20/22/24 validation matrix.
- [x] Artifact attestations configured — the tag workflow uses `actions/attest@v4` with `id-token: write` and `attestations: write` and attests all three published assets.
- [x] Release validation added — versions, required assets, non-empty files, tag equality when present, and SHA-256 hashes are checked.
- [x] Clean installs and validation passed on Node 20.20.2, 22.23.2, and 24.19.0 — 4 files and 22 tests on each runtime.
- [x] Dependency audit passed — zero vulnerabilities.
- [x] Actual Obsidian runtime recheck passed — Obsidian 1.13.4, 5,011-note synthetic vault, load/unload/reload, command/ribbon, settings persistence, search, filters, cache, and developer console.
- [x] Remote attestation issuance — [release workflow 31037191887](https://github.com/alex3l3t33/knowledge-heatmap/actions/runs/31037191887) published 1.0.1 and attested all three assets. Independent `gh attestation verify` checks succeeded for `main.js`, `manifest.json`, and `styles.css` against `release.yml@refs/tags/1.0.1`.

## Validation checklist

- [x] Official requirements researched — `docs/research.md`, current first-party sources accessed 2026-08-05.
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
- [x] `versions.json` validated — `1.0.0` and `1.0.1` map to `1.5.12`.
- [x] GitHub repository updated — release commit `385e7c316e5d8e6064a7f32b7b1b8dc8a9051e2c` pushed to public `origin/main`; public CI passed.
- [x] Release tag created — exact unprefixed tag `1.0.0` points to the validated release commit.
- [x] GitHub release published — [1.0.0](https://github.com/alex3l3t33/knowledge-heatmap/releases/tag/1.0.0); release workflow passed.
- [x] Release assets verified — published `main.js`, `manifest.json`, and `styles.css` downloaded successfully and matched the local SHA-256 hashes.
- [x] Obsidian automated submission review passed — confirmed by the repository owner on 2026-08-05.

## Published hardening release

The hardening changes were published as [1.0.1](https://github.com/alex3l3t33/knowledge-heatmap/releases/tag/1.0.1) from commit `41d1542c96f1596ded858b926abc04c25ddc21a7`. The tag, release workflow, release assets, SHA-256 digests, and SLSA provenance attestations were independently verified. This does not alter the already-published 1.0.0 assets or retroactively create an attestation for that release.

The initial commit still contains unrelated private artifacts in history. The owner made the repository public after this risk was reported. Those files are absent from the current tree, but no destructive history purge was performed because force-pushing and history rewriting were explicitly prohibited.

The automated Obsidian submission review has passed. Directory acceptance and publication remain controlled by Obsidian and are separate from the automated review result.
