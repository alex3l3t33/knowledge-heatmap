import { describe, expect, it } from "vitest";
import {
	analyzeContent,
	withoutCompleteFrontmatter,
} from "../src/core/content";

describe("content analysis", () => {
	it("handles an empty note", () => {
		expect(analyzeContent("\n\t")).toEqual({ characterCount: 0, wordCount: 0 });
	});

	it("ignores complete frontmatter when measuring substance", () => {
		const content = "---\ntags: [one, two]\nreviewed: true\n---\nA useful summary.";

		expect(withoutCompleteFrontmatter(content)).toBe("A useful summary.");
		expect(analyzeContent(content).wordCount).toBe(3);
	});

	it("treats malformed frontmatter as content instead of throwing", () => {
		const malformed = "---\ntags: [unfinished\nStill readable text";

		expect(() => analyzeContent(malformed)).not.toThrow();
		expect(analyzeContent(malformed).wordCount).toBeGreaterThan(0);
	});

	it("counts Unicode words without regex lookbehind", () => {
		expect(analyzeContent("Résumé 知识 база").wordCount).toBe(3);
	});
});
