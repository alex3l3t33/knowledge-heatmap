import type { AnalysisSnapshot } from "./types";

export interface CachedContentMetrics {
	mtime: number;
	size: number;
	characterCount: number;
	wordCount: number;
}

export class NoteContentCache {
	private readonly entries = new Map<string, CachedContentMetrics>();

	get(path: string, mtime: number, size: number): CachedContentMetrics | undefined {
		const cached = this.entries.get(path);
		return cached?.mtime === mtime && cached.size === size ? cached : undefined;
	}

	set(path: string, metrics: CachedContentMetrics): void {
		this.entries.set(path, metrics);
	}

	delete(path: string): boolean {
		return this.entries.delete(path);
	}

	rename(oldPath: string, newPath: string): void {
		const cached = this.entries.get(oldPath);
		if (!cached) {
			return;
		}

		this.entries.delete(oldPath);
		this.entries.set(newPath, cached);
	}

	prune(validPaths: ReadonlySet<string>): void {
		for (const path of this.entries.keys()) {
			if (!validPaths.has(path)) {
				this.entries.delete(path);
			}
		}
	}

	clear(): void {
		this.entries.clear();
	}

	get size(): number {
		return this.entries.size;
	}
}

interface SnapshotEntry {
	revision: number;
	settingsKey: string;
	snapshot: AnalysisSnapshot;
}

export class AnalysisSnapshotCache {
	private revision = 0;
	private entry: SnapshotEntry | undefined;

	markVaultChanged(): void {
		this.revision += 1;
		this.entry = undefined;
	}

	markSettingsChanged(): void {
		this.entry = undefined;
	}

	get(settingsKey: string): AnalysisSnapshot | undefined {
		return this.entry?.revision === this.revision && this.entry.settingsKey === settingsKey
			? this.entry.snapshot
			: undefined;
	}

	set(settingsKey: string, snapshot: AnalysisSnapshot): void {
		this.entry = { revision: this.revision, settingsKey, snapshot };
	}

	clear(): void {
		this.entry = undefined;
	}
}
