import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseFiles = ["main.js", "manifest.json", "styles.css"];
const versionPattern = /^\d+\.\d+\.\d+$/u;

async function readJson(file) {
	return JSON.parse(await readFile(join(projectRoot, file), "utf8"));
}

const [manifest, packageJson, versions] = await Promise.all([
	readJson("manifest.json"),
	readJson("package.json"),
	readJson("versions.json"),
]);

if (!versionPattern.test(manifest.version)) {
	throw new Error("manifest.json must use an unprefixed x.y.z version.");
}
if (packageJson.version !== manifest.version) {
	throw new Error("package.json and manifest.json versions must match.");
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	throw new Error("versions.json must map the release to manifest minAppVersion.");
}
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== manifest.version) {
	throw new Error("The release tag must exactly match manifest.json version.");
}

const hashes = [];
for (const file of releaseFiles) {
	const path = join(projectRoot, file);
	const details = await stat(path);
	if (!details.isFile() || details.size === 0) {
		throw new Error(`${file} must be a non-empty release file.`);
	}
	const contents = await readFile(path);
	hashes.push(`${file} ${createHash("sha256").update(contents).digest("hex")}`);
}

process.stdout.write(
	`Verified release ${manifest.version}:\n${hashes.join("\n")}\n`,
);
