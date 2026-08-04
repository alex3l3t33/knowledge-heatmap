import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules",
		"main.js",
		"coverage",
		"release",
		"KnowledgeHeatmapDevVault",
		".venv",
		".idea",
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.mts",
						"esbuild.config.mjs",
						"version-bump.mjs",
						"scripts/*.mjs",
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["*.mjs", "scripts/*.mjs", "scripts/*.ts"],
		rules: {
			"obsidianmd/no-nodejs-modules": "off",
			"obsidianmd/hardcoded-config-path": "off",
			"no-unsanitized/method": "off",
		},
	},
);
