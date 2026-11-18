import { App, Component, Modal, setIcon, TFile } from "obsidian";
import type {
	AnalysisSnapshot,
	HealthHistoryPoint,
	HealthStatus,
	KnowledgeHeatmapSettings,
	NoteHealth,
} from "../core/types";
import {
	AnalysisCancelledError,
	KnowledgeDataService,
} from "./data-service";
import { calculateTooltipPosition } from "./tooltip-position";

const PAGE_SIZE = 100;
const MAX_MAP_CELLS = 500;
const MAX_MAP_CELLS_PER_FOLDER = 16;
const MAX_FOLDER_ROWS = 20;
const TOOLTIP_GAP = 8;
const TOOLTIP_MARGIN = 8;

type StatusFilter = "all" | "orphan" | "thin" | HealthStatus;
type MapMode = "health" | "freshness" | "connections";
interface ActiveMapTooltip {
	anchor: HTMLButtonElement;
	tooltip: HTMLDivElement;
}

function statusLabel(status: HealthStatus): string {
	return status[0]?.toUpperCase() + status.slice(1);
}

function formatDuration(milliseconds: number): string {
	return milliseconds >= 1_000
		? `${(milliseconds / 1_000).toFixed(2)} s`
		: `${Math.round(milliseconds)} ms`;
}

function formatCount(value: number, singular: string): string {
	return `${value.toLocaleString()} ${singular}${value === 1 ? "" : "s"}`;
}

function isOrphan(note: NoteHealth): boolean {
	return note.metrics.backlinks + note.metrics.outlinks === 0;
}

function factorScore(note: NoteHealth, factorId: "recency" | "connections" | "substance"): number {
	return note.result.factors.find((factor) => factor.id === factorId)?.rawScore ?? 0;
}

function averageFactorScore(
	notes: readonly NoteHealth[],
	factorId: "recency" | "connections" | "substance",
): number {
	if (notes.length === 0) return 0;
	return Math.round(
		notes.reduce((total, note) => total + factorScore(note, factorId), 0) / notes.length,
	);
}

function appendIcon(parent: HTMLElement, icon: string, className: string): HTMLSpanElement {
	const iconEl = parent.createSpan({ cls: className });
	setIcon(iconEl, icon);
	iconEl.setAttr("aria-hidden", "true");
	return iconEl;
}

export class KnowledgeHeatmapModal extends Modal {
	private abortController: AbortController | undefined;
	private renderScope: Component | undefined;
	private notesScope: Component | undefined;
	private generation = 0;
	private searchQuery = "";
	private statusFilter: StatusFilter = "all";
	private folderFilter: string | undefined;
	private mapMode: MapMode = "health";
	private visibleLimit = PAGE_SIZE;
	private activeMapTooltip: ActiveMapTooltip | undefined;
	private tooltipSequence = 0;
	private closed = false;

	constructor(
		app: App,
		private readonly dataService: KnowledgeDataService,
		private readonly getSettings: () => KnowledgeHeatmapSettings,
		private readonly getHistory: () => readonly HealthHistoryPoint[],
		private readonly recordSnapshot: (snapshot: AnalysisSnapshot) => void,
		private readonly onClosed: () => void,
	) {
		super(app);
	}

	override onOpen(): void {
		this.closed = false;
		this.modalEl.addClass("knowledge-heatmap-modal");
		this.titleEl.setText("Knowledge heatmap");
		void this.refresh(false);
	}

	override onClose(): void {
		this.closed = true;
		this.abortController?.abort();
		this.disposeRenderScope();
		this.contentEl.empty();
		this.onClosed();
	}

	requestRefresh(): void {
		if (!this.closed) {
			void this.refresh(false);
		}
	}

	private async refresh(force: boolean): Promise<void> {
		this.generation += 1;
		const generation = this.generation;
		this.abortController?.abort();
		this.abortController = new AbortController();
		this.visibleLimit = PAGE_SIZE;
		this.renderLoading(generation);

		try {
			const snapshot = await this.dataService.analyze(this.getSettings(), {
				force,
				signal: this.abortController.signal,
				onProgress: (progress) => {
					if (generation !== this.generation || this.closed) {
						return;
					}
					const progressEl = this.contentEl.querySelector<HTMLElement>(
						"[data-kh-progress]",
					);
					progressEl?.setText(
						progress.total === 0
							? "No included Markdown notes found."
							: `Analyzed ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} notes…`,
					);
				},
			});

			if (generation !== this.generation || this.closed) {
				return;
			}

			this.recordSnapshot(snapshot);
			this.renderSnapshot(snapshot);
		} catch (error) {
			if (
				error instanceof AnalysisCancelledError ||
				generation !== this.generation ||
				this.closed
			) {
				return;
			}

			this.renderError();
		}
	}

	private renderLoading(generation: number): void {
		const scope = this.resetRenderScope();
		const loading = this.contentEl.createDiv({ cls: "kh-loading" });
		loading.createEl("p", { text: "Reviewing local note health…" });
		const progress = loading.createEl("p", {
			cls: "kh-muted",
			text: "Preparing Markdown notes…",
		});
		progress.dataset["khProgress"] = String(generation);
		const cancelButton = loading.createEl("button", { text: "Cancel" });
		cancelButton.type = "button";
		cancelButton.setAttr("aria-label", "Cancel note analysis");
		scope.registerDomEvent(cancelButton, "click", () => {
			this.abortController?.abort();
			progress.setText("Analysis cancelled.");
			cancelButton.disabled = true;
		});
	}

	private renderError(): void {
		const scope = this.resetRenderScope();
		const error = this.contentEl.createDiv({ cls: "kh-error" });
		error.createEl("p", {
			text: "The analysis could not finish reading the vault. No notes were changed.",
		});
		const retryButton = error.createEl("button", { text: "Try again" });
		retryButton.type = "button";
		scope.registerDomEvent(retryButton, "click", () => void this.refresh(true));
	}

	private renderSnapshot(snapshot: AnalysisSnapshot): void {
		const scope = this.resetRenderScope();
		this.renderHeader(scope, snapshot);
		this.renderSummary(scope, snapshot);
		this.renderHistory(snapshot);

		if (snapshot.summary.total === 0) {
			this.renderEmptyState(snapshot);
			return;
		}

		this.renderToolbar(scope, snapshot);
		this.renderPriorityQueue(scope, snapshot);
		this.renderMapControls(scope, snapshot);
		this.renderNotes(snapshot);
		this.renderRunMetadata(snapshot);
	}

	private renderHeader(scope: Component, snapshot: AnalysisSnapshot): void {
		const header = this.contentEl.createEl("header", { cls: "kh-app-header" });
		const brand = header.createDiv({ cls: "kh-brand" });
		const mark = brand.createDiv({ cls: "kh-brand-mark" });
		appendIcon(mark, "activity", "kh-brand-icon");
		const copy = brand.createDiv({ cls: "kh-brand-copy" });
		copy.createEl("p", { text: "Local note intelligence" });
		copy.createEl("h1", { text: "Knowledge heatmap" });
		const actions = header.createDiv({ cls: "kh-header-actions" });
		const privacy = actions.createSpan({ cls: "kh-local-badge" });
		appendIcon(privacy, "shield-check", "kh-inline-icon");
		privacy.createSpan({ text: "Stays in your vault" });
		const refreshButton = actions.createEl("button", {
			cls: "kh-icon-button",
			attr: { type: "button", "aria-label": "Recalculate all note health scores" },
		});
		appendIcon(refreshButton, "refresh-cw", "kh-inline-icon");
		scope.registerDomEvent(refreshButton, "click", () => void this.refresh(true));
		refreshButton.setAttr("title", `Refresh analysis · ${formatCount(snapshot.summary.total, "note")}`);
	}

	private renderSummary(scope: Component, snapshot: AnalysisSnapshot): void {
		const orphanCount = snapshot.notes.filter(isOrphan).length;
		const dimensions = [
			["Freshness", averageFactorScore(snapshot.notes, "recency")],
			["Connections", averageFactorScore(snapshot.notes, "connections")],
			["Substance", averageFactorScore(snapshot.notes, "substance")],
		] as const;
		const overview = this.contentEl.createDiv({ cls: "kh-overview-grid" });
		const hero = overview.createEl("button", {
			cls: `kh-health-card${this.statusFilter === "all" ? " is-active" : ""}`,
			attr: { type: "button", "aria-label": "Show all included notes" },
		});
		hero.style.setProperty("--kh-score-progress", `${snapshot.summary.averageScore * 3.6}deg`);
		const heroGlow = hero.createDiv({ cls: "kh-health-card-glow" });
		heroGlow.setAttr("aria-hidden", "true");
		const heroBody = hero.createDiv({ cls: "kh-health-card-body" });
		const heroCopy = heroBody.createDiv({ cls: "kh-health-card-copy" });
		heroCopy.createEl("p", { cls: "kh-eyebrow", text: "Vault health" });
		const scoreRow = heroCopy.createDiv({ cls: "kh-health-score-row" });
		scoreRow.createEl("strong", { text: String(snapshot.summary.averageScore) });
		scoreRow.createSpan({ cls: "kh-score-total", text: "/100" });
		const scoreLabel = snapshot.summary.averageScore >= 70 ? "Healthy" : snapshot.summary.averageScore >= 40 ? "Needs attention" : "At risk";
		scoreRow.createSpan({ cls: "kh-health-pill", text: scoreLabel });
		heroCopy.createEl("h2", { cls: "kh-health-title", text: "Strengthen the notes that matter" });
		heroCopy.createEl("p", {
			cls: "kh-health-description",
			text: snapshot.summary.forgotten + orphanCount > 0
				? `${formatCount(snapshot.summary.forgotten, "forgotten note")} and ${formatCount(orphanCount, "orphan")} are the best place to start.`
				: "Your vault is in good shape. Keep reviewing the lowest-scoring folders.",
		});
		const ring = heroBody.createDiv({ cls: "kh-health-ring" });
		const ringInner = ring.createDiv({ cls: "kh-health-ring-inner" });
		appendIcon(ringInner, "activity", "kh-health-ring-icon");
		ringInner.createSpan({ text: "Vault score" });
		const breakdown = hero.createDiv({ cls: "kh-health-breakdown", attr: { "aria-hidden": "true" } });
		for (const [count, tone] of [[snapshot.summary.healthy, "healthy"], [snapshot.summary.stale, "stale"], [snapshot.summary.forgotten, "forgotten"]] as const) {
			if (count > 0) {
				const segment = breakdown.createSpan({ cls: `kh-breakdown-${tone}` });
				segment.style.flexGrow = String(count);
			}
		}
		const dimensionList = hero.createDiv({ cls: "kh-health-dimensions" });
		for (const [label, value] of dimensions) {
			const dimension = dimensionList.createDiv({ cls: "kh-health-dimension" });
			const dimensionHeading = dimension.createDiv();
			dimensionHeading.createSpan({ text: label });
			dimensionHeading.createEl("strong", { text: String(value) });
			const track = dimension.createDiv({ cls: "kh-dimension-track" });
			const fill = track.createSpan();
			fill.style.width = `${value}%`;
		}
		scope.registerDomEvent(hero, "click", () => {
			this.statusFilter = "all";
			this.folderFilter = undefined;
			this.visibleLimit = PAGE_SIZE;
			this.renderSnapshot(snapshot);
		});

		const summary = overview.createDiv({ cls: "kh-summary" });
		this.createSummaryCard(scope, summary, "Healthy", snapshot.summary.healthy.toLocaleString(), "healthy", "check-circle-2", "Ready and maintained", snapshot);
		this.createSummaryCard(scope, summary, "Stale", snapshot.summary.stale.toLocaleString(), "stale", "clock-3", "Worth revisiting", snapshot);
		this.createSummaryCard(scope, summary, "Forgotten", snapshot.summary.forgotten.toLocaleString(), "forgotten", "archive", "Needs recovery", snapshot);
		this.createSummaryCard(scope, summary, "Orphans", orphanCount.toLocaleString(), "orphan", "unlink", "No links yet", snapshot);
	}

	private createSummaryCard(scope: Component, parent: HTMLElement, label: string, value: string, filter: StatusFilter, icon: string, hint: string, snapshot: AnalysisSnapshot): void {
		const card = parent.createEl("button", {
			cls: `kh-summary-card kh-summary-card--${filter}${this.statusFilter === filter ? " is-active" : ""}`,
		});
		card.type = "button";
		card.setAttr("aria-label", `Show ${label.toLocaleLowerCase()} notes`);
		const top = card.createDiv({ cls: "kh-summary-card-top" });
		appendIcon(top, icon, "kh-summary-icon");
		appendIcon(top, "arrow-up-right", "kh-summary-arrow");
		card.createSpan({ cls: "kh-summary-value", text: value });
		card.createSpan({ cls: "kh-summary-label", text: label });
		card.createSpan({ cls: "kh-summary-hint", text: hint });
		scope.registerDomEvent(card, "click", () => {
			this.statusFilter = filter;
			this.folderFilter = undefined;
			this.visibleLimit = PAGE_SIZE;
			this.renderSnapshot(snapshot);
		});
	}

	private renderHistory(snapshot: AnalysisSnapshot): void {
		const points = this.getHistory().slice(-30);
		const current = points.at(-1);
		const first = points[0];
		const delta = current && first ? current.averageScore - first.averageScore : 0;
		const card = this.contentEl.createEl("section", { cls: "kh-history-card" });
		const heading = card.createDiv({ cls: "kh-history-heading" });
		const headingCopy = heading.createDiv();
		headingCopy.createEl("p", { cls: "kh-eyebrow", text: "Health history" });
		headingCopy.createEl("h2", { text: "Vault health over time" });
		const trend = heading.createDiv({ cls: `kh-history-trend${delta < 0 ? " is-negative" : ""}` });
		trend.createEl("strong", { text: `${snapshot.summary.averageScore}/100` });
		trend.createSpan({
			text: points.length < 2 ? "History starts today" : `${delta >= 0 ? "+" : ""}${delta} points over ${points.length} days`,
		});
		const chart = card.createDiv({ cls: "kh-history-chart" });
		const svg = chart.createSvg("svg", {
			attr: {
				viewBox: "0 0 600 120",
				preserveAspectRatio: "none",
				role: "img",
				"aria-label": points.length < 2
					? `Vault health is ${snapshot.summary.averageScore} out of 100. History starts today.`
					: `Vault health changed from ${first?.averageScore ?? 0} to ${current?.averageScore ?? 0} over ${points.length} days.`,
			},
		});
		for (const score of [25, 50, 75]) {
			const y = 110 - score;
			svg.createSvg("line", { attr: { x1: "0", y1: String(y), x2: "600", y2: String(y), class: "kh-history-grid-line" } });
		}
		const coordinates = points.map((point, index) => {
			const x = points.length === 1 ? 300 : (index / (points.length - 1)) * 600;
			return `${x},${110 - point.averageScore}`;
		});
		if (coordinates.length > 1) {
			svg.createSvg("polyline", { attr: { points: coordinates.join(" "), class: "kh-history-line" } });
		}
		for (const coordinate of coordinates) {
			const [cx = "0", cy = "0"] = coordinate.split(",");
			svg.createSvg("circle", { attr: { cx, cy, r: "4", class: "kh-history-point" } });
		}
		const dates = card.createDiv({ cls: "kh-history-dates" });
		const formatDate = (date: string | undefined): string => date
			? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
			: "Today";
		dates.createSpan({ text: formatDate(first?.date) });
		dates.createSpan({ text: formatDate(current?.date) });
	}

	private renderEmptyState(snapshot: AnalysisSnapshot): void {
		const empty = this.contentEl.createDiv({ cls: "kh-empty" });
		if (snapshot.totalMarkdownFiles === 0) {
			empty.createEl("p", { text: "This vault has no Markdown notes yet." });
			empty.createEl("p", {
				cls: "kh-muted",
				text: "Create a note, then refresh this dashboard to see its health score.",
			});
			return;
		}

		empty.createEl("p", { text: "All Markdown notes are excluded." });
		empty.createEl("p", {
			cls: "kh-muted",
			text: "Change the excluded folders in plugin settings, then refresh.",
		});
	}

	private renderToolbar(scope: Component, snapshot: AnalysisSnapshot): void {
		const controls = this.contentEl.createEl("section", { cls: "kh-controls-card" });
		const heading = controls.createDiv({ cls: "kh-controls-heading" });
		const headingCopy = heading.createDiv();
		headingCopy.createEl("p", { cls: "kh-eyebrow", text: "Explore your vault" });
		headingCopy.createEl("h2", { text: "Find the notes that need attention" });
		heading.createEl("p", {
			text: "Search by title or path, then narrow the dashboard by health category.",
		});
		const toolbar = controls.createDiv({ cls: "kh-toolbar" });
		const searchLabel = toolbar.createEl("label", { cls: "kh-field kh-field--search" });
		searchLabel.createSpan({ cls: "kh-field-label", text: "Find note" });
		const searchControl = searchLabel.createDiv({ cls: "kh-input-shell" });
		appendIcon(searchControl, "search", "kh-field-icon");
		const searchInput = searchControl.createEl("input", { type: "search" });
		searchInput.value = this.searchQuery;
		searchInput.placeholder = "Name, folder, or path";
		searchInput.setAttr("aria-label", "Find note by name, folder, or path");

		const statusLabelEl = toolbar.createEl("label", { cls: "kh-field" });
		statusLabelEl.createSpan({ cls: "kh-field-label", text: "Category" });
		const selectShell = statusLabelEl.createDiv({ cls: "kh-input-shell" });
		appendIcon(selectShell, "list-filter", "kh-field-icon");
		const statusSelect = selectShell.createEl("select");
		for (const [value, label] of [
			["all", "All categories"],
			["healthy", "Healthy"],
			["stale", "Stale"],
			["forgotten", "Forgotten"],
			["orphan", "Orphan notes"],
			["thin", "Thin notes"],
		] as const) {
			statusSelect.createEl("option", { value, text: label });
		}
		statusSelect.value = this.statusFilter;
		statusSelect.setAttr("aria-label", "Filter by health category");

		scope.registerDomEvent(searchInput, "input", () => {
			this.searchQuery = searchInput.value;
			this.visibleLimit = PAGE_SIZE;
			this.renderNotes(snapshot);
		});
		scope.registerDomEvent(statusSelect, "change", () => {
			this.statusFilter = statusSelect.value as StatusFilter;
			this.folderFilter = undefined;
			this.visibleLimit = PAGE_SIZE;
			this.renderNotes(snapshot);
		});
	}

	private renderPriorityQueue(scope: Component, snapshot: AnalysisSnapshot): void {
		const orphanCount = snapshot.notes.filter(isOrphan).length;
		const thinCount = snapshot.notes.filter((note) => factorScore(note, "substance") < 50).length;
		const weakestFolder = snapshot.folders[0];
		const queue = this.contentEl.createEl("section", { cls: "kh-priority-card" });
		const heading = queue.createDiv({ cls: "kh-priority-heading" });
		const headingCopy = heading.createDiv();
		headingCopy.createEl("p", { cls: "kh-eyebrow", text: "Priority queue" });
		headingCopy.createEl("h2", { text: "Best next actions" });
		heading.createEl("p", {
			text: "Start with the fixes that can improve the most notes.",
		});
		const list = queue.createDiv({ cls: "kh-priority-list" });
		const actions: Array<{
			label: string;
			detail: string;
			icon: string;
			tone: string;
			run: () => void;
		}> = [];
		if (orphanCount > 0) {
			actions.push({
				label: `Reconnect ${formatCount(orphanCount, "orphan note")}`,
				detail: "Add useful relationships to improve connection health.",
				icon: "unlink",
				tone: "forgotten",
				run: () => {
					this.statusFilter = "orphan";
					this.folderFilter = undefined;
					this.renderSnapshot(snapshot);
				},
			});
		}
		if (weakestFolder) {
			actions.push({
				label: `Review ${weakestFolder.path}`,
				detail: `${formatCount(weakestFolder.noteCount, "note")} · ${weakestFolder.averageScore}% average health.`,
				icon: "folder-search-2",
				tone: "stale",
				run: () => {
					this.statusFilter = "all";
					this.folderFilter = weakestFolder.path;
					this.renderSnapshot(snapshot);
				},
			});
		}
		if (thinCount > 0) {
			actions.push({
				label: `Develop ${formatCount(thinCount, "thin note")}`,
				detail: "Add a concise summary, key points, or a clear next step.",
				icon: "file-text",
				tone: "accent",
				run: () => {
					this.statusFilter = "thin";
					this.folderFilter = undefined;
					this.renderSnapshot(snapshot);
				},
			});
		}
		for (const action of actions.slice(0, 3)) {
			const button = list.createEl("button", { cls: `kh-priority-action kh-priority-action--${action.tone}` });
			button.type = "button";
			appendIcon(button, action.icon, "kh-priority-icon");
			const copy = button.createSpan({ cls: "kh-priority-copy" });
			copy.createEl("strong", { text: action.label });
			copy.createSpan({ text: action.detail });
			const review = button.createSpan({ cls: "kh-priority-review", text: "Review" });
			appendIcon(review, "arrow-right", "kh-inline-icon");
			scope.registerDomEvent(button, "click", action.run);
		}
	}

	private renderLegend(): void {
		const legend = this.contentEl.createDiv({ cls: "kh-legend" });
		legend.setAttr("aria-label", `${this.mapMode} map legend`);
		const items = this.mapMode === "health"
			? [["healthy", "Healthy · 70–100"], ["stale", "Stale · 40–69"], ["forgotten", "Forgotten · 0–39"]] as const
			: this.mapMode === "freshness"
				? [["fresh", "Recently changed"], ["aging", "Aging"], ["old", "Long untouched"]] as const
				: [["connected", "Well connected"], ["some-links", "Some links"], ["orphan", "Orphan"]] as const;
		for (const [level, label] of items) {
			legend.createSpan({ cls: `kh-legend-item kh-level-${level}`, text: label });
		}
		legend.createSpan({ cls: "kh-legend-symbol", text: "⚠ Orphan" });
		legend.createSpan({ cls: "kh-legend-symbol", text: "✓ Well connected" });
	}

	private renderMapControls(scope: Component, snapshot: AnalysisSnapshot): void {
		const header = this.contentEl.createDiv({ cls: "kh-section-heading kh-map-header" });
		const title = header.createDiv();
		title.createEl("p", { cls: "kh-eyebrow", text: "Knowledge map" });
		title.createEl("h2", { cls: "kh-section-title", text: "Where attention is needed" });
		title.createSpan({ cls: "kh-muted", text: "Weakest folders appear first. Select a cell to open its note." });
		const modes = header.createDiv({ cls: "kh-segmented", attr: { role: "group", "aria-label": "Knowledge map view" } });
		for (const [mode, label] of [["health", "Health"], ["freshness", "Freshness"], ["connections", "Connections"]] as const) {
			const button = modes.createEl("button", { text: label, cls: this.mapMode === mode ? "is-active" : "" });
			button.type = "button";
			button.setAttr("aria-pressed", String(this.mapMode === mode));
			scope.registerDomEvent(button, "click", () => {
				this.mapMode = mode;
				this.renderSnapshot(snapshot);
			});
		}
		this.renderLegend();
	}

	private renderNotes(snapshot: AnalysisSnapshot): void {
		const scope = this.resetNotesScope();
		scope.registerDomEvent(this.contentEl, "scroll", () => {
			this.positionActiveMapTooltip();
		});
		const view = this.modalEl.ownerDocument.defaultView;
		if (view) {
			scope.registerDomEvent(view, "resize", () => {
				this.positionActiveMapTooltip();
			});
		}
		this.contentEl.querySelector("[data-kh-notes]")?.remove();
		const section = this.contentEl.createDiv();
		section.dataset["khNotes"] = "true";
		const notes = this.filteredNotes(snapshot.notes);
		const heading = section.createDiv({ cls: "kh-section-heading kh-notes-heading" });
		const headingCopy = heading.createDiv();
		headingCopy.createEl("p", { cls: "kh-eyebrow", text: this.folderFilter ? "Selected folder" : "Detailed review" });
		const titleRow = headingCopy.createDiv({ cls: "kh-title-row" });
		titleRow.createEl("h2", { cls: "kh-section-title", text: this.folderFilter ?? "Notes" });
		titleRow.createSpan({ cls: "kh-count-badge", text: notes.length.toLocaleString() });
		headingCopy.createEl("p", {
			cls: "kh-muted",
			text: "Open a note directly or expand its score to see each contributing signal.",
		});

		if (notes.length === 0) {
			section.createDiv({
				cls: "kh-empty",
				text: "No notes match the current search and category filter.",
			});
			return;
		}

		this.renderGroupedMap(scope, section, notes.slice(0, MAX_MAP_CELLS), snapshot);

		const list = section.createEl("ul", { cls: "kh-note-list" });
		for (const note of notes.slice(0, this.visibleLimit)) {
			this.renderNote(scope, list, note);
		}

		if (this.visibleLimit < notes.length) {
			const loadMore = section.createEl("button", {
				cls: "kh-load-more",
				text: `Show ${Math.min(PAGE_SIZE, notes.length - this.visibleLimit)} more`,
			});
			loadMore.type = "button";
			scope.registerDomEvent(loadMore, "click", () => {
				this.visibleLimit += PAGE_SIZE;
				this.renderNotes(snapshot);
			});
		}
	}

	private renderGroupedMap(scope: Component, section: HTMLElement, notes: readonly NoteHealth[], snapshot: AnalysisSnapshot): void {
		const groups = new Map<string, NoteHealth[]>();
		for (const note of notes) {
			const group = groups.get(note.metrics.folder) ?? [];
			group.push(note);
			groups.set(note.metrics.folder, group);
		}
		const orderedFolders = snapshot.folders.filter((folder) => groups.has(folder.path)).slice(0, MAX_FOLDER_ROWS);
		const map = section.createDiv({ cls: "kh-map kh-surface" });
		for (const folder of orderedFolders) {
			const group = map.createDiv({ cls: "kh-map-group" });
			const heading = group.createEl("button", { cls: "kh-map-group-heading" });
			heading.type = "button";
			heading.setAttr("aria-label", `Filter to ${folder.path}, ${folder.averageScore}% average health, ${formatCount(folder.noteCount, "note")}`);
			const folderCopy = heading.createSpan({ cls: "kh-folder-copy" });
			folderCopy.createSpan({ cls: "kh-folder-name", text: folder.path });
			folderCopy.createSpan({ cls: "kh-folder-count", text: formatCount(folder.noteCount, "note") });
			const folderHealth = heading.createSpan({ cls: "kh-folder-health" });
			const distribution = folderHealth.createSpan({ cls: "kh-folder-distribution", attr: { "aria-hidden": "true" } });
			for (const [count, tone] of [[folder.healthyCount, "healthy"], [folder.staleCount, "stale"], [folder.forgottenCount, "forgotten"]] as const) {
				if (count > 0) {
					const segment = distribution.createSpan({ cls: `kh-folder-${tone}` });
					segment.style.flexGrow = String(count);
				}
			}
			folderHealth.createSpan({ cls: "kh-folder-average", text: `${folder.averageScore}% avg` });
			scope.registerDomEvent(heading, "click", () => {
				this.folderFilter = this.folderFilter === folder.path ? undefined : folder.path;
				this.visibleLimit = PAGE_SIZE;
				this.renderNotes(snapshot);
			});
			const cells = group.createDiv({ cls: "kh-map-cells", attr: { role: "list" } });
			const folderNotes = groups.get(folder.path) ?? [];
			for (const note of folderNotes.slice(0, MAX_MAP_CELLS_PER_FOLDER)) this.renderMapCell(scope, cells, note);
			const hiddenCount = Math.max(0, folder.noteCount - Math.min(folder.noteCount, MAX_MAP_CELLS_PER_FOLDER));
			if (hiddenCount > 0) {
				const more = cells.createEl("button", {
					cls: "kh-map-more",
					text: `+${hiddenCount.toLocaleString()}`,
					attr: { type: "button", "aria-label": `Show all notes in ${folder.path}` },
				});
				scope.registerDomEvent(more, "click", () => {
					this.folderFilter = folder.path;
					this.visibleLimit = PAGE_SIZE;
					this.renderNotes(snapshot);
				});
			}
		}
	}

	private renderMapCell(scope: Component, parent: HTMLElement, note: NoteHealth): void {
		const totalLinks = note.metrics.backlinks + note.metrics.outlinks;
		const orphan = totalLinks === 0;
		const connected = note.metrics.backlinks >= 3 && note.metrics.outlinks >= 3;
		const level = this.mapMode === "health" ? note.result.status : this.mapMode === "freshness"
			? note.result.ageDays <= 30 ? "fresh" : note.result.ageDays <= 120 ? "aging" : "old"
			: orphan ? "orphan" : totalLinks >= 6 ? "connected" : "some-links";
		const value = this.mapMode === "health" ? note.result.score : this.mapMode === "freshness"
			? Math.min(999, note.result.ageDays) : totalLinks;
		const intensity = value >= 70 ? 3 : value >= 40 ? 2 : 1;
		const cell = parent.createEl("button", { cls: `kh-cell kh-level-${level} kh-intensity-${intensity}` });
		cell.type = "button";
		cell.setAttr("role", "listitem");
		this.tooltipSequence += 1;
		const tooltipId = `kh-tooltip-${this.tooltipSequence}`;
		const labelId = `kh-cell-label-${this.tooltipSequence}`;
		const accessibleLabel = cell.createSpan({
			cls: "kh-visually-hidden",
			text: `${note.metrics.path}: ${this.mapMode} ${value}`,
		});
		accessibleLabel.id = labelId;
		cell.setAttr("aria-labelledby", labelId);
		cell.setAttr("aria-describedby", tooltipId);
		if (orphan) {
			cell.createSpan({ cls: "kh-cell-state", text: "⚠" }).setAttr("aria-hidden", "true");
		} else if (connected) {
			cell.createSpan({ cls: "kh-cell-state", text: "✓" }).setAttr("aria-hidden", "true");
		}
		const tooltip = cell.ownerDocument.body.createDiv({ cls: "kh-tooltip" });
		tooltip.id = tooltipId;
		tooltip.setAttr("role", "tooltip");
		const tooltipHeader = tooltip.createDiv({ cls: "kh-tooltip-header" });
		tooltipHeader.createEl("strong", { text: note.metrics.name });
		tooltipHeader.createSpan({
			cls: `kh-tooltip-badge kh-tooltip-badge--${note.result.status}`,
			text: statusLabel(note.result.status),
		});
		tooltip.createSpan({ cls: "kh-tooltip-path", text: note.metrics.path });
		const facts = tooltip.createDiv({ cls: "kh-tooltip-facts" });
		for (const [label, valueText] of [["Health", String(note.result.score)], ["Last modified", `${note.result.ageDays} days ago`], ["Words", note.metrics.wordCount.toLocaleString()], ["Backlinks", String(note.metrics.backlinks)], ["Outgoing", String(note.metrics.outlinks)]] as const) {
			facts.createSpan({ text: label }); facts.createSpan({ text: valueText });
		}
		tooltip.createEl("strong", { text: "Main issue" });
		tooltip.createSpan({ text: note.result.reason });
		tooltip.createSpan({ cls: "kh-tooltip-action", text: "Click to open" });
		let hovered = false;
		let focused = false;
		const hideIfInactive = (): void => {
			if (!hovered && !focused) this.hideMapTooltip(tooltip);
		};
		scope.registerDomEvent(cell, "mouseenter", () => {
			hovered = true;
			this.showMapTooltip(cell, tooltip);
		});
		scope.registerDomEvent(cell, "mouseleave", () => {
			hovered = false;
			hideIfInactive();
		});
		scope.registerDomEvent(cell, "focus", () => {
			focused = true;
			this.showMapTooltip(cell, tooltip);
		});
		scope.registerDomEvent(cell, "blur", () => {
			focused = false;
			hideIfInactive();
		});
		scope.registerDomEvent(cell, "click", () => {
			this.hideMapTooltip(tooltip);
			this.showNoteDrawer(scope, note, cell);
		});
		scope.register(() => {
			this.hideMapTooltip(tooltip);
			tooltip.remove();
		});
	}

	private showMapTooltip(anchor: HTMLButtonElement, tooltip: HTMLDivElement): void {
		if (this.activeMapTooltip?.tooltip !== tooltip) {
			this.activeMapTooltip?.tooltip.removeClass("is-visible");
		}
		this.activeMapTooltip = { anchor, tooltip };
		tooltip.addClass("is-measuring");
		tooltip.addClass("is-visible");
		this.positionActiveMapTooltip();
		if (this.activeMapTooltip?.tooltip === tooltip) {
			tooltip.removeClass("is-measuring");
		}
	}

	private hideMapTooltip(tooltip: HTMLDivElement): void {
		tooltip.removeClass("is-visible");
		tooltip.removeClass("is-measuring");
		if (this.activeMapTooltip?.tooltip === tooltip) {
			this.activeMapTooltip = undefined;
		}
	}

	private positionActiveMapTooltip(): void {
		const active = this.activeMapTooltip;
		const view = this.modalEl.ownerDocument.defaultView;
		if (!active || !view) return;

		const contentRect = this.contentEl.getBoundingClientRect();
		const bounds = {
			top: Math.max(TOOLTIP_MARGIN, contentRect.top + TOOLTIP_MARGIN),
			right: Math.min(view.innerWidth - TOOLTIP_MARGIN, contentRect.right - TOOLTIP_MARGIN),
			bottom: Math.min(view.innerHeight - TOOLTIP_MARGIN, contentRect.bottom - TOOLTIP_MARGIN),
			left: Math.max(TOOLTIP_MARGIN, contentRect.left + TOOLTIP_MARGIN),
		};
		if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
			this.hideMapTooltip(active.tooltip);
			return;
		}

		const anchorRect = active.anchor.getBoundingClientRect();
		if (
			anchorRect.right < bounds.left ||
			anchorRect.left > bounds.right ||
			anchorRect.bottom < bounds.top ||
			anchorRect.top > bounds.bottom
		) {
			this.hideMapTooltip(active.tooltip);
			return;
		}

		active.tooltip.style.maxWidth = `${Math.floor(bounds.right - bounds.left)}px`;
		const tooltipRect = active.tooltip.getBoundingClientRect();
		const position = calculateTooltipPosition(
			anchorRect,
			tooltipRect,
			bounds,
			TOOLTIP_GAP,
		);
		active.tooltip.style.left = `${Math.round(position.left)}px`;
		active.tooltip.style.top = `${Math.round(position.top)}px`;
	}

	private renderNote(scope: Component, list: HTMLUListElement, note: NoteHealth): void {
		const item = list.createEl("li", {
			cls: `kh-note-card kh-note-card--${note.result.status}`,
		});
		item.style.setProperty("--kh-note-progress", `${note.result.score * 3.6}deg`);
		const main = item.createDiv({ cls: "kh-note-main" });
		const score = main.createDiv({ cls: "kh-note-score" });
		score.createEl("strong", { text: `${note.result.score}%` });
		score.createSpan({ text: "health" });
		const copy = main.createDiv({ cls: "kh-note-copy" });
		const heading = copy.createDiv({ cls: "kh-note-heading" });
		const openButton = heading.createEl("button", { cls: "kh-open-note" });
		openButton.type = "button";
		openButton.createSpan({ cls: "kh-note-name", text: note.metrics.name });
		openButton.setAttr("aria-label", `Open ${note.metrics.path}`);
		appendIcon(openButton, "arrow-up-right", "kh-open-note-icon");
		const headingActions = heading.createSpan({ cls: "kh-note-heading-actions" });
		headingActions.createSpan({ cls: "kh-note-status", text: statusLabel(note.result.status) });
		const inspectButton = headingActions.createEl("button", {
			cls: "kh-inspect-note",
			attr: { type: "button", "aria-label": `Inspect ${note.metrics.name} without leaving the dashboard` },
		});
		appendIcon(inspectButton, "panel-right-open", "kh-inline-icon");
		scope.registerDomEvent(openButton, "click", () => void this.openNote(note.metrics.path));
		scope.registerDomEvent(inspectButton, "click", () => this.showNoteDrawer(scope, note, inspectButton));
		const meta = copy.createDiv({ cls: "kh-note-meta" });
		for (const [icon, text] of [["folder", note.metrics.folder], ["calendar-clock", `${note.result.ageDays} days`], ["link-2", `${note.metrics.backlinks + note.metrics.outlinks} links`], ["file-text", `${note.metrics.wordCount.toLocaleString()} words`]] as const) {
			const metaItem = meta.createSpan();
			appendIcon(metaItem, icon, "kh-inline-icon");
			metaItem.createSpan({ text });
		}
		copy.createEl("p", { cls: "kh-note-reason", text: note.result.reason });
		copy.createEl("p", {
			cls: "kh-action",
			text: `Suggested action: ${note.result.suggestedAction}`,
		});
		if (note.readError) {
			item.createEl("p", {
				cls: "kh-error",
				text: "The note could not be read during this run, so its substance score is zero. Try refreshing.",
			});
		}

		const details = item.createEl("details");
		details.createEl("summary", { text: "Why this score" });
		const factorList = details.createEl("ul", { cls: "kh-factor-list" });
		for (const factor of note.result.factors) {
			const factorItem = factorList.createEl("li");
			factorItem.createSpan({
				text: `${factor.label}: ${factor.contribution}/${factor.maxPoints}`,
			});
			factorItem.createSpan({ text: factor.explanation });
		}
	}

	private showNoteDrawer(scope: Component, note: NoteHealth, returnFocus: HTMLElement): void {
		this.modalEl.querySelector("[data-kh-drawer-shell]")?.remove();
		const shell = this.modalEl.createDiv({ cls: "kh-drawer-shell" });
		shell.dataset["khDrawerShell"] = "true";
		const backdrop = shell.createEl("button", {
			cls: "kh-drawer-backdrop",
			attr: { type: "button", "aria-label": "Close note details" },
		});
		const drawer = shell.createEl("aside", {
			cls: `kh-note-drawer kh-note-drawer--${note.result.status}`,
			attr: { role: "dialog", "aria-modal": "false" },
		});
		const titleId = `kh-drawer-title-${this.tooltipSequence + 1}`;
		drawer.setAttr("aria-labelledby", titleId);
		const header = drawer.createDiv({ cls: "kh-drawer-header" });
		const headerCopy = header.createDiv();
		headerCopy.createEl("p", { cls: "kh-eyebrow", text: "Note health" });
		const title = headerCopy.createEl("h2", { text: note.metrics.name });
		title.id = titleId;
		const closeButton = header.createEl("button", {
			cls: "kh-drawer-close",
			attr: { type: "button", "aria-label": "Close note details" },
		});
		appendIcon(closeButton, "x", "kh-inline-icon");
		const score = drawer.createDiv({ cls: "kh-drawer-score" });
		const scoreValue = score.createDiv();
		scoreValue.createEl("strong", { text: String(note.result.score) });
		scoreValue.createSpan({ text: "/100" });
		const scoreCopy = score.createDiv();
		scoreCopy.createSpan({ cls: "kh-note-status", text: statusLabel(note.result.status) });
		scoreCopy.createEl("p", { text: note.result.reason });
		const facts = drawer.createDiv({ cls: "kh-drawer-facts" });
		for (const [label, value] of [
			["Last edited", `${note.result.ageDays} days ago`],
			["Connections", `${note.metrics.backlinks + note.metrics.outlinks} links`],
			["Substance", `${note.metrics.wordCount.toLocaleString()} words`],
			["Folder", note.metrics.folder],
		] as const) {
			const fact = facts.createDiv();
			fact.createSpan({ text: label });
			fact.createEl("strong", { text: value });
		}
		const factorSection = drawer.createDiv({ cls: "kh-drawer-factors" });
		factorSection.createEl("h3", { text: "Why this score" });
		for (const factor of note.result.factors) {
			const row = factorSection.createDiv({ cls: "kh-drawer-factor" });
			const rowHeading = row.createDiv();
			rowHeading.createSpan({ text: factor.label });
			rowHeading.createEl("strong", { text: `${factor.rawScore}/100` });
			const track = row.createDiv({ cls: "kh-drawer-factor-track" });
			const fill = track.createSpan();
			fill.style.width = `${factor.rawScore}%`;
			row.createEl("p", { text: factor.explanation });
		}
		const action = drawer.createDiv({ cls: "kh-drawer-action" });
		action.createEl("strong", { text: "Best next action" });
		action.createEl("p", { text: note.result.suggestedAction });
		const footer = drawer.createDiv({ cls: "kh-drawer-footer" });
		const openButton = footer.createEl("button", { cls: "kh-drawer-open", text: "Open note" });
		openButton.type = "button";
		appendIcon(openButton, "arrow-up-right", "kh-inline-icon");
		const close = (): void => {
			shell.remove();
			returnFocus.focus();
		};
		scope.registerDomEvent(backdrop, "click", close);
		scope.registerDomEvent(closeButton, "click", close);
		scope.registerDomEvent(openButton, "click", () => void this.openNote(note.metrics.path));
		scope.register(() => shell.remove());
		closeButton.focus();
	}

	private renderRunMetadata(snapshot: AnalysisSnapshot): void {
		const details = [
			`Analyzed ${formatCount(snapshot.summary.total, "note")} in ${formatDuration(snapshot.durationMs)}`,
			`${formatCount(snapshot.contentReads, "content read")} this run`,
			`${formatCount(snapshot.excludedCount, "excluded note")}`,
		];
		if (snapshot.readErrorCount > 0) {
			details.push(`${formatCount(snapshot.readErrorCount, "read error")}`);
		}

		this.contentEl.createEl("p", {
			cls: "kh-meta",
			text: `${details.join(" · ")} · Updated ${new Date(snapshot.analyzedAt).toLocaleString()}. Note contents remain in this vault.`,
		});
	}

	private filteredNotes(notes: readonly NoteHealth[]): NoteHealth[] {
		const query = this.searchQuery.trim().toLocaleLowerCase();
		return notes.filter((note) => {
			const matchesStatus = this.statusFilter === "all"
				|| (this.statusFilter === "orphan" ? isOrphan(note)
					: this.statusFilter === "thin" ? factorScore(note, "substance") < 50
						: note.result.status === this.statusFilter);
			const matchesQuery =
				query.length === 0 || note.metrics.path.toLocaleLowerCase().includes(query);
			const matchesFolder = !this.folderFilter || note.metrics.folder === this.folderFilter;
			return matchesStatus && matchesQuery && matchesFolder;
		});
	}

	private async openNote(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf(false).openFile(file);
		}
	}

	private resetRenderScope(): Component {
		this.disposeRenderScope();
		this.contentEl.empty();
		const scope = new Component();
		scope.load();
		this.renderScope = scope;
		return scope;
	}

	private disposeRenderScope(): void {
		this.disposeNotesScope();
		if (!this.renderScope) {
			return;
		}

		this.renderScope.unload();
		this.renderScope = undefined;
	}

	private resetNotesScope(): Component {
		this.disposeNotesScope();
		const scope = new Component();
		scope.load();
		this.notesScope = scope;
		return scope;
	}

	private disposeNotesScope(): void {
		if (this.activeMapTooltip) {
			this.hideMapTooltip(this.activeMapTooltip.tooltip);
		}
		this.notesScope?.unload();
		this.notesScope = undefined;
	}
}
