# Runtime validation

Validated: 2026-08-04

## Test environment

- Obsidian 1.13.4; installer 1.12.7
- macOS 26.6 (25G72), arm64
- Vault: `~/projects/knowledge-heatmap-test-vault`
- Installed files: `main.js`, `manifest.json`, `styles.css`
- Dataset: 5,011 synthetic Markdown notes and one non-Markdown file; one Markdown note excluded by default

No private user content was copied into the test vault.

## Results

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
