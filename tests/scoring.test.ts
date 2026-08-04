import { describe, expect, it } from "vitest";
import {
	calculateScore,
	classifyScore,
	DAY_MS,
} from "../src/core/scoring";
import { metrics, NOW, settings } from "./test-helpers";

describe("calculateScore", () => {
	it("scores a healthy recent note", () => {
		const result = calculateScore(metrics(), settings(), NOW);

		expect(result.score).toBe(100);
		expect(result.status).toBe("healthy");
		expect(result.factors.map((factor) => factor.id)).toEqual([
			"recency",
			"connections",
			"substance",
		]);
	});

	it("classifies a moderately old, partly connected note as stale", () => {
		const result = calculateScore(
			metrics({
				modifiedAt: NOW - 180 * DAY_MS,
				createdAt: NOW - 500 * DAY_MS,
				wordCount: 200,
				backlinks: 1,
				outlinks: 1,
			}),
			settings(),
			NOW,
		);

		expect(result.score).toBeGreaterThanOrEqual(40);
		expect(result.score).toBeLessThan(70);
		expect(result.status).toBe("stale");
	});

	it("classifies an old empty orphan as forgotten", () => {
		const result = calculateScore(
			metrics({
				modifiedAt: NOW - 500 * DAY_MS,
				createdAt: NOW - 700 * DAY_MS,
				wordCount: 0,
				characterCount: 0,
				backlinks: 0,
				outlinks: 0,
			}),
			settings(),
			NOW,
		);

		expect(result.score).toBe(0);
		expect(result.status).toBe("forgotten");
	});

	it("scores an established empty note without crashing", () => {
		const result = calculateScore(
			metrics({
				wordCount: 0,
				characterCount: 0,
				backlinks: 0,
				outlinks: 0,
				createdAt: NOW - 100 * DAY_MS,
			}),
			settings(),
			NOW,
		);

		expect(result.score).toBe(60);
		expect(result.status).toBe("stale");
		expect(result.suggestedAction).toContain("summary");
	});

	it("gives a transparent grace bonus to a new note", () => {
		const result = calculateScore(
			metrics({
				wordCount: 0,
				characterCount: 0,
				backlinks: 0,
				outlinks: 0,
				createdAt: NOW,
			}),
			settings(),
			NOW,
		);

		expect(result.score).toBe(70);
		expect(result.status).toBe("healthy");
		expect(result.factors.at(-1)?.id).toBe("new-note-grace");
	});

	it("rewards links while capping the connection contribution", () => {
		const noLinks = calculateScore(
			metrics({ backlinks: 0, outlinks: 0 }),
			settings(),
			NOW,
		);
		const linked = calculateScore(
			metrics({ backlinks: 50, outlinks: 50 }),
			settings(),
			NOW,
		);

		expect(linked.score - noLinks.score).toBe(25);
		expect(
			linked.factors.find((factor) => factor.id === "connections")?.contribution,
		).toBe(25);
	});

	it("is deterministic when the analysis time is fixed", () => {
		const note = metrics({ modifiedAt: NOW - 123 * DAY_MS });
		const first = calculateScore(note, settings(), NOW);
		const second = calculateScore(note, settings(), NOW);

		expect(second).toEqual(first);
	});

	it("uses inclusive score boundaries", () => {
		expect(classifyScore(100)).toBe("healthy");
		expect(classifyScore(70)).toBe("healthy");
		expect(classifyScore(69)).toBe("stale");
		expect(classifyScore(40)).toBe("stale");
		expect(classifyScore(39)).toBe("forgotten");
		expect(classifyScore(0)).toBe("forgotten");
	});
});
