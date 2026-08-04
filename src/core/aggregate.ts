import type {
	FolderHealth,
	HealthStatus,
	HealthSummary,
	NoteHealth,
} from "./types";

function emptyCounts(): Record<HealthStatus, number> {
	return { healthy: 0, stale: 0, forgotten: 0 };
}

export function summarizeHealth(notes: readonly NoteHealth[]): HealthSummary {
	const counts = emptyCounts();
	let totalScore = 0;

	for (const note of notes) {
		counts[note.result.status] += 1;
		totalScore += note.result.score;
	}

	return {
		total: notes.length,
		healthy: counts.healthy,
		stale: counts.stale,
		forgotten: counts.forgotten,
		averageScore: notes.length === 0 ? 0 : Math.round(totalScore / notes.length),
	};
}

interface FolderAccumulator {
	path: string;
	noteCount: number;
	totalScore: number;
	counts: Record<HealthStatus, number>;
}

export function aggregateFolders(notes: readonly NoteHealth[]): FolderHealth[] {
	const folders = new Map<string, FolderAccumulator>();

	for (const note of notes) {
		const existing = folders.get(note.metrics.folder) ?? {
			path: note.metrics.folder,
			noteCount: 0,
			totalScore: 0,
			counts: emptyCounts(),
		};
		existing.noteCount += 1;
		existing.totalScore += note.result.score;
		existing.counts[note.result.status] += 1;
		folders.set(note.metrics.folder, existing);
	}

	return [...folders.values()]
		.map((folder) => ({
			path: folder.path,
			noteCount: folder.noteCount,
			averageScore: Math.round(folder.totalScore / folder.noteCount),
			healthyCount: folder.counts.healthy,
			staleCount: folder.counts.stale,
			forgottenCount: folder.counts.forgotten,
		}))
		.sort(
			(left, right) =>
				left.averageScore - right.averageScore || left.path.localeCompare(right.path),
		);
}
