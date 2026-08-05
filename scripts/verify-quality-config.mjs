import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const unsafeRules = [
	"@typescript-eslint/no-unsafe-call",
	"@typescript-eslint/no-unsafe-return",
];
const strictOptions = [
	"strict",
	"exactOptionalPropertyTypes",
	"noImplicitReturns",
	"noImplicitOverride",
	"noFallthroughCasesInSwitch",
	"noUncheckedIndexedAccess",
	"noPropertyAccessFromIndexSignature",
	"noUnusedLocals",
	"noUnusedParameters",
	"verbatimModuleSyntax",
	"noEmit",
];

const eslint = new ESLint({ cwd: projectRoot });
const eslintConfig = await eslint.calculateConfigForFile(
	join(projectRoot, "src", "main.ts"),
);

for (const rule of unsafeRules) {
	const setting = eslintConfig.rules?.[rule];
	const severity = Array.isArray(setting) ? setting[0] : setting;
	if (severity !== 2 && severity !== "error") {
		throw new Error(`${rule} must be enabled at error severity.`);
	}
}

const tsconfig = JSON.parse(
	await readFile(join(projectRoot, "tsconfig.json"), "utf8"),
);
for (const option of strictOptions) {
	if (tsconfig.compilerOptions?.[option] !== true) {
		throw new Error(`TypeScript compiler option ${option} must be true.`);
	}
}

if (tsconfig.compilerOptions?.allowUnreachableCode !== false) {
	throw new Error("TypeScript compiler option allowUnreachableCode must be false.");
}
if (tsconfig.compilerOptions?.allowUnusedLabels !== false) {
	throw new Error("TypeScript compiler option allowUnusedLabels must be false.");
}

process.stdout.write(
	`Verified strict TypeScript and ${unsafeRules.join(", ")} at error severity.\n`,
);
