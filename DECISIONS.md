# Decisions

## Core Architecture
- **Language**: TypeScript
- **Bundler**: esbuild (Standard for Obsidian plugins)
- **Plugin ID**: knowledge-heatmap
- **Display Name**: Knowledge Heatmap

## Development Strategy
- **Vault Isolation**: All testing will be done in `KnowledgeHeatmapDevVault` using synthetic data.
- **Local First**: No external API calls; all processing happens locally.
