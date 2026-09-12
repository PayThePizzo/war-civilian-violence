import type { AppState } from "../../app/state";
import { getActorProfiles } from "../../data/selectors";
import type { AppData } from "../../data/types";
import { DataPreview } from "../../ui/DataPreview";

/** First-milestone actor preview; parallel coordinates belong in this module. */
export class ActorParallelCoordinates extends DataPreview {
  constructor(container: HTMLElement, data: AppData) {
    super(container, data, data.actorProfiles.length);
  }

  update(state: Readonly<AppState>): void {
    const profiles = getActorProfiles(this.data);
    this.scope.textContent = `${profiles.length.toLocaleString("en")} actors eligible for default display. Selected: ${this.actorName(state.selectedActorId)}.`;
  }
}
