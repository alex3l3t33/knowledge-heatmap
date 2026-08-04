import type {
	HealthStatus,
	KnowledgeHeatmapSettings,
	NoteMetrics,
	ScoreFactor,
	ScoringResult,
} from "./types";

export const DAY_MS = 86_400_000;
export const HEALTHY_MINIMUM = 70;
export const STALE_MINIMUM = 40;

const RECENCY_POINTS = 60;
const CONNECTION_POINTS = 25;
const SUBSTANCE_POINTS = 15;
const NEW_NOTE_BONUS = 10;

function nonNegative(value: number): number {
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundOne(value: number): number {
	return Math.round(value * 10) / 10;
}

function plural(value: number, singular: string): string {
	return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

export function classifyScore(score: number): HealthStatus {
	if (score >= HEALTHY_MINIMUM) {
		return "healthy";
	}

	if (score >= STALE_MINIMUM) {
		return "stale";
	}

	return "forgotten";
}

function createFactor(
	id: ScoreFactor["id"],
	label: string,
	rawScore: number,
	maxPoints: number,
	explanation: string,
): ScoreFactor {
	return {
		id,
		label,
		rawScore: roundOne(rawScore),
		maxPoints,
		contribution: roundOne((rawScore / 100) * maxPoints),
		explanation,
	};
}

function suggestedAction(factors: readonly ScoreFactor[]): string {
	const weakest = factors
		.filter((factor) => factor.id !== "new-note-grace")
		.reduce((current, factor) =>
			factor.rawScore <= current.rawScore ? factor : current,
		);

	switch (weakest.id) {
		case "recency":
			return "Review the note, then update, archive, or intentionally leave it as reference material.";
		case "connections":
			return "Add a useful link to a related note, or link another note back to this one.";
		case "substance":
			return "Add a concise summary, key points, or a clear next step.";
		case "new-note-grace":
			return "Revisit this new note after it has had time to develop.";
	}
}

export function calculateScore(
	metrics: NoteMetrics,
	settings: KnowledgeHeatmapSettings,
	now = Date.now(),
): ScoringResult {
	const modifiedAt = nonNegative(metrics.modifiedAt);
	const createdAt = nonNegative(metrics.createdAt || modifiedAt);
	const ageDays = nonNegative((now - modifiedAt) / DAY_MS);
	const creationAgeDays = nonNegative((now - createdAt) / DAY_MS);
	const recencyRange = settings.forgottenAfterDays - settings.staleAfterDays;
	const recencyScore =
		ageDays <= settings.staleAfterDays
			? 100
			: Math.max(
					0,
					((settings.forgottenAfterDays - ageDays) / recencyRange) * 100,
				);
	const totalLinks = Math.round(nonNegative(metrics.backlinks) + nonNegative(metrics.outlinks));
	const connectionScore = Math.min(100, (totalLinks / settings.targetLinks) * 100);
	const wordCount = Math.round(nonNegative(metrics.wordCount));
	const substanceScore = Math.min(100, (wordCount / settings.expectedWordCount) * 100);

	const factors: ScoreFactor[] = [
		createFactor(
			"recency",
			"Recency",
			recencyScore,
			RECENCY_POINTS,
			ageDays < 1
				? "Edited today."
				: `Edited ${plural(Math.floor(ageDays), "day")} ago.`,
		),
		createFactor(
			"connections",
			"Connections",
			connectionScore,
			CONNECTION_POINTS,
			`${plural(totalLinks, "link")} (${metrics.backlinks} in, ${metrics.outlinks} out).`,
		),
		createFactor(
			"substance",
			"Substance",
			substanceScore,
			SUBSTANCE_POINTS,
			`${plural(wordCount, "word")} against the ${settings.expectedWordCount}-word target.`,
		),
	];

	const baseScore = factors.reduce((total, factor) => total + factor.contribution, 0);
	const eligibleForGrace =
		settings.newNoteGraceDays > 0 && creationAgeDays <= settings.newNoteGraceDays;
	const graceBonus = eligibleForGrace
		? Math.min(NEW_NOTE_BONUS, Math.max(0, HEALTHY_MINIMUM - baseScore))
		: 0;
	if (graceBonus > 0) {
		factors.push({
			id: "new-note-grace",
			label: "New-note grace",
			rawScore: 100,
			maxPoints: NEW_NOTE_BONUS,
			contribution: roundOne(graceBonus),
			explanation: `Created within the ${plural(settings.newNoteGraceDays, "day")} grace period.`,
		});
	}

	const score = Math.round(Math.min(100, baseScore + graceBonus));
	const status = classifyScore(score);
	const statusLabel = status[0]?.toUpperCase() + status.slice(1);

	return {
		score,
		status,
		ageDays: roundOne(ageDays),
		factors,
		reason: `${statusLabel}: ${Math.round(ageDays)} days since the last edit, ${plural(totalLinks, "link")}, and ${plural(wordCount, "word")}.`,
		suggestedAction: suggestedAction(factors),
	};
}
