export interface ContentMetrics {
	characterCount: number;
	wordCount: number;
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu;

export function withoutCompleteFrontmatter(content: string): string {
	const normalized = content.startsWith("\uFEFF") ? content.slice(1) : content;
	const lines = normalized.split(/\r?\n/u);
	if (lines[0]?.trim() !== "---") {
		return normalized;
	}

	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index]?.trim();
		if (line === "---" || line === "...") {
			return lines.slice(index + 1).join("\n");
		}
	}

	// A missing closing delimiter is malformed frontmatter. Keep the text so a
	// malformed header cannot make the entire note appear empty or throw.
	return normalized;
}

export function analyzeContent(content: string): ContentMetrics {
	const body = withoutCompleteFrontmatter(content).trim();
	const words = body.match(WORD_PATTERN);

	return {
		characterCount: body.length,
		wordCount: words?.length ?? 0,
	};
}
