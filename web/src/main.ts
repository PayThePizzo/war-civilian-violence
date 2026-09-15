import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import { initialState } from "./app/state";
import { createStore } from "./app/store";
import { loadAppData } from "./data/loaders";
import { createActorSelector } from "./ui/ActorSelector";
import { createViolenceLegend } from "./ui/Legend";
import { Timeline } from "./viz/timeline/Timeline";
import { ConflictMap } from "./viz/map/ConflictMap";
import { ActorParallelCoordinates } from "./viz/actors/ActorParallelCoordinates";
import { EventWindowMatrix } from "./viz/event-windows/EventWindowMatrix";

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing application container: #${id}`);
  return element;
}

const cleanups: Array<() => void> = [];
let disposed = false;

function dispose(): void {
  disposed = true;
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
}

/** Load once, initialize components, and route shared state to every view. */
async function main(): Promise<void> {
  const app = requireElement("app");
  const status = requireElement("app-status");
  app.setAttribute("aria-busy", "true");
  status.hidden = false;
  status.textContent = "Loading data…";

  const data = await loadAppData();
  if (disposed) return;
  const store = createStore(initialState);
  const actorSelector = createActorSelector(requireElement("scope-bar"), data.actorProfiles, store);
  cleanups.push(() => actorSelector.destroy());
  cleanups.push(createViolenceLegend(requireElement("hero")));

  const timeline = new Timeline(requireElement("when-viz"), data, store);
  cleanups.push(() => timeline.destroy());
  const map = new ConflictMap(requireElement("where"), data);
  cleanups.push(() => map.destroy());
  const actors = new ActorParallelCoordinates(requireElement("who"), data, store);
  cleanups.push(() => actors.destroy());
  const windows = new EventWindowMatrix(requireElement("before-after"), data, store);
  cleanups.push(() => windows.destroy());

  // subscribe() immediately renders the default selection as well as changes.
  cleanups.push(store.subscribe((state) => {
    actorSelector.update(state);
    timeline.update(state);
    map.update(state);
    actors.update(state);
    windows.update(state);
  }));

  const { country, analysis_start, analysis_end } = data.metadata;
  requireElement("analysis-period").textContent = `${country} · ${analysis_start} – ${analysis_end}`;
  app.setAttribute("aria-busy", "false");
  status.hidden = true;
}

void main().catch((error: unknown) => {
  if (disposed) return;
  dispose();
  console.error("Application initialization failed:", error);
  document.getElementById("app")?.setAttribute("aria-busy", "false");
  const status = document.getElementById("app-status");
  if (status) {
    status.hidden = false;
    status.setAttribute("role", "alert");
    status.textContent = "The data could not be loaded. Reload the page to try again.";
  }
});

if (import.meta.hot) import.meta.hot.dispose(dispose);
