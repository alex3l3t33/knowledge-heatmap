import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vaultPath = resolve(projectRoot, "..", "knowledge-heatmap-test-vault");
await access(resolve(vaultPath, ".knowledge-heatmap-test-vault"));

const result = await esbuild.build({
	entryPoints: [resolve(projectRoot, "scripts", "benchmark-worker.ts")],
	bundle: true,
	format: "esm",
	platform: "node",
	target: "node20",
	write: false,
});
const output = result.outputFiles[0];
if (!output) {
	throw new Error("The benchmark worker did not build.");
}
const worker = await import(
	`data:text/javascript;base64,${Buffer.from(output.contents).toString("base64")}`
);
const metrics = await worker.runBenchmark(vaultPath);

process.stdout.write(
	[
		`Vault: ${vaultPath}`,
		`Markdown notes: ${metrics.noteCount}`,
		`Cold pass: ${metrics.cold.durationMs} ms (${metrics.cold.contentReads} content reads)`,
		`Warm pass: ${metrics.warm.durationMs} ms (${metrics.warm.contentReads} content reads)`,
		`Deterministic checksum: ${metrics.cold.checksum === metrics.warm.checksum ? "matched" : "mismatched"}`,
	].join("\n") + "\n",
);
