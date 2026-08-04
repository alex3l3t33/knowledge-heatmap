import { DEFAULT_SETTINGS } from "../src/core/settings";
import type {
	KnowledgeHeatmapSettings,
	NoteMetrics,
} from "../src/core/types";

export const NOW = Date.UTC(2026, 7, 4, 12);

export function settings(
	patch: Partial<KnowledgeHeatmapSettings> = {},
): KnowledgeHeatmapSettings {
	return {
		...DEFAULT_SETTINGS,
		excludedPaths: [],
		...patch,
	};
}

export function metrics(patch: Partial<NoteMetrics> = {}): NoteMetrics {
	return {
		path: "Notes/example.md",
		name: "example",
		folder: "Notes",
		modifiedAt: NOW,
		createdAt: NOW - 30 * 86_400_000,
		wordCount: 400,
		characterCount: 2_000,
		backlinks: 3,
		outlinks: 3,
		...patch,
	};
}
