import {
	access,
	mkdir,
	readFile,
	utimes,
	writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vaultPath = resolve(projectRoot, "..", "knowledge-heatmap-test-vault");
const markerPath = join(vaultPath, ".knowledge-heatmap-test-vault");
const largeNoteCount = 5_000;

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function ensureSafeVault() {
	if ((await exists(vaultPath)) && !(await exists(markerPath))) {
		throw new Error(
			`Refusing to modify ${vaultPath}: the dedicated test-vault marker is missing.`,
		);
	}

	await mkdir(vaultPath, { recursive: true });
	await writeFile(
		markerPath,
		"Synthetic Knowledge Heatmap test vault. Contains no private user content.\n",
	);
	await mkdir(join(vaultPath, ".obsidian", "plugins", "knowledge-heatmap"), {
		recursive: true,
	});
	await writeFile(
		join(vaultPath, ".obsidian", "app.json"),
		`${JSON.stringify({ safeMode: false }, null, 2)}\n`,
	);
	await writeFile(
		join(vaultPath, ".obsidian", "community-plugins.json"),
		`${JSON.stringify(["knowledge-heatmap"], null, 2)}\n`,
	);
}

async function writeNote(relativePath, content, ageDays = 0) {
	const path = join(vaultPath, relativePath);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content);
	const modified = new Date(Date.now() - ageDays * 86_400_000);
	await utimes(path, modified, modified);
}

async function writeRepresentativeNotes() {
	const maintainedBody = Array.from(
		{ length: 80 },
		(_, index) => `Maintained idea ${index + 1} connects evidence to action.`,
	).join(" ");
	await writeNote(
		"00 Overview/Recently maintained.md",
		`---\nstatus: maintained\ntags: [knowledge, review]\n---\n# Recently maintained\n\n${maintainedBody}\n\nRelated: [[03 Links/Hub]] and [[03 Links/Linked note]].\n`,
		1,
	);
	await writeNote("00 Overview/New empty.md", "", 0);
	await writeNote(
		"01 Stale/Stale note.md",
		"# Stale note\n\nA short idea that has not been revisited. Link: [[03 Links/Hub]].\n",
		220,
	);
	await writeNote(
		"02 Forgotten/Forgotten orphan.md",
		"# Forgotten orphan\n\nAn isolated fragment.\n",
		800,
	);
	await writeNote(
		"03 Links/Hub.md",
		"# Hub\n\n[[00 Overview/Recently maintained]]\n[[03 Links/Linked note]]\n[[01 Stale/Stale note]]\n[[05 Nested/Topic/Subtopic/Nested note]]\n",
		5,
	);
	await writeNote(
		"03 Links/Linked note.md",
		"# Linked note\n\nThis note has useful incoming and outgoing links. [[03 Links/Hub]]\n",
		20,
	);
	await writeNote(
		"03 Links/Orphan note.md",
		"# Orphan note\n\nNo links connect this note to another note.\n",
		45,
	);
	await writeNote(
		"04 Metadata/Valid frontmatter.md",
		"---\naliases: [Metadata example]\nreviewed: 2026-08-04\n---\n# Valid frontmatter\n\nThe YAML block is excluded from substance measurement.\n",
		10,
	);
	await writeNote(
		"04 Metadata/Malformed frontmatter.md",
		"---\ntags: [unfinished\nreviewed: maybe\n# Malformed frontmatter\n\nThe analyzer must remain safe and readable.\n",
		30,
	);
	await writeNote(
		"05 Nested/Topic/Subtopic/Nested note.md",
		"# Nested note\n\nA topic nested several folders deep. [[03 Links/Hub]]\n",
		120,
	);
	await writeNote(
		"Excluded/Templates/template.md",
		"# Template\n\nThis path verifies folder exclusion.\n",
		0,
	);
	await writeNote("NonMarkdown/example.txt", "This non-Markdown file is ignored.\n", 0);
}

function generatedContent(index) {
	const paragraphCount = 2 + (index % 8);
	const paragraphs = Array.from({ length: paragraphCount }, (_, paragraphIndex) =>
		`Synthetic note ${index} paragraph ${paragraphIndex + 1} contains local test words for deterministic performance validation.`,
	).join("\n\n");
	const link = index > 0 ? `\n\nRelated: [[Large/Batch-${String(Math.floor((index - 1) / 100)).padStart(3, "0")}/note-${String(index - 1).padStart(5, "0")}]].` : "";
	return `# Synthetic note ${index}\n\n${paragraphs}${link}\n`;
}

async function writeLargeSample() {
	const batchSize = 100;
	for (let offset = 0; offset < largeNoteCount; offset += batchSize) {
		const writes = [];
		for (let index = offset; index < Math.min(offset + batchSize, largeNoteCount); index += 1) {
			const folder = `Large/Batch-${String(Math.floor(index / batchSize)).padStart(3, "0")}`;
			const file = `note-${String(index).padStart(5, "0")}.md`;
			writes.push(writeNote(`${folder}/${file}`, generatedContent(index), index % 730));
		}
		await Promise.all(writes);
	}
}

await ensureSafeVault();
await writeRepresentativeNotes();
await writeLargeSample();

const appConfig = JSON.parse(
	await readFile(join(vaultPath, ".obsidian", "app.json"), "utf8"),
);
if (appConfig.safeMode !== false) {
	throw new Error("The disposable vault was not configured for community plugins.");
}

process.stdout.write(
	`Generated ${largeNoteCount + 11} Markdown notes in ${vaultPath}.\n`,
);
