import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { NoteContentCache } from "../src/core/cache";
import { analyzeContent } from "../src/core/content";
import { folderForPath } from "../src/core/paths";
import { calculateScore } from "../src/core/scoring";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import type { NoteMetrics } from "../src/core/types";

const BATCH_SIZE = 40;

interface PassResult {
	durationMs: number;
	contentReads: number;
	checksum: number;
}

async function markdownFiles(root: string): Promise<string[]> {
	const paths: string[] = [];

	async function walk(directory: string): Promise<void> {
		const entries = await readdir(directory, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name === ".obsidian") {
				continue;
			}
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				await walk(path);
			} else if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith(".md")) {
				paths.push(path);
			}
		}
	}

	await walk(root);
	return paths.sort();
}

async function runPass(
	root: string,
	files: readonly string[],
	cache: NoteContentCache,
): Promise<PassResult> {
	const startedAt = performance.now();
	const now = Date.now();
	let contentReads = 0;
	let checksum = 0;

	for (let offset = 0; offset < files.length; offset += BATCH_SIZE) {
		const batch = files.slice(offset, offset + BATCH_SIZE);
		const records = await Promise.all(
			batch.map(async (path) => {
				const details = await stat(path);
				let content = cache.get(path, details.mtimeMs, details.size);
				if (!content) {
					const analyzed = analyzeContent(await readFile(path, "utf8"));
					content = {
						mtime: details.mtimeMs,
						size: details.size,
						...analyzed,
					};
					cache.set(path, content);
					contentReads += 1;
				}

				return { path, details, content };
			}),
		);

		for (const record of records) {
			const relativePath = record.path.slice(root.length + 1);
			const metrics: NoteMetrics = {
				path: relativePath,
				name: relativePath.split("/").at(-1)?.replace(/\.md$/u, "") ?? relativePath,
				folder: folderForPath(relativePath),
				modifiedAt: record.details.mtimeMs,
				createdAt: record.details.ctimeMs,
				wordCount: record.content.wordCount,
				characterCount: record.content.characterCount,
				backlinks: 0,
				outlinks: 0,
			};
			checksum += calculateScore(metrics, { ...DEFAULT_SETTINGS, excludedPaths: [] }, now)
				.score;
		}
		await new Promise<void>((resolve) => setImmediate(resolve));
	}

	return {
		durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
		contentReads,
		checksum,
	};
}

export async function runBenchmark(root: string): Promise<{
	noteCount: number;
	cold: PassResult;
	warm: PassResult;
}> {
	const files = await markdownFiles(root);
	const cache = new NoteContentCache();
	const cold = await runPass(root, files, cache);
	const warm = await runPass(root, files, cache);
	return { noteCount: files.length, cold, warm };
}
