# Knowledge Heatmap

Knowledge Heatmap is a local-first Obsidian plugin that turns note-maintenance signals into an understandable dashboard. It highlights notes and folders that may need review without changing note content or deciding whether an idea is valuable.

The dashboard answers three practical questions:

| Signal | What it asks | Weight |
| --- | --- | ---: |
| Recency | How recently was this note edited? | 60 points |
| Connections | How many resolved incoming and outgoing links does it have? | 25 points |
| Substance | How close is it to the configured word-count target? | 15 points |

Every result includes the factor contributions, a plain-language explanation, and one suggested maintenance action.

## Features

- Health overview with healthy, stale, and forgotten categories.
- Clickable summary cards that immediately filter notes by health category.
- Folder-grouped knowledge map with the weakest areas shown first.
- Health, Freshness, and Connections visualization modes.
- Numeric map cells with orphan and well-connected markers.
- Detailed cell hover cards with score, age, words, backlinks, outgoing links, and the primary maintenance issue.
- Clickable folder filters and direct note opening from map cells.
- Search and category filters.
- Per-note scoring breakdowns and suggested next steps.
- Configurable recency, link, word-count, grace-period, exclusion, and refresh settings.
- Debounced updates after Markdown file and link changes.
- Incremental analysis with cancellation, caching, and bounded rendering for large vaults.
- Light, dark, narrow-window, keyboard, and mobile-compatible layouts.
- Read-only, local processing with no account, telemetry, advertising, or network requests.

## Installation

### Community plugin directory

After the plugin is accepted into the Obsidian community directory:

1. Open **Settings → Community plugins**.
2. Select **Browse** and search for **Knowledge Heatmap**.
3. Install the plugin, then enable it.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the matching [GitHub release](https://github.com/alex3l3t33/knowledge-heatmap/releases).
2. Create `<vault>/.obsidian/plugins/knowledge-heatmap/`.
3. Copy the three files into that folder.
4. Reload Obsidian, then enable **Knowledge Heatmap** under **Settings → Community plugins**.

The release tag and the version in `manifest.json` must match exactly.

Releases produced by the current workflow include GitHub build-provenance attestations for all three release files. After downloading an attested release, verify an asset with the GitHub CLI:

```bash
gh attestation verify main.js --repo alex3l3t33/knowledge-heatmap
```

## Usage

Open the dashboard from the activity ribbon or run **Knowledge Heatmap: Open dashboard** from the command palette.

Start with the summary cards or weakest folder groups. Select **Healthy**, **Stale**, or **Forgotten** to filter the dashboard immediately, or select a folder heading to focus on that knowledge area.

Switch the knowledge map between:

- **Health:** overall maintenance score;
- **Freshness:** time since the last modification; and
- **Connections:** combined incoming and outgoing links.

Each map cell displays the metric for the selected mode. The `⚠` marker identifies an orphan note and `✓` identifies a well-connected note. Hover or focus a cell to inspect its details, then select it to open the note.

The detailed note list shows:

- its score and category;
- how age, links, and word count contributed;
- a concrete maintenance suggestion; and
- a button that opens the note without modifying it.

Use **Refresh** to recalculate immediately. When automatic refresh is enabled, file and metadata changes are collected for the configured delay before an open dashboard recalculates.

## Scoring

The default score is deterministic for the same note metadata, content, settings, and analysis time.

- **Recency (60 points):** full credit through 90 days, then a linear decline to zero at 365 days.
- **Connections (25 points):** proportional credit up to six combined incoming and outgoing resolved links.
- **Substance (15 points):** proportional credit up to 400 words. YAML frontmatter is not counted.
- **New-note grace (up to 10 points):** temporary support during the first seven days, capped so it cannot push the base score beyond the healthy threshold by more than needed.

Categories use the final rounded score:

- **Healthy:** 70–100
- **Stale:** 40–69
- **Forgotten:** 0–39

These labels describe maintenance signals, not importance, accuracy, or writing quality. A deliberately stable reference note may need no action even when its score is low.

## Settings

- **Automatic refresh:** recalculate open dashboards after relevant changes.
- **Refresh delay:** debounce bursts of file and link events.
- **Full-recency period:** age through which a note receives all recency points.
- **Zero-recency age:** age at which recency contributes no points.
- **Connection target:** links required for all connection points.
- **Substance target:** words required for all substance points.
- **New-note grace period:** temporary points for newly created notes.
- **Excluded folders:** one vault-relative path per line; descendants are excluded too.

## Privacy and security

Knowledge Heatmap reads Markdown files through Obsidian's Vault API and uses Obsidian's local metadata cache for links. Processing stays on the device.

The plugin does not:

- send vault contents or diagnostics over the network;
- collect telemetry;
- require an account or API key;
- read files outside the vault;
- modify or delete notes;
- install or update itself; or
- load remote code.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Compatibility

- Minimum Obsidian version: **1.5.12**
- Desktop: supported
- Mobile: supported (`isDesktopOnly: false`)

The release was exercised on Obsidian 1.13.4 on macOS and with Obsidian's desktop mobile emulation. Physical iOS and Android testing remains advisable because device memory and WebView behavior vary.

## Known limitations

- File modification times can change after sync, restore, or external file operations, which can affect recency scores.
- Only Markdown files are analyzed.
- Link scores use Obsidian's resolved link metadata; unresolved text that resembles a link does not count.
- A full recalculation still visits each included Markdown file, although unchanged content metrics are cached and work is yielded in batches.
- Suggested actions are recommendations only; the plugin never edits a note on the user's behalf.

## Development

Node.js 20 or newer and npm are required.

```bash
npm ci
npm run validate
```

Useful commands:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify:quality-config
npm run verify:release
npm run generate:test-vault
npm run install:test-vault
npm run benchmark
```

`npm run lint` treats every warning as a failure and first verifies that `@typescript-eslint/no-unsafe-call` and `@typescript-eslint/no-unsafe-return` are enabled at error severity. `npm run verify:release` checks version consistency, required release files, and their SHA-256 hashes.

The test-vault scripts use the `knowledge-heatmap-test-vault` directory next to the repository and refuse to replace an existing unmarked directory. They generate synthetic content only; do not point them at a personal vault.

The generated `Large/Batch-###` folders exist only to stress-test analysis and rendering with thousands of notes. They are not created in normal vaults. Exclude `Large` in the test-vault settings when validating visual design against only the curated fixtures.

Contribution guidance is in [CONTRIBUTING.md](CONTRIBUTING.md). For bugs or feature requests, use the [GitHub issue tracker](https://github.com/alex3l3t33/knowledge-heatmap/issues) without attaching private vault content.

## License

[MIT](LICENSE) © 2026 Alexandre CharByte
