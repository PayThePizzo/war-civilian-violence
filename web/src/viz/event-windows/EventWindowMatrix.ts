import type { AppState } from "../../app/state";
import { getEpisodesForActor } from "../../data/selectors";
import type { AppData } from "../../data/types";
import { DataPreview } from "../../ui/DataPreview";

/** First-milestone episode preview; matrix rendering belongs in this module. */
export class EventWindowMatrix extends DataPreview {
  constructor(container: HTMLElement, data: AppData) {
    super(container, data, data.eventWindows.length);
  }

  update(state: Readonly<AppState>): void {
    const rows = getEpisodesForActor(this.data, state.selectedActorId);
    const episodes = new Set(rows.map((row) => row.episode_id)).size;
    this.scope.textContent = episodes === 0
      ? "No episodes for this selection."
      : `${this.actorName(state.selectedActorId)} · ${episodes} episodes · ${rows.length.toLocaleString("en")} window rows.`;
  }
}
