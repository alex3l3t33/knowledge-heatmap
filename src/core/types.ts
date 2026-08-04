export type HealthStatus = "healthy" | "stale" | "forgotten";

export interface KnowledgeHeatmapSettings {
	staleAfterDays: number;
	forgottenAfterDays: number;
	expectedWordCount: number;
	targetLinks: number;
	newNoteGraceDays: number;
	excludedPaths: string[];
	autoRefresh: boolean;
	eventDebounceMs: number;
}

export interface NoteMetrics {
	path: string;
	name: string;
	folder: string;
	modifiedAt: number;
	createdAt: number;
	wordCount: number;
	characterCount: number;
	backlinks: number;
	outlinks: number;
}

export type ScoreFactorId =
	| "recency"
	| "connections"
	| "substance"
	| "new-note-grace";

export interface ScoreFactor {
	id: ScoreFactorId;
	label: string;
	rawScore: number;
	maxPoints: number;
	contribution: number;
	explanation: string;
}

export interface ScoringResult {
	score: number;
	status: HealthStatus;
	ageDays: number;
	factors: ScoreFactor[];
	reason: string;
	suggestedAction: string;
}

export interface NoteHealth {
	metrics: NoteMetrics;
	result: ScoringResult;
	readError: boolean;
}

export interface FolderHealth {
	path: string;
	noteCount: number;
	averageScore: number;
	healthyCount: number;
	staleCount: number;
	forgottenCount: number;
}

export interface HealthSummary {
	total: number;
	healthy: number;
	stale: number;
	forgotten: number;
	averageScore: number;
}

export interface AnalysisSnapshot {
	notes: NoteHealth[];
	folders: FolderHealth[];
	summary: HealthSummary;
	analyzedAt: number;
	durationMs: number;
	totalMarkdownFiles: number;
	excludedCount: number;
	contentReads: number;
	readErrorCount: number;
}

export interface AnalysisProgress {
	processed: number;
	total: number;
}
