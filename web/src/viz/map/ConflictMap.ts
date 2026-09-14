/** Web 2 "WHERE": H3 hexagon map over MapLibre + deck.gl (WEB.md §16-22). */
import { Map as MaplibreMap } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import type { AppState } from "../../app/state";
import { aggregateH3Overview, getH3ForActorAndWeek } from "../../data/selectors";
import type { AppData } from "../../data/types";
import { createTooltip } from "../../ui/Tooltip";
import type { Tooltip } from "../../ui/Tooltip";
import { buildH3Layer } from "./H3Layer";
import type { H3Cell } from "./H3Layer";
import { MapControls } from "./MapControls";
import { renderMapTooltip } from "./MapTooltip";
import { computeBounds } from "./mapMath";
import type { ColorMetric, IntensityMetric } from "./mapMath";
import { formatWeekLabel } from "../../utils/format";
import "./map.css";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export class ConflictMap {
  private readonly data: AppData;
  private readonly root: HTMLDivElement;
  private readonly mapShell: HTMLDivElement;
  private readonly mapCanvas: HTMLDivElement;
  private readonly summary: HTMLParagraphElement;
  private readonly emptyState: HTMLParagraphElement;
  private readonly controls: MapControls;
  private readonly tooltip: Tooltip;
  private readonly map: MaplibreMap;
  private readonly overlay: MapLibreOverlay;
  private readonly resizeObserver: ResizeObserver;

  private ready = false;
  private lastState: AppState = { selectedActorId: "__ALL__", focusWeek: null };
  /** The focusWeek time last synced to MapControls; undefined until the first update(). */
  private lastSyncedFocusTime: number | null | undefined = undefined;
  private mode: "overview" | "week" = "overview";
  private currentWeek: Date | null = null;
  private intensityMetric: IntensityMetric = "event_count";
  private colorMetric: ColorMetric = "one_sided_event_share";
  private extruded = false;

  constructor(container: HTMLElement, data: AppData) {
    this.data = data;

    this.root = document.createElement("div");
    this.root.className = "conflict-map";

    this.controls = new MapControls({
      onModeChange: (mode) => {
        this.mode = mode;
        this.renderLayer();
      },
      onWeekChange: (week) => {
        this.currentWeek = week;
        this.renderLayer();
      },
      onIntensityChange: (metric) => {
        this.intensityMetric = metric;
        this.renderLayer();
      },
      onColorChange: (metric) => {
        this.colorMetric = metric;
        this.renderLayer();
      },
      onExtrudedChange: (extruded) => {
        this.extruded = extruded;
        this.renderLayer();
      },
    });

    this.mapShell = document.createElement("div");
    this.mapShell.className = "map-shell";
    this.mapCanvas = document.createElement("div");
    this.mapCanvas.className = "map-canvas";
    this.mapCanvas.setAttribute("role", "img");
    this.mapCanvas.setAttribute("aria-label", "Map of one-sided and combat violence intensity across Sudan");

    const legend = document.createElement("div");
    legend.className = "map-legend";
    legend.setAttribute("aria-hidden", "true");
    const legendLeft = document.createElement("span");
    legendLeft.textContent = "Combat";
    const legendBar = document.createElement("span");
    legendBar.className = "map-legend-bar";
    const legendRight = document.createElement("span");
    legendRight.textContent = "One-sided";
    legend.append(legendLeft, legendBar, legendRight);

    this.emptyState = document.createElement("p");
    this.emptyState.className = "map-empty";
    this.emptyState.hidden = true;

    this.mapShell.append(this.mapCanvas, legend, this.emptyState);
    this.tooltip = createTooltip(this.mapShell);

    this.summary = document.createElement("p");
    this.summary.className = "scope-summary";

    this.root.append(this.controls.root, this.mapShell, this.summary);
    container.append(this.root);

    this.map = new MaplibreMap({
      container: this.mapCanvas,
      style: OSM_STYLE,
      center: [30, 15],
      zoom: 4,
      attributionControl: {},
    });
    this.overlay = new MapLibreOverlay({ interleaved: false, layers: [] });

    this.map.on("load", () => {
      this.map.addControl(this.overlay);
      const bounds = computeBounds(this.data.h3Metrics);
      if (bounds) this.map.fitBounds(bounds, { padding: 24, duration: 0 });
      this.ready = true;
      this.update(this.lastState);
    });

    this.resizeObserver = new ResizeObserver(() => this.map.resize());
    this.resizeObserver.observe(this.mapShell);
  }

  update(state: Readonly<AppState>): void {
    this.lastState = state;
    if (!this.ready) return;

    const actorRows = this.data.h3Metrics.filter((row) => row.actor_id === state.selectedActorId);
    this.controls.setAvailableWeeks(actorRows);

    // Only re-sync the map's mode/week from the store when focusWeek itself actually changed
    // (a Web 1 click, or an episode selection). Mode and the ▶/Play stepper position are
    // local-only state (WEB.md §8) - an unrelated store update (e.g. switching actor from the
    // dropdown, or a Web3 click that only touches selectedActorId) must not clobber a user's
    // manual stepping or their manual return to Overview mode.
    const focusTime = state.focusWeek === null ? null : state.focusWeek.getTime();
    if (focusTime !== this.lastSyncedFocusTime) {
      this.lastSyncedFocusTime = focusTime;
      this.controls.syncFromStore(state.focusWeek);
    } else {
      this.renderLayer();
    }
  }

  private currentCells(): H3Cell[] {
    return this.mode === "overview"
      ? aggregateH3Overview(this.data, this.lastState.selectedActorId)
      : getH3ForActorAndWeek(this.data, this.lastState.selectedActorId, this.currentWeek);
  }

  private renderLayer(): void {
    if (!this.ready) return;
    const cells = this.currentCells();
    const layer = buildH3Layer(cells, {
      intensityMetric: this.intensityMetric,
      colorMetric: this.colorMetric,
      extruded: this.extruded,
      onHover: ({ cell, x, y }) => {
        if (!cell) {
          this.tooltip.hide();
          return;
        }
        const heading = this.mode === "overview"
          ? "Full period"
          : `Week of ${formatWeekLabel(this.currentWeek as Date)}`;
        this.tooltip.show(renderMapTooltip(cell, heading), x, y);
      },
    });
    this.overlay.setProps({ layers: [layer] });

    const actorName = this.lastState.selectedActorId === "__ALL__"
      ? "All actors"
      : this.data.actorProfiles.find((actor) => actor.actor_id === this.lastState.selectedActorId)?.actor_name
        ?? this.lastState.selectedActorId;
    const period = this.mode === "overview" ? "Overview" : `Week of ${formatWeekLabel(this.currentWeek as Date)}`;
    this.summary.textContent = `${actorName} · ${period} · ${cells.length.toLocaleString("en")} H3 cells.`;
    this.emptyState.hidden = cells.length > 0;
    this.emptyState.textContent = this.mode === "overview"
      ? "No H3 data for this actor."
      : "No H3 data for this actor in this week.";
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.controls.destroy();
    this.tooltip.destroy();
    this.map.remove();
    this.root.remove();
  }
}
