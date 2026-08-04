import { describe, expect, it } from "vitest";
import { aggregateFolders, summarizeHealth } from "../src/core/aggregate";
import { isExcludedPath, normalizePathInput } from "../src/core/paths";
import { calculateScore } from "../src/core/scoring";
import type { NoteHealth } from "../src/core/types";
import { metrics, NOW, settings } from "./test-helpers";

describe("path exclusions", () => {
	it("matches an excluded folder and its descendants without matching a prefix", () => {
		const excluded = [normalizePathInput(" /Archive\\Imported/ ")];

		expect(isExcludedPath("Archive/Imported", excluded)).toBe(true);
		expect(isExcludedPath("Archive/Imported/note.md", excluded)).toBe(true);
		expect(isExcludedPath("Archive/Imported-other/note.md", excluded)).toBe(false);
	});
});

describe("health aggregation", () => {
	it("handles an empty vault", () => {
		expect(summarizeHealth([])).toEqual({
			total: 0,
			healthy: 0,
			stale: 0,
			forgotten: 0,
			averageScore: 0,
		});
		expect(aggregateFolders([])).toEqual([]);
	});

	it("orders folders needing attention first", () => {
		const healthyMetrics = metrics({ path: "Healthy/a.md", folder: "Healthy" });
		const forgottenMetrics = metrics({
			path: "Archive/b.md",
			folder: "Archive",
			modifiedAt: NOW - 500 * 86_400_000,
			createdAt: NOW - 600 * 86_400_000,
			wordCount: 0,
			backlinks: 0,
			outlinks: 0,
		});
		const notes: NoteHealth[] = [healthyMetrics, forgottenMetrics].map((note) => ({
			metrics: note,
			result: calculateScore(note, settings(), NOW),
			readError: false,
		}));

		expect(aggregateFolders(notes).map((folder) => folder.path)).toEqual([
			"Archive",
			"Healthy",
		]);
	});
});
