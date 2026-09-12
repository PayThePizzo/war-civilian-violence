import type { AppState } from "../app/state";
import type { AppStore } from "../app/store";
import type { ActorProfile } from "../data/types";

/** Create the global actor control; its update method follows the shared store. */
export function createActorSelector(container: HTMLElement, profiles: ActorProfile[], store: AppStore) {
  const controls = document.createElement("div");
  controls.className = "actor-controls";
  const label = document.createElement("label");
  const caption = document.createElement("span");
  caption.textContent = "Actor:";
  const select = document.createElement("select");
  select.name = "actor";
  select.add(new Option("All actors", "__ALL__"));
  const actors = profiles.filter((actor) => actor.actor_id !== "__ALL__")
    .sort((left, right) => left.actor_name.localeCompare(right.actor_name, "en")
      || left.actor_id.localeCompare(right.actor_id, "en"));
  for (const actor of actors) select.add(new Option(actor.actor_name, actor.actor_id));
  label.append(caption, select);
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  controls.append(label, reset);
  container.append(controls);

  const onChange = () => store.setState({ selectedActorId: select.value });
  const onReset = () => store.reset();
  select.addEventListener("change", onChange);
  reset.addEventListener("click", onReset);

  return {
    update(state: Readonly<AppState>): void {
      select.value = state.selectedActorId;
      reset.disabled = state.selectedActorId === "__ALL__" && state.focusWeek === null;
    },
    destroy(): void {
      select.removeEventListener("change", onChange);
      reset.removeEventListener("click", onReset);
      controls.remove();
    },
  };
}
