import type { AppState } from "../../app/state";
import { aggregateH3Overview, getH3ForActorAndWeek } from "../../data/selectors";
import type { AppData } from "../../data/types";
import { DataPreview } from "../../ui/DataPreview";

/** First-milestone map preview; geographic rendering belongs in this module. */
export class ConflictMap extends DataPreview {
  constructor(container: HTMLElement, data: AppData) {
    super(container, data, data.h3Metrics.length);
  }

  update(state: Readonly<AppState>): void {
    const overview = state.focusWeek === null;
    const cells = overview
      ? aggregateH3Overview(this.data, state.selectedActorId)
      : getH3ForActorAndWeek(this.data, state.selectedActorId, state.focusWeek);
    const period = overview ? "Overview" : `Week of ${state.focusWeek!.toISOString().slice(0, 10)}`;
    this.scope.textContent = `${this.actorName(state.selectedActorId)} · ${period} · ${cells.length.toLocaleString("en")} H3 cells.`;
  }
}
