import { Plugin } from "obsidian";
import { calculateScore } from "./scoring";
import { HeatmapModal } from "./view";
import { defaultSettings } from "./settings";

export default class KnowledgeHeatmap extends Plugin {
    settings: any;

    async onload() {
        this.settings = defaultSettings;
        console.log("Knowledge Heatmap loaded");
        this.addCommand_()({
            id: "open-heatmap",
            label: "Open Knowledge Heatmap",
            callback: () => {
                new HeatmapModal(this.app).open();
            }
        });
    }

    async unloaded() {
        console.log("Knowledge Heatmap unloaded");
    }
}

// Helper to avoid naming conflict with 'addCommand' if any
function addCommand_(plugin: Plugin, options: any) {
    return plugin.addCommand(options);
}
