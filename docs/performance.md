# Performance validation

Validated: 2026-08-04

## Environment

- macOS 26.6 (25G72), arm64
- Obsidian 1.13.4; installer 1.12.7
- Dedicated synthetic vault: `~/projects/knowledge-heatmap-test-vault`
- 5,011 Markdown files plus one non-Markdown file
- Default runtime exclusion: one Markdown file under `Excluded`

## Method

`npm run generate:test-vault` created representative notes and 5,000 deterministic large-sample notes across 50 folders. The Node benchmark bundles and runs the same content, cache, path, scoring, and aggregation modules used by the plugin. It performs a cold pass, a warm pass, and a checksum comparison.

The production build was also installed in the vault and measured from the dashboard's own timing and read counters. Progress was observed during the scan to check that batches yielded to the interface.

## Results

| Scenario | Included notes | Content reads | Duration |
| --- | ---: | ---: | ---: |
| Core benchmark, cold | 5,011 | 5,011 | 231.7 ms |
| Core benchmark, warm | 5,011 | 0 | 25.5 ms |
| Obsidian dashboard, cold | 5,010 | 5,010 | 621 ms |
| Obsidian dashboard, cached refresh | 5,010 | 0 | 584 ms |
| Obsidian mobile emulation, cold | 5,010 | 5,010 | 857 ms |

The cold and warm core benchmark checksums matched. Creation and modification each invalidated one content entry; deletion returned the total to 5,010 with zero content rereads. A rename preserved correct results and reread one file.

## Findings

- Vault files are obtained once per analysis and link counts are precomputed.
- Content metrics are cached by path, modification time, and size.
- File-event bursts are debounced; the default delay is 750 ms.
- Analysis yields after each 40-file batch and supports cancellation/stale-run rejection.
- Heatmap cells are capped at 500 and note details render in pages of 100.
- The live progress display remained responsive during the 5,010-note scan.

These are approximate measurements on a synthetic vault, not universal performance guarantees. The test did not include a memory profiler or physical mobile hardware. Real performance depends on device speed, filesystem latency, note size, metadata-cache state, and other enabled plugins.
