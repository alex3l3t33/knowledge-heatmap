# Security policy

## Supported versions

Security fixes are applied to the latest published release.

## Reporting a vulnerability

Use [GitHub's private vulnerability report](https://github.com/alex3l3t33/knowledge-heatmap/security/advisories/new) when available. If private reporting is unavailable, open a minimal issue requesting a private contact channel and do not publish exploit details or private vault content.

Include the affected version, impact, reproduction conditions, and a proof of concept that uses synthetic data. Please allow reasonable time for investigation before public disclosure.

## Security posture

Knowledge Heatmap is local-first and read-only. It has no runtime network requests, telemetry, remote code, external account, filesystem adapter assumptions, or note-writing features. Release dependencies are development tools and are locked in `package-lock.json`.
