import { App, Component, Modal, TFile } from "obsidian";
import type {
	AnalysisSnapshot,
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
const MAX_FOLDER_ROWS = 20;
const TOOLTIP_GAP = 8;
const TOOLTIP_MARGIN = 8;

type StatusFilter = "all" | HealthStatus;
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
		private readonly onClosed: () => void,
	) {
		super(app);
	}

	override onOpen(): void {
		this.closed = false;
		this.modalEl.addClass("knowledge-heatmap-modal");
		this.titleEl.setText("Note health dashboard");
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
		this.contentEl.createEl("p", {
			cls: "kh-intro",
			text: "A local, read-only view of recency (60 points), connections (25), and substance (15). Scores of 70+ are healthy, 40–69 are stale, and below 40 are forgotten.",
		});
		this.renderSummary(scope, snapshot);

		if (snapshot.summary.total === 0) {
			this.renderEmptyState(snapshot);
			return;
		}

		this.renderToolbar(scope, snapshot);
		this.renderMapControls(scope, snapshot);
		this.renderNotes(snapshot);
		this.renderRunMetadata(snapshot);
	}

	private renderSummary(scope: Component, snapshot: AnalysisSnapshot): void {
		const summary = this.contentEl.createDiv({ cls: "kh-summary" });
		this.createSummaryCard(scope, summary, "Average score", String(snapshot.summary.averageScore), "all", snapshot);
		this.createSummaryCard(scope, summary, "Healthy", snapshot.summary.healthy.toLocaleString(), "healthy", snapshot);
		this.createSummaryCard(scope, summary, "Stale", snapshot.summary.stale.toLocaleString(), "stale", snapshot);
		this.createSummaryCard(scope,
			summary,
			"Forgotten",
			snapshot.summary.forgotten.toLocaleString(),
			"forgotten",
			snapshot,
		);
		this.createSummaryCard(scope, summary, "Included", snapshot.summary.total.toLocaleString(), "all", snapshot);
	}

	private createSummaryCard(scope: Component, parent: HTMLElement, label: string, value: string, filter: StatusFilter, snapshot: AnalysisSnapshot): void {
		const card = parent.createEl("button", {
			cls: `kh-summary-card${this.statusFilter === filter ? " is-active" : ""}`,
		});
		card.type = "button";
		card.setAttr("aria-label", `Show ${label.toLocaleLowerCase()} notes`);
		card.createSpan({ cls: "kh-summary-value", text: value });
		card.createSpan({ text: label });
		card.createSpan({ cls: "kh-summary-action", text: filter === "all" ? "View all" : "Filter notes" });
		scope.registerDomEvent(card, "click", () => {
			this.statusFilter = filter;
			this.folderFilter = undefined;
			this.visibleLimit = PAGE_SIZE;
			this.renderSnapshot(snapshot);
		});
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
		const toolbar = this.contentEl.createDiv({ cls: "kh-toolbar" });
		const searchLabel = toolbar.createEl("label");
		searchLabel.createSpan({ text: "Find note" });
		const searchInput = searchLabel.createEl("input", { type: "search" });
		searchInput.value = this.searchQuery;
		searchInput.placeholder = "Name, folder, or path";
		searchInput.setAttr("aria-label", "Find note by name, folder, or path");

		const statusLabelEl = toolbar.createEl("label");
		statusLabelEl.createSpan({ text: "Category" });
		const statusSelect = statusLabelEl.createEl("select");
		for (const [value, label] of [
			["all", "All categories"],
			["healthy", "Healthy"],
			["stale", "Stale"],
			["forgotten", "Forgotten"],
		] as const) {
			statusSelect.createEl("option", { value, text: label });
		}
		statusSelect.value = this.statusFilter;
		statusSelect.setAttr("aria-label", "Filter by health category");

		const refreshButton = toolbar.createEl("button", { text: "Refresh" });
		refreshButton.type = "button";
		refreshButton.addClass("mod-cta");
		refreshButton.setAttr("aria-label", "Recalculate all note health scores");

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
		scope.registerDomEvent(refreshButton, "click", () => void this.refresh(true));
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
		const header = this.contentEl.createDiv({ cls: "kh-map-header" });
		const title = header.createDiv();
		title.createEl("h3", { cls: "kh-section-title", text: "Knowledge map" });
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
		section.createEl("h3", {
			cls: "kh-section-title",
			text: `Notes (${notes.length.toLocaleString()})`,
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
		const map = section.createDiv({ cls: "kh-map" });
		for (const folder of orderedFolders) {
			const group = map.createDiv({ cls: "kh-map-group" });
			const heading = group.createEl("button", { cls: "kh-map-group-heading" });
			heading.type = "button";
			heading.createSpan({ cls: "kh-folder-name", text: folder.path });
			heading.createSpan({ text: `${folder.averageScore}% · ${formatCount(folder.noteCount, "note")}` });
			scope.registerDomEvent(heading, "click", () => {
				this.folderFilter = this.folderFilter === folder.path ? undefined : folder.path;
				this.visibleLimit = PAGE_SIZE;
				this.renderNotes(snapshot);
			});
			const cells = group.createDiv({ cls: "kh-map-cells", attr: { role: "list" } });
			for (const note of groups.get(folder.path) ?? []) this.renderMapCell(scope, cells, note);
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
		const cell = parent.createEl("button", { cls: `kh-cell kh-level-${level}` });
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
		const cellValue = cell.createSpan({ cls: "kh-cell-value", text: String(value) });
		cellValue.setAttr("aria-hidden", "true");
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
			void this.openNote(note.metrics.path);
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
		const heading = item.createDiv({ cls: "kh-note-heading" });
		const openButton = heading.createEl("button", { cls: "kh-open-note" });
		openButton.type = "button";
		openButton.createSpan({ cls: "kh-note-name", text: note.metrics.name });
		openButton.createEl("br");
		openButton.createSpan({ cls: "kh-note-path", text: note.metrics.path });
		openButton.setAttr("aria-label", `Open ${note.metrics.path}`);
		heading.createSpan({
			cls: "kh-score",
			text: `${note.result.score} · ${statusLabel(note.result.status)}`,
		});
		scope.registerDomEvent(openButton, "click", () => void this.openNote(note.metrics.path));

		item.createEl("p", { text: note.result.reason });
		item.createEl("p", {
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
			const matchesStatus =
				this.statusFilter === "all" || note.result.status === this.statusFilter;
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
