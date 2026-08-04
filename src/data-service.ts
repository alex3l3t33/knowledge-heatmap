import { NoteMetrics } from "./scoring";

export async function fetchNoteData(): Promise<NoteMetrics[]> {
    // In a real Obsidian plugin, this would use the Obsidian API
    // to fetch all files and their metadata.
    // For now, we keep it as a placeholder that returns mock data 
    // to allow development of the UI.
    return [
        { id: "1", name: "Note A", lastModified: Date.now() - 864000000, contentLength: 500, backlinks: 5, outlinks: 2 },
        { id: "2", name: "Note B", lastModified: Date.now() - 1577846400, contentLength: 2000, backlinks: 1, outlinks: 1 },
        { id: "3", name: "Note C", lastModified: Date.now() - 86400000, contentLength: 100, backlinks: 0, outlinks: 0 }
    ];
}
