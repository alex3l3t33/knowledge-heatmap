import { AppVars } from "obsidian";

export interface Settings {
    refreshInterval: number;
    autoRefresh: boolean;
}

export const defaultSettings: Settings = {
    refreshInterval: 3600,
    autoRefresh: true
};
