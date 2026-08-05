import {
	App,
	normalizePath,
	Plugin,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
} from "obsidian";
import { DEFAULT_SETTINGS } from "../core/settings";
import { normalizePathInput } from "../core/paths";
import type { KnowledgeHeatmapSettings } from "../core/types";

type NumericSettingKey =
	| "staleAfterDays"
	| "forgottenAfterDays"
	| "expectedWordCount"
	| "targetLinks"
	| "newNoteGraceDays"
	| "eventDebounceMs";

export interface SettingsController {
	pluginSettings: KnowledgeHeatmapSettings;
	updateSettings(settings: KnowledgeHeatmapSettings): Promise<void>;
}

interface NumberSettingOptions {
	key: NumericSettingKey;
	name: string;
	description: string;
	minimum: number;
	maximum: number;
	step?: number;
}

export class KnowledgeHeatmapSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly controller: Plugin & SettingsController,
	) {
		super(app, controller);
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Automatic refresh",
				desc: "Recalculate an open dashboard after Markdown files or links change.",
				control: {
					type: "toggle",
					key: "autoRefresh",
					defaultValue: DEFAULT_SETTINGS.autoRefresh,
				},
			},
			this.numberDefinition(
				"eventDebounceMs",
				"Refresh delay",
				"Wait this many milliseconds after a burst of file events before refreshing.",
				100,
				5_000,
				50,
			),
			this.numberDefinition(
				"staleAfterDays",
				"Full-recency period",
				"Notes edited within this many days receive the full recency contribution.",
				1,
				3_650,
			),
			this.numberDefinition(
				"forgottenAfterDays",
				"Zero-recency age",
				"Notes this old receive no recency points. Their final category still includes links and substance.",
				2,
				7_300,
			),
			this.numberDefinition(
				"targetLinks",
				"Connection target",
				"Combined incoming and outgoing links needed for the full connection contribution.",
				1,
				1_000,
			),
			this.numberDefinition(
				"expectedWordCount",
				"Substance target",
				"Word count needed for the full substance contribution.",
				1,
				100_000,
				25,
			),
			this.numberDefinition(
				"newNoteGraceDays",
				"New-note grace period",
				"A new note can receive up to 10 temporary points while it develops. Set to 0 to disable.",
				0,
				365,
			),
			{
				name: "Excluded folders",
				desc: "One vault-relative folder path per line. Matching folders and their descendants are not analyzed.",
				control: {
					type: "textarea",
					key: "excludedPathsText",
					defaultValue: "",
					placeholder: "Templates\narchive/imported",
					rows: 5,
				},
			},
			{
				name: "Restore defaults",
				desc: "Reset scoring, refresh, and exclusion preferences.",
				action: () => {
					void this.controller.updateSettings({
						...DEFAULT_SETTINGS,
						excludedPaths: [],
					});
				},
			},
			{
				name: "Local processing",
				desc: "This plugin reads Markdown notes and Obsidian's local link metadata. It does not modify notes or send data over the network.",
			},
		];
	}

	override getControlValue(key: string): unknown {
		if (key === "excludedPathsText") {
			return this.controller.pluginSettings.excludedPaths.join("\n");
		}

		if (key in this.controller.pluginSettings) {
			return this.controller.pluginSettings[key as keyof KnowledgeHeatmapSettings];
		}

		return undefined;
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "excludedPathsText" && typeof value === "string") {
			await this.save({ excludedPaths: this.parseExcludedPaths(value) });
			return;
		}

		if (key === "autoRefresh" && typeof value === "boolean") {
			await this.save({ autoRefresh: value });
			return;
		}

		if (this.isNumericKey(key) && typeof value === "number") {
			await this.save({ [key]: value });
		}
	}

	override display(): void {
		this.renderLegacySettings();
	}

	private renderLegacySettings(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Automatic refresh")
			.setDesc("Recalculate an open dashboard after Markdown files or links change.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.controller.pluginSettings.autoRefresh)
					.onChange(async (value) => {
						await this.save({ autoRefresh: value });
					}),
			);

		this.addNumberSetting({
			key: "eventDebounceMs",
			name: "Refresh delay",
			description:
				"Wait this many milliseconds after a burst of file events before refreshing.",
			minimum: 100,
			maximum: 5_000,
			step: 50,
		});
		this.addNumberSetting({
			key: "staleAfterDays",
			name: "Full-recency period",
			description:
				"Notes edited within this many days receive the full recency contribution.",
			minimum: 1,
			maximum: 3_650,
		});
		this.addNumberSetting({
			key: "forgottenAfterDays",
			name: "Zero-recency age",
			description:
				"Notes this old receive no recency points. Their final category still includes links and substance.",
			minimum: 2,
			maximum: 7_300,
		});
		this.addNumberSetting({
			key: "targetLinks",
			name: "Connection target",
			description:
				"Combined incoming and outgoing links needed for the full connection contribution.",
			minimum: 1,
			maximum: 1_000,
		});
		this.addNumberSetting({
			key: "expectedWordCount",
			name: "Substance target",
			description: "Word count needed for the full substance contribution.",
			minimum: 1,
			maximum: 100_000,
			step: 25,
		});
		this.addNumberSetting({
			key: "newNoteGraceDays",
			name: "New-note grace period",
			description:
				"A new note can receive up to 10 temporary points while it develops. Set to 0 to disable.",
			minimum: 0,
			maximum: 365,
		});

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc(
				"One vault-relative folder path per line. Matching folders and their descendants are not analyzed.",
			)
			.addTextArea((textArea) => {
				textArea.inputEl.addClass("kh-settings-textarea");
				textArea.inputEl.setAttr("aria-label", "Excluded folders");
				textArea
					.setPlaceholder("Templates\narchive/imported")
					.setValue(this.controller.pluginSettings.excludedPaths.join("\n"))
					.onChange(async (value) => {
						await this.save({ excludedPaths: this.parseExcludedPaths(value) });
					});
			});

		new Setting(containerEl)
			.setName("Restore defaults")
			.setDesc("Reset scoring, refresh, and exclusion preferences.")
			.addButton((button) =>
				button.setButtonText("Restore").onClick(async () => {
					await this.controller.updateSettings({
						...DEFAULT_SETTINGS,
						excludedPaths: [],
					});
					this.renderLegacySettings();
				}),
			);

		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "This plugin reads Markdown notes and Obsidian's local link metadata. It does not modify notes or send data over the network.",
		});
	}

	private addNumberSetting(options: NumberSettingOptions): void {
		new Setting(this.containerEl)
			.setName(options.name)
			.setDesc(options.description)
			.addText((text) => {
				text.inputEl.type = "number";
				text.inputEl.min = String(options.minimum);
				text.inputEl.max = String(options.maximum);
				text.inputEl.step = String(options.step ?? 1);
				text.inputEl.setAttr("aria-label", options.name);
				text.setValue(String(this.controller.pluginSettings[options.key])).onChange(
					async (value) => {
						const parsed = Number(value);
						if (!Number.isFinite(parsed)) {
							return;
						}

						await this.save({ [options.key]: parsed });
					},
				);
			});
	}

	private async save(patch: Partial<KnowledgeHeatmapSettings>): Promise<void> {
		await this.controller.updateSettings({
			...this.controller.pluginSettings,
			...patch,
		});
	}

	private parseExcludedPaths(value: string): string[] {
		return [
			...new Set(
				value
					.split(/[\n,]/u)
					.map(normalizePathInput)
					.filter((path) => path.length > 0)
					.map((path) => normalizePath(path)),
			),
		];
	}

	private isNumericKey(key: string): key is NumericSettingKey {
		return [
			"staleAfterDays",
			"forgottenAfterDays",
			"expectedWordCount",
			"targetLinks",
			"newNoteGraceDays",
			"eventDebounceMs",
		].includes(key);
	}

	private numberDefinition(
		key: NumericSettingKey,
		name: string,
		desc: string,
		min: number,
		max: number,
		step = 1,
	): SettingDefinitionItem {
		return {
			name,
			desc,
			control: {
				type: "number",
				key,
				defaultValue: DEFAULT_SETTINGS[key],
				min,
				max,
				step,
			},
		};
	}
}
