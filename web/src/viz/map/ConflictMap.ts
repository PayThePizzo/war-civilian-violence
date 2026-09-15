/** Web 2 "WHERE": H3 hexagon map over MapLibre + deck.gl (WEB.md §16-22). */
import { Map as MaplibreMap } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import type { FeatureCollection } from "geojson";
import type { AppState } from "../../app/state";
import { aggregateH3Overview, getH3ForActorAndWeek } from "../../data/selectors";
import type { AppData } from "../../data/types";
import { createTooltip } from "../../ui/Tooltip";
import type { Tooltip } from "../../ui/Tooltip";
import sudanBoundaryUrl from "../../assets/geo/sudan-boundary.geojson?url";
import { buildBoundaryLayer } from "./BoundaryLayer";
import { buildH3Layer } from "./H3Layer";
import type { H3Cell } from "./H3Layer";
import { MapControls } from "./MapControls";
import { renderMapTooltip } from "./MapTooltip";
import { COLOR_METRIC_LABELS, computeBounds, INTENSITY_METRIC_LABELS } from "./mapMath";
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
  private readonly contextLabel: HTMLDivElement;
  private readonly legendColorCaption: HTMLParagraphElement;
  private readonly legendIntensityCaption: HTMLParagraphElement;
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
  /** Loaded lazily; null until the fetch resolves, and stays null forever if the checked-in
   * boundary is the empty placeholder or the fetch fails - never fabricated. */
  private boundaryGeojson: FeatureCollection | null = null;

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

    this.contextLabel = document.createElement("div");
    this.contextLabel.className = "map-context-label";

    const legend = document.createElement("div");
    legend.className = "map-legend";
    const legendGradientRow = document.createElement("div");
    legendGradientRow.className = "map-legend-row";
    const legendLeft = document.createElement("span");
    legendLeft.textContent = "Combat";
    const legendBar = document.createElement("span");
    legendBar.className = "map-legend-bar";
    const legendRight = document.createElement("span");
    legendRight.textContent = "One-sided";
    legendGradientRow.append(legendLeft, legendBar, legendRight);
    this.legendColorCaption = document.createElement("p");
    this.legendColorCaption.className = "map-legend-caption";
    this.legendIntensityCaption = document.createElement("p");
    this.legendIntensityCaption.className = "map-legend-caption";
    legend.append(legendGradientRow, this.legendColorCaption, this.legendIntensityCaption);

    this.emptyState = document.createElement("p");
    this.emptyState.className = "map-empty";
    this.emptyState.hidden = true;

    this.mapShell.append(this.contextLabel, this.mapCanvas, legend, this.emptyState);
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

    void this.loadBoundary();
  }

  /**
   * Fetch the checked-in Sudan boundary once. The file currently ships as an empty
   * FeatureCollection placeholder, so this resolves to no layer until a real boundary is added -
   * ConflictMap's architecture needs no further change when that happens (see BoundaryLayer.ts).
   */
  private async loadBoundary(): Promise<void> {
    try {
      const response = await fetch(sudanBoundaryUrl);
      if (!response.ok) return;
      const geojson = (await response.json()) as FeatureCollection;
      if (geojson.features && geojson.features.length > 0) {
        this.boundaryGeojson = geojson;
        this.renderLayer();
      }
    } catch {
      // No valid boundary available yet; the map keeps working without it.
    }
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

  /** "Full analysis period" in Overview, or the active week in Week mode - the one phrase this
   * view repeats in the context label, tooltip heading and status line so scope is never ambiguous. */
  private periodLabel(short: boolean): string {
    if (this.mode === "overview") return short ? "Full period" : "Full analysis period";
    return `Week of ${formatWeekLabel(this.currentWeek as Date)}`;
  }

  private currentActorName(): string {
    return this.lastState.selectedActorId === "__ALL__"
      ? "All actors"
      : this.data.actorProfiles.find((actor) => actor.actor_id === this.lastState.selectedActorId)?.actor_name
        ?? this.lastState.selectedActorId;
  }

  private renderLayer(): void {
    if (!this.ready) return;
    const cells = this.currentCells();
    const hexLayer = buildH3Layer(cells, {
      intensityMetric: this.intensityMetric,
      colorMetric: this.colorMetric,
      extruded: this.extruded,
      onHover: ({ cell, x, y }) => {
        if (!cell) {
          this.tooltip.hide();
          return;
        }
        this.tooltip.show(renderMapTooltip(cell, this.periodLabel(true)), x, y);
      },
    });
    // Boundary drawn after (so above) the hex layer: an unfilled outline reads as geographic
    // context without ever obscuring the analytical fill or intensity encoding beneath it.
    const boundaryLayer = this.boundaryGeojson ? buildBoundaryLayer(this.boundaryGeojson) : null;
    this.overlay.setProps({ layers: boundaryLayer ? [hexLayer, boundaryLayer] : [hexLayer] });

    const actorName = this.currentActorName();
    const period = this.periodLabel(false);
    this.contextLabel.textContent = `${actorName} · ${period}`;

    this.legendColorCaption.textContent = `Colour = ${COLOR_METRIC_LABELS[this.colorMetric].toLowerCase()}`;
    this.legendIntensityCaption.textContent = this.extruded
      ? `Height = ${INTENSITY_METRIC_LABELS[this.intensityMetric].toLowerCase()} (3D)`
      : `Opacity = ${INTENSITY_METRIC_LABELS[this.intensityMetric].toLowerCase()}`;

    this.summary.textContent =
      `${actorName} · ${this.periodLabel(true)} · ${cells.length.toLocaleString("en")} active H3 cells`;
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
