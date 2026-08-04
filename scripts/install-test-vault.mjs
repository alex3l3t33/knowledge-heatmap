import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vaultPath = resolve(projectRoot, "..", "knowledge-heatmap-test-vault");
const markerPath = join(vaultPath, ".knowledge-heatmap-test-vault");
const pluginPath = join(vaultPath, ".obsidian", "plugins", "knowledge-heatmap");
const releaseFiles = ["main.js", "manifest.json", "styles.css"];

await access(markerPath);
await mkdir(pluginPath, { recursive: true });
for (const file of releaseFiles) {
	await access(join(projectRoot, file));
	await copyFile(join(projectRoot, file), join(pluginPath, file));
}

const enabledPluginsPath = join(vaultPath, ".obsidian", "community-plugins.json");
let enabledPlugins = [];
try {
	enabledPlugins = JSON.parse(await readFile(enabledPluginsPath, "utf8"));
} catch {
	enabledPlugins = [];
}
if (!Array.isArray(enabledPlugins)) {
	throw new Error("The test vault community plugin list is not an array.");
}
if (!enabledPlugins.includes("knowledge-heatmap")) {
	enabledPlugins.push("knowledge-heatmap");
}
await writeFile(enabledPluginsPath, `${JSON.stringify(enabledPlugins, null, 2)}\n`);

const settingsPath = join(pluginPath, "data.json");
try {
	await access(settingsPath);
} catch {
	await writeFile(
		settingsPath,
		`${JSON.stringify(
			{
				staleAfterDays: 90,
				forgottenAfterDays: 365,
				expectedWordCount: 400,
				targetLinks: 6,
				newNoteGraceDays: 7,
				excludedPaths: ["Excluded"],
				autoRefresh: true,
				eventDebounceMs: 750,
			},
			null,
			2,
		)}\n`,
	);
}

process.stdout.write(`Installed ${releaseFiles.join(", ")} in ${pluginPath}.\n`);
