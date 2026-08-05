# Changelog

All notable changes to Knowledge Heatmap are documented here.

## 1.0.1 — 2026-08-05

- Enforced zero-warning ESLint and explicit error-level checks for unsafe calls and returns.
- Expanded strict TypeScript checks and corrected override, index-access, and unused-state findings.
- Added release-file consistency and SHA-256 validation.
- Added GitHub build-provenance attestations for every release asset using `actions/attest@v4`.
- Aligned CI with the current official sample plugin's Node 20, 22, and 24 matrix and release tooling.
- Rebuilt and revalidated the plugin in Obsidian 1.13.4 with a 5,011-note synthetic development vault.

## 1.0.0 — 2026-08-04

- Added deterministic recency, connection, substance, and new-note-grace scoring.
- Added an accessible dashboard with summaries, folder priorities, filters, explanations, and suggested actions.
- Added local caching, batched analysis, cancellation, debounced file events, and bounded rendering.
- Added settings, folder exclusions, empty and error states, and read-only privacy disclosures.
- Added desktop, mobile-emulation, light, dark, narrow-layout, and keyboard validation.
- Added automated tests, linting, type checking, production builds, security auditing, CI, release automation, and dedicated test-vault tooling.
