import { App, normalizePath, TFile } from "obsidian";
import { aggregateFolders, summarizeHealth } from "../core/aggregate";
import {
	AnalysisSnapshotCache,
	NoteContentCache,
	type CachedContentMetrics,
} from "../core/cache";
import { analyzeContent } from "../core/content";
import { folderForPath, isExcludedPath, normalizePathInput } from "../core/paths";
import { calculateScore } from "../core/scoring";
import { settingsKey } from "../core/settings";
import type {
	AnalysisProgress,
	AnalysisSnapshot,
	KnowledgeHeatmapSettings,
	NoteHealth,
	NoteMetrics,
} from "../core/types";

const FILE_BATCH_SIZE = 40;

export class AnalysisCancelledError extends Error {
	constructor() {
		super("Analysis was cancelled.");
		this.name = "AnalysisCancelledError";
	}
}

interface AnalyzeOptions {
	force?: boolean;
	signal?: AbortSignal;
	onProgress?: (progress: AnalysisProgress) => void;
}

interface FileContentResult {
	file: TFile;
	metrics: CachedContentMetrics;
	readError: boolean;
	didRead: boolean;
}

function checkCancelled(signal: AbortSignal | undefined): void {
	if (signal?.aborted) {
		throw new AnalysisCancelledError();
	}
}

async function yieldToInterface(signal: AbortSignal | undefined): Promise<void> {
	checkCancelled(signal);
	await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
	checkCancelled(signal);
}

function totalLinkCount(links: Record<string, number> | undefined): number {
	return Object.values(links ?? {}).reduce(
		(total, count) => total + (Number.isFinite(count) ? Math.max(0, count) : 0),
		0,
	);
}

export class KnowledgeDataService {
	private readonly contentCache = new NoteContentCache();
	private readonly snapshotCache = new AnalysisSnapshotCache();

	constructor(private readonly app: App) {}

	invalidateFile(path: string): void {
		this.contentCache.delete(path);
		this.snapshotCache.markVaultChanged();
	}

	deleteFile(path: string): void {
		this.contentCache.delete(path);
		this.snapshotCache.markVaultChanged();
	}

	renameFile(oldPath: string, newPath: string): void {
		this.contentCache.rename(oldPath, newPath);
		this.snapshotCache.markVaultChanged();
	}

	invalidateGraph(): void {
		this.snapshotCache.markVaultChanged();
	}

	invalidateSettings(): void {
		this.snapshotCache.markSettingsChanged();
	}

	dispose(): void {
		this.contentCache.clear();
		this.snapshotCache.clear();
	}

	async analyze(
		settings: KnowledgeHeatmapSettings,
		options: AnalyzeOptions = {},
	): Promise<AnalysisSnapshot> {
		const key = settingsKey(settings);
		if (!options.force) {
			const cached = this.snapshotCache.get(key);
			if (cached) {
				return cached;
			}
		}

		checkCancelled(options.signal);
		const startedAt = performance.now();
		const analyzedAt = Date.now();
		const allMarkdownFiles = this.app.vault.getMarkdownFiles();
		const excludedPaths = settings.excludedPaths
			.map(normalizePathInput)
			.filter((path) => path.length > 0)
			.map((path) => normalizePath(path));
		const includedFiles = allMarkdownFiles.filter(
			(file) => !isExcludedPath(file.path, excludedPaths),
		);
		const includedPaths = new Set(includedFiles.map((file) => file.path));
		const backlinks = this.buildBacklinkCounts(includedPaths);
		const notes: NoteHealth[] = [];
		let contentReads = 0;
		let readErrorCount = 0;

		options.onProgress?.({ processed: 0, total: includedFiles.length });
		for (let offset = 0; offset < includedFiles.length; offset += FILE_BATCH_SIZE) {
			checkCancelled(options.signal);
			const batch = includedFiles.slice(offset, offset + FILE_BATCH_SIZE);
			const contents = await Promise.all(
				batch.map(async (file) => this.getContentMetrics(file)),
			);

			for (const content of contents) {
				if (content.didRead) {
					contentReads += 1;
				}
				if (content.readError) {
					readErrorCount += 1;
				}
				const metrics = this.createNoteMetrics(content, backlinks);
				notes.push({
					metrics,
					result: calculateScore(metrics, settings, analyzedAt),
					readError: content.readError,
				});
			}

			options.onProgress?.({
				processed: Math.min(offset + batch.length, includedFiles.length),
				total: includedFiles.length,
			});
			await yieldToInterface(options.signal);
		}

		this.contentCache.prune(includedPaths);
		notes.sort(
			(left, right) =>
				left.result.score - right.result.score ||
				left.metrics.path.localeCompare(right.metrics.path),
		);
		const snapshot: AnalysisSnapshot = {
			notes,
			folders: aggregateFolders(notes),
			summary: summarizeHealth(notes),
			analyzedAt,
			durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
			totalMarkdownFiles: allMarkdownFiles.length,
			excludedCount: allMarkdownFiles.length - includedFiles.length,
			contentReads,
			readErrorCount,
		};
		checkCancelled(options.signal);
		this.snapshotCache.set(key, snapshot);
		return snapshot;
	}

	private buildBacklinkCounts(includedPaths: ReadonlySet<string>): Map<string, number> {
		const counts = new Map<string, number>();
		for (const [sourcePath, targets] of Object.entries(
			this.app.metadataCache.resolvedLinks,
		)) {
			if (!includedPaths.has(sourcePath)) {
				continue;
			}

			for (const [targetPath, count] of Object.entries(targets)) {
				if (!includedPaths.has(targetPath)) {
					continue;
				}
				counts.set(targetPath, (counts.get(targetPath) ?? 0) + Math.max(0, count));
			}
		}

		return counts;
	}

	private async getContentMetrics(file: TFile): Promise<FileContentResult> {
		const cached = this.contentCache.get(file.path, file.stat.mtime, file.stat.size);
		if (cached) {
			return { file, metrics: cached, readError: false, didRead: false };
		}

		try {
			const content = await this.app.vault.cachedRead(file);
			const analyzed = analyzeContent(content);
			const metrics: CachedContentMetrics = {
				mtime: file.stat.mtime,
				size: file.stat.size,
				...analyzed,
			};
			this.contentCache.set(file.path, metrics);
			return { file, metrics, readError: false, didRead: true };
		} catch {
			return {
				file,
				metrics: {
					mtime: file.stat.mtime,
					size: file.stat.size,
					characterCount: 0,
					wordCount: 0,
				},
				readError: true,
				didRead: true,
			};
		}
	}

	private createNoteMetrics(
		content: FileContentResult,
		backlinks: ReadonlyMap<string, number>,
	): NoteMetrics {
		const resolved = this.app.metadataCache.resolvedLinks[content.file.path];
		const unresolved = this.app.metadataCache.unresolvedLinks[content.file.path];

		return {
			path: content.file.path,
			name: content.file.basename,
			folder: folderForPath(content.file.path),
			modifiedAt: content.file.stat.mtime,
			createdAt: content.file.stat.ctime,
			wordCount: content.metrics.wordCount,
			characterCount: content.metrics.characterCount,
			backlinks: backlinks.get(content.file.path) ?? 0,
			outlinks: totalLinkCount(resolved) + totalLinkCount(unresolved),
		};
	}
}
