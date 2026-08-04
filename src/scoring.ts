export type NoteMetrics = {
    id: string;
    name: string;
    lastModified: number; // timestamp
    contentLength: number;
    backlinks: number;
    outlinks: number;
};

export type ScoringResult = {
    score: number; // 0-100
    status: 'healthy' | 'stale' | 'forgotten';
    reason: string;
};

export function calculateScore(metrics: NoteMetrics): ScoringResult {
    const now = Date.now();
    const ageInDays = (now - metrics.lastModified) / (1000 * 60 * 60 * 24);

    // Weights
    const recencyWeight = 0.5;
    const connectivityWeight = 0.3;
    const contentWeight = 0.2;

    // Recency score (Higher is better/newer)
    // If age < 30 days, score is 100. If age > 365, score is 0.
    let recencyScore = Math.max(0, Math.min(100, (1 - ageInDays / 365) * 100));

    // Connectivity score (higher number of links increases score)
    const totalLinks = metrics.backlinks + metrics.outlinks;
    let connectivityScore = Math.min(100, (totalLinks / 10) * 100);

    // Content score (more content is better)
    let contentScore = Math.min(100, (metrics.contentLength / 1000) * 100);

    const totalScore = (recencyScore * recencyWeight) + 
                       (connectivityScore * connectivityWeight) + 
                       (contentScore * contentWeight);

    let status: 'healthy' | 'stale' | 'forgotten' = 'healthy';
    let reason = "Healthy note.";

    if (ageInDays > 365) {
        status = 'forgotten';
        reason = "Not modified in over a year.";
    } else if (ageInDays > 180) {
        status = 'stale';
        reason = "Not modified in over 6 months.";
    }

    return {
        score: Math.round(totalScore),
        status,
        reason
    };
}
