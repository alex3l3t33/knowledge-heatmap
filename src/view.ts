import { Modal } from "obsidian";
import { calculateScore } from "./src/scoring";
import { fetchNoteData } from "./src/data-service";

export class HeatmapModal extends Modal {
    async onOpen() {
        const container = this.contentEl.querySelector('#dashboard-list');
        
        // Fetch data from the service
        const notes = await fetchNoteData();
        
        const results = notes.map(n => {
            return calculateScore(n);
        });

        let html = '';
        results.forEach((res, index) => {
            html += `
                <div class="note-card">
                    <h3>${notes[index].name}</h3>
                    <p>Score: ${res.score}</p>
                    <p>Status: ${res.status}</p>
                    <p>Reason: ${res.reason}</p>
                </div>
            `;
        });

        container.innerHTML = html;
    }
}
