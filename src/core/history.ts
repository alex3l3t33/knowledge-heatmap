import type { AnalysisSnapshot, HealthHistoryPoint, NoteHealth } from "./types";

const MAX_HISTORY_DAYS = 90;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedInteger(value: unknown, maximum: number): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return Math.round(Math.min(maximum, Math.max(0, value)));
}

function factorAverage(
	notes: readonly NoteHealth[],
	factorId: "recency" | "connections" | "substance",
): number {
	if (notes.length === 0) return 0;
	const total = notes.reduce((sum, note) => {
		return sum + (note.result.factors.find((factor) => factor.id === factorId)?.rawScore ?? 0);
	}, 0);
	return Math.round(total / notes.length);
}

export function createHistoryPoint(snapshot: AnalysisSnapshot): HealthHistoryPoint {
	const analyzedDate = new Date(snapshot.analyzedAt);
	const date = [
		analyzedDate.getFullYear(),
		String(analyzedDate.getMonth() + 1).padStart(2, "0"),
		String(analyzedDate.getDate()).padStart(2, "0"),
	].join("-");
	return {
		date,
		averageScore: snapshot.summary.averageScore,
		healthy: snapshot.summary.healthy,
		stale: snapshot.summary.stale,
		forgotten: snapshot.summary.forgotten,
		total: snapshot.summary.total,
		freshness: factorAverage(snapshot.notes, "recency"),
		connections: factorAverage(snapshot.notes, "connections"),
		substance: factorAverage(snapshot.notes, "substance"),
	};
}

export function sanitizeHistory(value: unknown): HealthHistoryPoint[] {
	if (!Array.isArray(value)) return [];
	const byDate = new Map<string, HealthHistoryPoint>();
	for (const item of value) {
		if (!isRecord(item) || typeof item["date"] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item["date"])) continue;
		const averageScore = boundedInteger(item["averageScore"], 100);
		const healthy = boundedInteger(item["healthy"], Number.MAX_SAFE_INTEGER);
		const stale = boundedInteger(item["stale"], Number.MAX_SAFE_INTEGER);
		const forgotten = boundedInteger(item["forgotten"], Number.MAX_SAFE_INTEGER);
		const total = boundedInteger(item["total"], Number.MAX_SAFE_INTEGER);
		const freshness = boundedInteger(item["freshness"], 100);
		const connections = boundedInteger(item["connections"], 100);
		const substance = boundedInteger(item["substance"], 100);
		if ([averageScore, healthy, stale, forgotten, total, freshness, connections, substance].some((entry) => entry === undefined)) continue;
		if ((healthy ?? 0) + (stale ?? 0) + (forgotten ?? 0) !== total) continue;
		byDate.set(item["date"], {
			date: item["date"],
			averageScore: averageScore ?? 0,
			healthy: healthy ?? 0,
			stale: stale ?? 0,
			forgotten: forgotten ?? 0,
			total: total ?? 0,
			freshness: freshness ?? 0,
			connections: connections ?? 0,
			substance: substance ?? 0,
		});
	}
	return [...byDate.values()]
		.sort((left, right) => left.date.localeCompare(right.date))
		.slice(-MAX_HISTORY_DAYS);
}

export function updateHistory(
	history: readonly HealthHistoryPoint[],
	point: HealthHistoryPoint,
): HealthHistoryPoint[] {
	return sanitizeHistory([...history.filter((entry) => entry.date !== point.date), point]);
}
