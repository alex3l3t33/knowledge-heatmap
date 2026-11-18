import { describe, expect, it } from "vitest";
import { summarizeHealth } from "../src/core/aggregate";
import { createHistoryPoint, sanitizeHistory, updateHistory } from "../src/core/history";
import { calculateScore, DAY_MS } from "../src/core/scoring";
import type { AnalysisSnapshot, HealthHistoryPoint, NoteHealth } from "../src/core/types";
import { metrics, NOW, settings } from "./test-helpers";

function note(name: string, ageDays: number, links: number, words: number): NoteHealth {
	const noteMetrics = metrics({
		path: `${name}.md`,
		name,
		modifiedAt: NOW - ageDays * DAY_MS,
		backlinks: links,
		outlinks: 0,
		wordCount: words,
	});
	return {
		metrics: noteMetrics,
		result: calculateScore(noteMetrics, settings(), NOW),
		readError: false,
	};
}

function snapshot(notes: NoteHealth[]): AnalysisSnapshot {
	return {
		notes,
		folders: [],
		summary: summarizeHealth(notes),
		analyzedAt: NOW,
		durationMs: 10,
		totalMarkdownFiles: notes.length,
		excludedCount: 0,
		contentReads: notes.length,
		readErrorCount: 0,
	};
}

const point: HealthHistoryPoint = {
	date: "2026-08-04",
	averageScore: 60,
	healthy: 1,
	stale: 1,
	forgotten: 0,
	total: 2,
	freshness: 70,
	connections: 50,
	substance: 60,
};

describe("health history", () => {
	it("creates a compact daily point from aggregate scores", () => {
		const result = createHistoryPoint(snapshot([
			note("healthy", 0, 6, 400),
			note("forgotten", 500, 0, 0),
		]));

		expect(result.date).toBe("2026-08-04");
		expect(result.total).toBe(2);
		expect(result.averageScore).toBe(50);
		expect(result.freshness).toBe(50);
		expect(result.connections).toBe(50);
		expect(result.substance).toBe(50);
	});

	it("replaces the current day and keeps chronological order", () => {
		const updated = updateHistory([
			{ ...point, date: "2026-08-03", averageScore: 55 },
			point,
		], { ...point, averageScore: 64 });

		expect(updated.map((entry) => entry.date)).toEqual(["2026-08-03", "2026-08-04"]);
		expect(updated[1]?.averageScore).toBe(64);
	});

	it("rejects malformed records and keeps at most 90 days", () => {
		const valid = Array.from({ length: 95 }, (_, index) => ({
			...point,
			date: `2026-${String(Math.floor(index / 28) + 1).padStart(2, "0")}-${String(index % 28 + 1).padStart(2, "0")}`,
		}));
		const sanitized = sanitizeHistory([...valid, { ...point, date: "invalid" }]);

		expect(sanitized).toHaveLength(90);
		expect(sanitized.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))).toBe(true);
	});
});
