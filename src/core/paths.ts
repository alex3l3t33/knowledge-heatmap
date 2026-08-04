export function normalizePathInput(value: string): string {
	return value
		.trim()
		.replaceAll("\\", "/")
		.replace(/\/{2,}/gu, "/")
		.replace(/^\/+|\/+$/gu, "")
		.normalize("NFC");
}

export function isExcludedPath(path: string, excludedPaths: readonly string[]): boolean {
	return excludedPaths.some(
		(excludedPath) => path === excludedPath || path.startsWith(`${excludedPath}/`),
	);
}

export function folderForPath(path: string): string {
	const separatorIndex = path.lastIndexOf("/");
	return separatorIndex === -1 ? "Vault root" : path.slice(0, separatorIndex);
}
