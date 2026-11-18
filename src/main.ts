import { Plugin, TAbstractFile, TFile } from "obsidian";
import { sanitizeSettings } from "./core/settings";
import { createHistoryPoint, sanitizeHistory, updateHistory } from "./core/history";
import type { AnalysisSnapshot, HealthHistoryPoint, KnowledgeHeatmapSettings } from "./core/types";
import { KnowledgeDataService } from "./plugin/data-service";
import { KnowledgeHeatmapModal } from "./plugin/dashboard-modal";
import {
	KnowledgeHeatmapSettingTab,
	type SettingsController,
} from "./plugin/settings-tab";

function isMarkdownFile(file: TAbstractFile): file is TFile {
	return file instanceof TFile && file.extension.toLocaleLowerCase() === "md";
}

export default class KnowledgeHeatmapPlugin
	extends Plugin
	implements SettingsController
{
	pluginSettings!: KnowledgeHeatmapSettings;

	private dataService: KnowledgeDataService | undefined;
	private healthHistory: HealthHistoryPoint[] = [];
	private readonly dashboards = new Set<KnowledgeHeatmapModal>();
	private refreshTimer: number | undefined;
	private unloading = false;

	override async onload(): Promise<void> {
		const storedData: unknown = await this.loadData();
		this.pluginSettings = sanitizeSettings(storedData);
		this.healthHistory = sanitizeHistory(
			typeof storedData === "object" && storedData !== null
				? (storedData as Record<string, unknown>)["healthHistory"]
				: undefined,
		);
		this.dataService = new KnowledgeDataService(this.app);

		this.addRibbonIcon("activity", "Open knowledge health dashboard", () => {
			this.openDashboard();
		});
		this.addCommand({
			id: "open-dashboard",
			name: "Open dashboard",
			callback: () => this.openDashboard(),
		});
		this.addSettingTab(new KnowledgeHeatmapSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			if (!this.unloading) {
				this.registerVaultEvents();
			}
		});
	}

	override onunload(): void {
		this.unloading = true;
		if (this.refreshTimer !== undefined) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = undefined;
		}
		for (const dashboard of [...this.dashboards]) {
			dashboard.close();
		}
		this.dashboards.clear();
		this.dataService?.dispose();
		this.dataService = undefined;
	}

	async updateSettings(settings: KnowledgeHeatmapSettings): Promise<void> {
		this.pluginSettings = sanitizeSettings(settings);
		await this.persistData();
		this.dataService?.invalidateSettings();
		this.scheduleDashboardRefresh(true);
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (isMarkdownFile(file)) {
					this.dataService?.invalidateFile(file.path);
					this.scheduleDashboardRefresh(this.pluginSettings.autoRefresh);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (isMarkdownFile(file)) {
					this.dataService?.invalidateFile(file.path);
					this.scheduleDashboardRefresh(this.pluginSettings.autoRefresh);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (isMarkdownFile(file)) {
					this.dataService?.deleteFile(file.path);
					this.scheduleDashboardRefresh(this.pluginSettings.autoRefresh);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (isMarkdownFile(file) || oldPath.toLocaleLowerCase().endsWith(".md")) {
					this.dataService?.renameFile(oldPath, file.path);
					this.scheduleDashboardRefresh(this.pluginSettings.autoRefresh);
				}
			}),
		);
		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				this.dataService?.invalidateGraph();
				this.scheduleDashboardRefresh(this.pluginSettings.autoRefresh);
			}),
		);
	}

	private openDashboard(): void {
		if (!this.dataService) {
			return;
		}

		let dashboard: KnowledgeHeatmapModal;
		dashboard = new KnowledgeHeatmapModal(
			this.app,
			this.dataService,
			() => this.pluginSettings,
			() => this.healthHistory,
			(snapshot) => void this.recordHealthHistory(snapshot).catch(() => undefined),
			() => this.dashboards.delete(dashboard),
		);
		this.dashboards.add(dashboard);
		dashboard.open();
	}

	private async recordHealthHistory(snapshot: AnalysisSnapshot): Promise<void> {
		const nextHistory = updateHistory(this.healthHistory, createHistoryPoint(snapshot));
		if (JSON.stringify(nextHistory) === JSON.stringify(this.healthHistory)) return;
		this.healthHistory = nextHistory;
		await this.persistData();
	}

	private async persistData(): Promise<void> {
		await this.saveData({
			...this.pluginSettings,
			healthHistory: this.healthHistory,
		});
	}

	private scheduleDashboardRefresh(enabled: boolean): void {
		if (!enabled || this.dashboards.size === 0) {
			return;
		}

		if (this.refreshTimer !== undefined) {
			window.clearTimeout(this.refreshTimer);
		}
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = undefined;
			for (const dashboard of this.dashboards) {
				dashboard.requestRefresh();
			}
		}, this.pluginSettings.eventDebounceMs);
	}
}
