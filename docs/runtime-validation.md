# Runtime validation

Validated: 2026-08-15 (dashboard redesign and CSS recheck; full acceptance pass completed 2026-08-04)

## Test environment

- Obsidian 1.13.4; installer 1.12.7
- macOS 26.6 (25G72), arm64
- Vault: `~/projects/knowledge-heatmap-test-vault`
- Installed files: `main.js`, `manifest.json`, `styles.css`
- Dataset: 5,011 synthetic Markdown notes and one non-Markdown file; one Markdown note excluded by default

No private user content was copied into the test vault.

## Dashboard redesign recheck — 2026-08-15

The production bundle from `agent/improve-knowledge-map-dashboard` was built, installed in the marked `knowledge-heatmap-test-vault`, disabled and re-enabled to force a clean stylesheet reload, and inspected in Obsidian 1.13.7 on macOS.

| Test | Result | Evidence |
| --- | --- | --- |
| Installed build | Pass | `main.js`, `manifest.json`, and `styles.css` in the test vault matched the project production files byte-for-byte. |
| Full validation | Pass | Strict linting, TypeScript, 22 automated tests, production build, release verification, and `git diff --check` passed. |
| Large-vault rendering | Pass | The redesigned dashboard completed analysis of 5,011 included notes and rendered bounded folder groups and note results. |
| Visualization modes | Pass | Health, Freshness, and Connections controls and their legends rendered in the actual Obsidian modal. |
| Semantic palette | Pass | Teal controls plus green, amber, and coral health indicators rendered independently of the vault accent color. |
| Summary alignment | Pass after correction | Five equal-height cards rendered in one desktop row with values, labels, and actions contained inside each card. Medium and mobile breakpoints use three and one columns respectively. |
| Accessibility | Pass | Summary cards, modes, folder headings, cells, note links, and refresh remain native keyboard-operable controls with visible focus states. |

The `Large/Batch-###` fixtures deliberately provide scale for performance and bounded-rendering checks. They add noise to visual design review, so `Large` can be added to excluded folders when reviewing only the curated health examples.

## Release-hardening recheck — 2026-08-05

The production bundle was rebuilt, copied into the marked development vault, and reloaded in the actual Obsidian desktop app before this pass. Installed and project release-file hashes matched exactly.

| Test | Result | Evidence |
| --- | --- | --- |
| Installed bundle | Pass | SHA-256: `main.js` `f8866601fa3b922897f7cea9730cc3fbec2502dd326ae035cb7959bcd04c0351`; `manifest.json` `7499d9d1375ef25584871c581493b9bfccb30910e897c01c488d676439c0edf6`; `styles.css` `6715fa72fe929f553c4c8572d78d8cc2c0ef2cb0a1b1897a72acc9a42bfe4766`. All three installed files matched the project build byte-for-byte. |
| Load and reload | Pass | Obsidian 1.13.4 reloaded the v1.0.1 bundle, displayed **Knowledge Heatmap v1.0.1** in Community Plugins, and restored the ribbon action, command, and settings contribution. The dashboard reopened after reload with 5,010 included notes. |
| Disable and re-enable | Pass | Disabling removed `knowledge-heatmap` from the enabled-plugin list; re-enabling restored it and the settings entry without an exception. |
| Ribbon and command | Pass | The activity ribbon opened the dashboard; the command palette returned **Knowledge Heatmap: Open dashboard**, which opened the same UI. |
| Large-vault cold analysis | Pass | 5,010 included notes and one excluded note completed in 624 ms with visible progress and 5,010 content reads. A post-reload command run completed in 617 ms. |
| Search | Pass | Searching for “Recently maintained” returned exactly one matching note, score 88, healthy. |
| Category filter | Pass | Selecting **Stale** returned 967 notes, matching the summary count. |
| Cached forced refresh | Pass | Refresh completed in 597 ms with zero content reads and preserved the 5,010-note result. |
| Settings and persistence | Pass | All controls rendered with the expected values; automatic refresh was toggled, persisted, and restored to `true`. |
| Lifecycle cleanup | Pass | An open dashboard was closed before disable; unload/reload completed without stuck UI or duplicate contributions. |
| Developer console | Pass | After load, analysis, refresh, settings persistence, disable, and re-enable, the console contained only Obsidian's standard developer-console banner and no plugin error. |
| Standalone benchmark | Pass | 5,011 Markdown files: 177 ms cold pass, 28.8 ms warm pass, zero warm content reads, deterministic checksum matched. |

No runtime defect was found during the hardening recheck, so no behavior change was required.

## Full acceptance results — 2026-08-04

| Test | Result | Evidence |
| --- | --- | --- |
| Load and initial enable | Pass | Obsidian trusted the dedicated vault, loaded v1.0.0, and displayed the settings tab and ribbon action without an exception. |
| Disable and unload | Pass | Disabling removed the command/settings contribution and closed owned UI; re-enabling restored it without an error. |
| Command and ribbon | Pass | **Knowledge Heatmap: Open dashboard** appeared in the command palette and the ribbon action opened the same view. |
| Settings | Pass | All scoring, refresh, grace, and exclusion controls rendered with descriptions and persisted values. |
| Large-vault dashboard | Pass | 5,010 included notes, one excluded note, 621 ms cold analysis with visible progress. |
| Scoring and explanations | Pass | A recent linked 571-word note scored 88 (60/60 recency, 12.5/25 connections, 15/15 substance); the explanation and suggested link action matched the factors. |
| Search and filters | Pass | Searching for “Recently maintained” reduced the note list to the expected single result. |
| Cached refresh | Pass | Manual refresh completed with zero content reads and preserved results. |
| File creation | Pass | Total increased to 5,011 and exactly one content item was read. |
| File modification | Pass | Exactly one content item was reread. |
| File rename | Pass | The renamed note remained represented correctly; one content item was read. |
| File deletion | Pass | Total returned to 5,010 with zero content reads. The synthetic note was moved outside the vault for recoverability. |
| Empty-vault equivalent | Pass | Temporarily excluding every top-level test folder produced zero included notes and the message “All Markdown notes are excluded” with corrective guidance. The default exclusion was restored afterward. |
| Malformed frontmatter | Pass | The generated malformed-frontmatter note did not interrupt analysis. |
| Non-Markdown handling | Pass | The `.txt` fixture did not appear in results. |
| Light and dark themes | Pass | Dashboard, controls, status colors, and text remained legible in both default schemes. |
| Narrow layout | Pass | Summary cards and controls reflowed without visible horizontal overflow. |
| Keyboard navigation | Pass | Tab navigation reached the refresh button with a visible focus ring; controls use native keyboard-operable elements. |
| Mobile evaluation | Pass with limitation | Obsidian's official desktop mobile emulation loaded the plugin and completed a 5,010-note scan in 857 ms; a phone-width window reflowed without horizontal overflow. Physical iOS/Android hardware was not available. |
| Developer console | Pass | After load, refresh, event, unload/reload, theme, and mobile checks, the test-vault console contained no plugin error messages. |
| Unexpected writes/notices | Pass | No note content changed, no unnecessary vault files appeared, and no repeated notices were observed. |

## Usability findings

The opening text explains the three weighted signals and category boundaries. Every note shows a status, reason, suggested action, and expandable factor breakdown. The folder list makes the first action clear, while the settings and footer explicitly state that note contents remain local and are not modified.

Earlier implementation issues—unsafe HTML, mock data, missing lifecycle cleanup, unclear scoring, inaccessible color-only output, unbounded rendering, and absent empty/error states—were corrected before this runtime pass.

## Remaining limitations

- Physical iOS and Android testing was not available; mobile emulation is not a complete substitute.
- Measurements use synthetic notes and one macOS machine.
- The plugin deliberately provides recommendations only and does not automate note edits.
