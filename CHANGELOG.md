# Changelog

All notable changes to Knowledge Heatmap are documented here.

## Unreleased

- Reworked the knowledge map into folder groups ordered by weakest average health.
- Added Health, Freshness, and Connections visualization modes with explanatory legends.
- Added numeric cell values, orphan and well-connected markers, detailed hover cards, and direct note opening.
- Made summary cards clickable so Healthy, Stale, and Forgotten counts act as note filters.
- Made folder headings clickable filters and retained search and category filtering.
- Introduced a semantic teal, green, amber, and coral palette instead of relying on the vault accent color.
- Improved focus states, hover feedback, responsive behavior, and narrow-screen controls.
- Corrected summary-card alignment with an equal-height five-column desktop grid, three-column medium layout, and single-column mobile layout.
- Visually validated the production bundle in Obsidian 1.13.7 with the dedicated 5,011-note test vault.

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
