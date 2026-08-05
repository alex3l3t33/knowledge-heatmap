import type { KnowledgeHeatmapSettings } from "./types";

export const DEFAULT_SETTINGS: Readonly<KnowledgeHeatmapSettings> = Object.freeze({
	staleAfterDays: 90,
	forgottenAfterDays: 365,
	expectedWordCount: 400,
	targetLinks: 6,
	newNoteGraceDays: 7,
	excludedPaths: [],
	autoRefresh: true,
	eventDebounceMs: 750,
});

const LIMITS = {
	staleAfterDays: { minimum: 1, maximum: 3_650 },
	forgottenAfterDays: { minimum: 2, maximum: 7_300 },
	expectedWordCount: { minimum: 1, maximum: 100_000 },
	targetLinks: { minimum: 1, maximum: 1_000 },
	newNoteGraceDays: { minimum: 0, maximum: 365 },
	eventDebounceMs: { minimum: 100, maximum: 5_000 },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberInRange(
	value: unknown,
	fallback: number,
	minimum: number,
	maximum: number,
): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}

	return Math.round(Math.min(maximum, Math.max(minimum, value)));
}

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return [...new Set(value.filter((item): item is string => typeof item === "string"))];
}

export function sanitizeSettings(value: unknown): KnowledgeHeatmapSettings {
	const input = isRecord(value) ? value : {};
	const staleAfterDays = numberInRange(
		input["staleAfterDays"],
		DEFAULT_SETTINGS.staleAfterDays,
		LIMITS.staleAfterDays.minimum,
		LIMITS.staleAfterDays.maximum,
	);
	const forgottenAfterDays = numberInRange(
		input["forgottenAfterDays"],
		DEFAULT_SETTINGS.forgottenAfterDays,
		Math.max(LIMITS.forgottenAfterDays.minimum, staleAfterDays + 1),
		LIMITS.forgottenAfterDays.maximum,
	);

	return {
		staleAfterDays,
		forgottenAfterDays,
		expectedWordCount: numberInRange(
			input["expectedWordCount"],
			DEFAULT_SETTINGS.expectedWordCount,
			LIMITS.expectedWordCount.minimum,
			LIMITS.expectedWordCount.maximum,
		),
		targetLinks: numberInRange(
			input["targetLinks"],
			DEFAULT_SETTINGS.targetLinks,
			LIMITS.targetLinks.minimum,
			LIMITS.targetLinks.maximum,
		),
		newNoteGraceDays: numberInRange(
			input["newNoteGraceDays"],
			DEFAULT_SETTINGS.newNoteGraceDays,
			LIMITS.newNoteGraceDays.minimum,
			LIMITS.newNoteGraceDays.maximum,
		),
		excludedPaths: stringArray(input["excludedPaths"]),
		autoRefresh:
			typeof input["autoRefresh"] === "boolean"
				? input["autoRefresh"]
				: DEFAULT_SETTINGS.autoRefresh,
		eventDebounceMs: numberInRange(
			input["eventDebounceMs"],
			DEFAULT_SETTINGS.eventDebounceMs,
			LIMITS.eventDebounceMs.minimum,
			LIMITS.eventDebounceMs.maximum,
		),
	};
}

export function settingsKey(settings: KnowledgeHeatmapSettings): string {
	return JSON.stringify({
		...settings,
		excludedPaths: [...settings.excludedPaths].sort(),
	});
}
