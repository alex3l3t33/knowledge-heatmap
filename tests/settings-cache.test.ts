import { describe, expect, it } from "vitest";
import {
	AnalysisSnapshotCache,
	NoteContentCache,
} from "../src/core/cache";
import { sanitizeSettings, settingsKey } from "../src/core/settings";
import type { AnalysisSnapshot } from "../src/core/types";
import { settings } from "./test-helpers";

const snapshot: AnalysisSnapshot = {
	notes: [],
	folders: [],
	summary: { total: 0, healthy: 0, stale: 0, forgotten: 0, averageScore: 0 },
	analyzedAt: 0,
	durationMs: 0,
	totalMarkdownFiles: 0,
	excludedCount: 0,
	contentReads: 0,
	readErrorCount: 0,
};

describe("settings", () => {
	it("sanitizes malformed persisted values and preserves valid changes", () => {
		const sanitized = sanitizeSettings({
			staleAfterDays: 120,
			forgottenAfterDays: 20,
			targetLinks: Number.NaN,
			expectedWordCount: 800,
			autoRefresh: false,
			excludedPaths: ["Archive", 42, "Archive"],
		});

		expect(sanitized.staleAfterDays).toBe(120);
		expect(sanitized.forgottenAfterDays).toBe(121);
		expect(sanitized.expectedWordCount).toBe(800);
		expect(sanitized.targetLinks).toBe(6);
		expect(sanitized.autoRefresh).toBe(false);
		expect(sanitized.excludedPaths).toEqual(["Archive"]);
	});

	it("includes scoring and exclusion changes in the cache key", () => {
		expect(settingsKey(settings())).not.toBe(
			settingsKey(settings({ expectedWordCount: 900 })),
		);
		expect(settingsKey(settings())).not.toBe(
			settingsKey(settings({ excludedPaths: ["Archive"] })),
		);
	});
});

describe("content cache", () => {
	it("invalidates a modified file when mtime or size changes", () => {
		const cache = new NoteContentCache();
		cache.set("note.md", {
			mtime: 10,
			size: 20,
			characterCount: 15,
			wordCount: 3,
		});

		expect(cache.get("note.md", 10, 20)?.wordCount).toBe(3);
		expect(cache.get("note.md", 11, 20)).toBeUndefined();
		expect(cache.get("note.md", 10, 21)).toBeUndefined();
	});

	it("moves cached content on file rename", () => {
		const cache = new NoteContentCache();
		cache.set("old.md", {
			mtime: 10,
			size: 20,
			characterCount: 15,
			wordCount: 3,
		});
		cache.rename("old.md", "Folder/new.md");

		expect(cache.get("old.md", 10, 20)).toBeUndefined();
		expect(cache.get("Folder/new.md", 10, 20)?.wordCount).toBe(3);
	});

	it("removes cached content on file deletion", () => {
		const cache = new NoteContentCache();
		cache.set("deleted.md", {
			mtime: 10,
			size: 20,
			characterCount: 15,
			wordCount: 3,
		});

		expect(cache.delete("deleted.md")).toBe(true);
		expect(cache.get("deleted.md", 10, 20)).toBeUndefined();
	});
});

describe("analysis snapshot cache", () => {
	it("invalidates snapshots after a vault event", () => {
		const cache = new AnalysisSnapshotCache();
		cache.set("settings", snapshot);
		cache.markVaultChanged();

		expect(cache.get("settings")).toBeUndefined();
	});

	it("invalidates snapshots after settings change", () => {
		const cache = new AnalysisSnapshotCache();
		cache.set("settings", snapshot);
		cache.markSettingsChanged();

		expect(cache.get("settings")).toBeUndefined();
	});
});
