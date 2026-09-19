/**
 * Web 1 "WHEN": three time-aligned panels (WEB.md §10-15) -
 * event composition, one-sided share, and one-sided civilian fatalities.
 */
import {
  area as d3Area,
  axisBottom,
  axisLeft,
  brushX,
  extent,
  line as d3Line,
  max,
  pointer,
  scaleLinear,
  scaleUtc,
  select,
} from "d3";
import type { D3BrushEvent } from "d3";
import type { AppState } from "../../app/state";
import type { AppStore } from "../../app/store";
import { getWeeklyForActor } from "../../data/selectors";
import type { AppData, WeeklyMetric } from "../../data/types";
import { createTooltip } from "../../ui/Tooltip";
import type { Tooltip } from "../../ui/Tooltip";
import { violenceColors } from "../../utils/colors";
import { formatCount, formatPercent, formatWeekLabel } from "../../utils/format";
import { renderTimelineTooltip } from "./TimelineTooltip";
import { buildEventLayers, clampZoomDomain, nearestRow } from "./timelineMath";
import type { DisplayMode, TimelineAnnotation } from "./timelineMath";
import "./timeline.css";

type EventPoint = { date: Date; y0: number; y1: number };

const MARGIN = { top: 12, right: 16, bottom: 28, left: 52 };
/** Space reserved at the top of each panel for its inline "PANEL NAME · unit" label. */
const LABEL_HEIGHT = 18;
const EVENTS_HEIGHT = 180;
const SHARE_HEIGHT = 48;
const FATALITIES_HEIGHT = 88;
const PANEL_GAP = 24;
const BRUSH_HEIGHT = 24;
const SHARE_TOP = LABEL_HEIGHT + EVENTS_HEIGHT + PANEL_GAP;
const FATALITIES_TOP = SHARE_TOP + LABEL_HEIGHT + SHARE_HEIGHT + PANEL_GAP;
/** Height of the three time-aligned chart panels, excluding the zoom brush track below them. */
const CHART_HEIGHT = FATALITIES_TOP + LABEL_HEIGHT + FATALITIES_HEIGHT;
const BRUSH_TOP = CHART_HEIGHT + PANEL_GAP;
const PLOT_HEIGHT = BRUSH_TOP + BRUSH_HEIGHT;
const SURFACE = "#ffffff";

const EVENT_SERIES: ReadonlyArray<{ key: keyof WeeklyMetric; label: string; color: string }> = [
  { key: "state_based_event_count", label: "State-based", color: violenceColors.stateBased },
  { key: "non_state_event_count", label: "Non-state", color: violenceColors.nonState },
  { key: "one_sided_event_count", label: "One-sided", color: violenceColors.oneSided },
];

const TABLE_COLUMNS: ReadonlyArray<{ label: string; value: (row: WeeklyMetric) => string }> = [
  { label: "Week", value: (row) => formatWeekLabel(row.week_start) },
  { label: "State-based events", value: (row) => formatCount(row.state_based_event_count) },
  { label: "Non-state events", value: (row) => formatCount(row.non_state_event_count) },
  { label: "One-sided events", value: (row) => formatCount(row.one_sided_event_count) },
  { label: "One-sided share", value: (row) => formatPercent(row.one_sided_event_share, 1) },
  { label: "One-sided civilian fatalities", value: (row) => formatCount(row.one_sided_civilian_fatalities) },
];

const EVENT_SERIES_KEYS = EVENT_SERIES.map((series) => series.key);

let clipIdCounter = 0;

export class Timeline {
  private readonly data: AppData;
  private readonly store: AppStore;
  private readonly root: HTMLDivElement;
  private readonly chartHost: HTMLDivElement;
  private readonly emptyState: HTMLParagraphElement;
  private readonly svg: SVGSVGElement;
  private readonly plot: SVGGElement;
  private readonly clipRect: SVGRectElement;
  private readonly panelEvents: SVGGElement;
  private readonly panelShare: SVGGElement;
  private readonly panelFatalities: SVGGElement;
  private readonly panelDividerShare: SVGLineElement;
  private readonly panelDividerFatalities: SVGLineElement;
  private readonly labelEventsUnit: SVGTSpanElement;
  private readonly annotationsGroup: SVGGElement;
  private readonly panelBrush: SVGGElement;
  private readonly axisX: SVGGElement;
  private readonly hoverLine: SVGLineElement;
  private readonly focusLine: SVGLineElement;
  private readonly focusFlag: SVGPolygonElement;
  private readonly focusLabel: HTMLParagraphElement;
  private readonly overlay: SVGRectElement;
  private readonly tooltip: Tooltip;
  private readonly absoluteButton: HTMLButtonElement;
  private readonly compositionButton: HTMLButtonElement;
  private readonly resetZoomButton: HTMLButtonElement;
  private readonly tableBody: HTMLTableSectionElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly brush = brushX<unknown>().on("end", (event: D3BrushEvent<unknown>) => this.onBrushEnd(event));

  private mode: DisplayMode = "absolute";
  private lastState: AppState = { selectedActorId: "__ALL__", focusWeek: null };
  private rows: WeeklyMetric[] = [];
  /** Optional caller-supplied week markers (req. §7); empty until setAnnotations() is used. */
  private annotations: TimelineAnnotation[];
  /** Drag-to-zoom window (WEB.md §13, local-only - never written to the shared store). */
  private zoomDomain: [Date, Date] | null = null;
  private xScale = scaleUtc().domain([new Date(), new Date()]).range([0, 1]);
  private xScaleContext = scaleUtc().domain([new Date(), new Date()]).range([0, 1]);

  constructor(container: HTMLElement, data: AppData, store: AppStore, annotations: TimelineAnnotation[] = []) {
    this.data = data;
    this.store = store;
    this.annotations = annotations;

    this.root = document.createElement("div");
    this.root.className = "timeline";

    const controls = document.createElement("div");
    controls.className = "timeline-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Display");
    this.absoluteButton = document.createElement("button");
    this.absoluteButton.type = "button";
    this.absoluteButton.textContent = "Absolute events";
    this.compositionButton = document.createElement("button");
    this.compositionButton.type = "button";
    this.compositionButton.textContent = "Composition %";
    this.absoluteButton.addEventListener("click", () => this.setMode("absolute"));
    this.compositionButton.addEventListener("click", () => this.setMode("composition"));
    this.resetZoomButton = document.createElement("button");
    this.resetZoomButton.type = "button";
    this.resetZoomButton.textContent = "Reset zoom";
    this.resetZoomButton.hidden = true;
    this.resetZoomButton.addEventListener("click", () => {
      this.zoomDomain = null;
      this.render(this.lastState);
    });
    controls.append(this.absoluteButton, this.compositionButton, this.resetZoomButton);

    this.focusLabel = document.createElement("p");
    this.focusLabel.className = "timeline-focus-label";
    this.focusLabel.hidden = true;

    this.chartHost = document.createElement("div");
    this.chartHost.className = "timeline-chart";

    const svgNs = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(svgNs, "svg");
    this.svg.setAttribute("class", "timeline-svg");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "Weekly violence timeline");
    this.plot = document.createElementNS(svgNs, "g");
    this.plot.setAttribute("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const clipId = `timeline-clip-${clipIdCounter++}`;
    const defs = document.createElementNS(svgNs, "defs");
    const clipPath = document.createElementNS(svgNs, "clipPath");
    clipPath.setAttribute("id", clipId);
    this.clipRect = document.createElementNS(svgNs, "rect") as SVGRectElement;
    this.clipRect.setAttribute("x", "0");
    this.clipRect.setAttribute("y", "0");
    clipPath.append(this.clipRect);
    defs.append(clipPath);

    this.panelEvents = document.createElementNS(svgNs, "g");
    this.panelEvents.setAttribute("class", "panel panel-events");
    this.panelEvents.setAttribute("clip-path", `url(#${clipId})`);
    this.panelShare = document.createElementNS(svgNs, "g");
    this.panelShare.setAttribute("class", "panel panel-share");
    this.panelShare.setAttribute("transform", `translate(0,${SHARE_TOP})`);
    this.panelShare.setAttribute("clip-path", `url(#${clipId})`);
    this.panelFatalities = document.createElementNS(svgNs, "g");
    this.panelFatalities.setAttribute("class", "panel panel-fatalities");
    this.panelFatalities.setAttribute("transform", `translate(0,${FATALITIES_TOP})`);
    this.panelFatalities.setAttribute("clip-path", `url(#${clipId})`);

    // Inline "PANEL NAME · unit" labels (req. §1-2) - visually secondary to the section
    // heading in index.html, but enough on their own to read each panel without hovering.
    this.labelEventsUnit = this.appendPanelLabel(this.panelEvents, "WEEKLY EVENTS");
    this.appendPanelLabel(this.panelShare, "ONE-SIDED EVENT SHARE", "% of that week's events");
    this.appendPanelLabel(this.panelFatalities, "ONE-SIDED CIVILIAN FATALITIES", "people killed");

    // Restrained divider rules (req. §3) separating the panels while keeping them one chart -
    // the events panel is first and needs none above it.
    this.panelDividerShare = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.panelDividerShare.setAttribute("class", "panel-divider");
    this.panelDividerShare.setAttribute("x1", "0");
    this.panelDividerShare.setAttribute("y1", "0");
    this.panelDividerShare.setAttribute("y2", "0");
    this.panelShare.append(this.panelDividerShare);
    this.panelDividerFatalities = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.panelDividerFatalities.setAttribute("class", "panel-divider");
    this.panelDividerFatalities.setAttribute("x1", "0");
    this.panelDividerFatalities.setAttribute("y1", "0");
    this.panelDividerFatalities.setAttribute("y2", "0");
    this.panelFatalities.append(this.panelDividerFatalities);

    // Optional annotation markers (req. §7); empty and invisible until setAnnotations() is used.
    this.annotationsGroup = document.createElementNS(svgNs, "g");
    this.annotationsGroup.setAttribute("class", "annotations");
    this.panelEvents.append(this.annotationsGroup);

    this.panelBrush = document.createElementNS(svgNs, "g");
    this.panelBrush.setAttribute("class", "panel panel-brush");
    this.panelBrush.setAttribute("transform", `translate(0,${BRUSH_TOP})`);
    this.panelBrush.setAttribute("aria-hidden", "true");
    const brushTrack = document.createElementNS(svgNs, "rect") as SVGRectElement;
    brushTrack.setAttribute("class", "brush-track");
    brushTrack.setAttribute("x", "0");
    brushTrack.setAttribute("y", "0");
    brushTrack.setAttribute("height", String(BRUSH_HEIGHT));
    brushTrack.setAttribute("width", "100%");
    brushTrack.setAttribute("pointer-events", "none");
    this.panelBrush.append(brushTrack);
    this.axisX = document.createElementNS(svgNs, "g");
    this.axisX.setAttribute("class", "axis axis-x");
    this.axisX.setAttribute("transform", `translate(0,${CHART_HEIGHT})`);
    this.hoverLine = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.hoverLine.setAttribute("class", "hover-line");
    this.hoverLine.setAttribute("y1", "0");
    this.hoverLine.setAttribute("y2", String(CHART_HEIGHT));
    this.hoverLine.style.display = "none";
    this.focusLine = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.focusLine.setAttribute("class", "focus-line");
    this.focusLine.setAttribute("y1", "0");
    this.focusLine.setAttribute("y2", String(CHART_HEIGHT));
    this.focusLine.style.display = "none";
    // Small flag atop the persistent focus line (req. §5) - visually distinct from the
    // temporary dashed hover crosshair, so a mouseout-preserved selection reads unambiguously.
    this.focusFlag = document.createElementNS(svgNs, "polygon") as SVGPolygonElement;
    this.focusFlag.setAttribute("class", "focus-flag");
    this.focusFlag.style.display = "none";
    this.overlay = document.createElementNS(svgNs, "rect") as SVGRectElement;
    this.overlay.setAttribute("class", "overlay");
    this.overlay.setAttribute("y", "0");
    this.overlay.setAttribute("height", String(CHART_HEIGHT));
    this.overlay.setAttribute("tabindex", "0");
    this.overlay.setAttribute("role", "img");
    this.overlay.setAttribute(
      "aria-label",
      "Weekly chart. Move with arrow keys, press Enter to focus the week across every view. Drag the strip below to zoom.",
    );
    this.plot.append(
      defs,
      this.panelEvents,
      this.panelShare,
      this.panelFatalities,
      this.panelBrush,
      this.axisX,
      this.hoverLine,
      this.focusLine,
      this.focusFlag,
      this.overlay,
    );
    this.svg.append(this.plot);
    this.chartHost.append(this.svg);
    this.tooltip = createTooltip(this.chartHost);

    this.overlay.addEventListener("pointermove", this.onPointerMove);
    this.overlay.addEventListener("pointerleave", this.onPointerLeave);
    this.overlay.addEventListener("click", this.onClick);
    this.overlay.addEventListener("keydown", this.onKeydown);

    this.emptyState = document.createElement("p");
    this.emptyState.className = "timeline-empty";
    this.emptyState.hidden = true;

    const details = document.createElement("details");
    details.className = "timeline-table";
    const summary = document.createElement("summary");
    summary.textContent = "View as table";
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const column of TABLE_COLUMNS) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = column.label;
      headRow.append(th);
    }
    thead.append(headRow);
    this.tableBody = document.createElement("tbody");
    table.append(thead, this.tableBody);
    details.append(summary, table);

    this.root.append(controls, this.focusLabel, this.chartHost, this.emptyState, details);
    container.append(this.root);

    this.resizeObserver = new ResizeObserver(() => this.render(this.lastState));
    this.resizeObserver.observe(this.chartHost);
  }

  update(state: Readonly<AppState>): void {
    this.render(state);
  }

  /** Replace the optional week markers (req. §7) and re-render; pass [] to clear them. */
  setAnnotations(annotations: TimelineAnnotation[]): void {
    this.annotations = annotations;
    this.render(this.lastState);
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.overlay.removeEventListener("pointermove", this.onPointerMove);
    this.overlay.removeEventListener("pointerleave", this.onPointerLeave);
    this.overlay.removeEventListener("click", this.onClick);
    this.overlay.removeEventListener("keydown", this.onKeydown);
    this.tooltip.destroy();
    this.root.remove();
  }

  /** Build one "MAIN LABEL · unit" panel title; returns the unit tspan for later dynamic updates. */
  private appendPanelLabel(group: SVGGElement, mainText: string, unitText = ""): SVGTSpanElement {
    const svgNs = "http://www.w3.org/2000/svg";
    const text = document.createElementNS(svgNs, "text");
    text.setAttribute("class", "panel-title");
    text.setAttribute("x", "0");
    text.setAttribute("y", String(LABEL_HEIGHT - 6));
    const main = document.createElementNS(svgNs, "tspan");
    main.setAttribute("class", "panel-title-main");
    main.textContent = mainText;
    const unit = document.createElementNS(svgNs, "tspan") as SVGTSpanElement;
    unit.setAttribute("class", "panel-title-unit");
    unit.textContent = unitText ? ` · ${unitText}` : "";
    text.append(main, unit);
    group.append(text);
    return unit;
  }

  private setMode(mode: DisplayMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.absoluteButton.setAttribute("aria-pressed", String(mode === "absolute"));
    this.compositionButton.setAttribute("aria-pressed", String(mode === "composition"));
    this.render(this.lastState);
  }

  private render(state: AppState): void {
    this.lastState = state;
    this.rows = getWeeklyForActor(this.data, state.selectedActorId);
    this.absoluteButton.setAttribute("aria-pressed", String(this.mode === "absolute"));
    this.compositionButton.setAttribute("aria-pressed", String(this.mode === "composition"));

    const width = Math.max(240, this.chartHost.clientWidth);
    const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
    const totalHeight = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom;
    this.svg.setAttribute("width", String(width));
    this.svg.setAttribute("height", String(totalHeight));
    this.svg.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);
    this.overlay.setAttribute("width", String(plotWidth));
    this.clipRect.setAttribute("width", String(plotWidth));
    this.clipRect.setAttribute("height", String(PLOT_HEIGHT));

    const [start, end] = extent(this.rows, (row) => row.week_start);
    const fullDomain: [Date, Date] = start && end ? [start, end] : [new Date(), new Date()];
    this.xScaleContext = scaleUtc().domain(fullDomain).range([0, plotWidth]);
    this.zoomDomain = this.zoomDomain && start && end ? clampZoomDomain(this.zoomDomain, fullDomain) : null;
    this.xScale = scaleUtc().domain(this.zoomDomain ?? fullDomain).range([0, plotWidth]);
    this.resetZoomButton.hidden = this.zoomDomain === null;

    this.brush.extent([[0, 0], [plotWidth, BRUSH_HEIGHT]]);
    select(this.panelBrush).call(this.brush);

    this.panelDividerShare.setAttribute("x2", String(plotWidth));
    this.panelDividerFatalities.setAttribute("x2", String(plotWidth));

    this.renderEventsPanel();
    this.renderSharePanel();
    this.renderFatalitiesPanel();
    this.renderAnnotations();
    select(this.axisX).call(axisBottom(this.xScale).ticks(Math.max(2, Math.floor(plotWidth / 90))) as never);
    this.renderFocusLine();
    this.hideHover();
    this.renderTable();

    this.emptyState.hidden = this.rows.length > 0;
    this.emptyState.textContent = "No weekly data for this actor.";
    this.chartHost.hidden = this.rows.length === 0;
  }

  private renderEventsPanel(): void {
    this.labelEventsUnit.textContent = this.mode === "composition"
      ? " · % of that week's events"
      : " · count";

    const layers = buildEventLayers(this.rows, this.mode, EVENT_SERIES_KEYS);
    const yMax = this.mode === "composition" ? 1 : Math.max(1, max(this.rows, (row) =>
      row.state_based_event_count + row.non_state_event_count + row.one_sided_event_count) ?? 1);
    const yScale = scaleLinear().domain([0, yMax]).range([LABEL_HEIGHT + EVENTS_HEIGHT, LABEL_HEIGHT]);
    const areaGen = d3Area<EventPoint>()
      .x((d) => this.xScale(d.date))
      .y0((d) => yScale(d.y0))
      .y1((d) => yScale(d.y1));
    const lineGen = d3Line<EventPoint>()
      .x((d) => this.xScale(d.date))
      .y((d) => yScale(d.y1));

    select(this.panelEvents)
      .selectAll<SVGGElement, { label: string; color: string; points: EventPoint[] }>("g.series")
      .data(
        EVENT_SERIES.map((series, index) => ({ label: series.label, color: series.color, points: layers[index] })),
        (d) => d.label,
      )
      .join((enter) => {
        const g = enter.append("g").attr("class", "series");
        g.append("path").attr("class", "area").attr("stroke", "none");
        g.append("path").attr("class", "line").attr("fill", "none").attr("stroke-width", 2);
        return g;
      })
      .each(function paint(d) {
        select(this).select("path.area").attr("d", areaGen(d.points)).attr("fill", d.color).attr("fill-opacity", 0.1);
        select(this).select("path.line").attr("d", lineGen(d.points)).attr("stroke", d.color);
      });

    const axis = axisLeft(yScale)
      .ticks(4)
      .tickFormat((value) => (this.mode === "composition" ? formatPercent(value as number) : formatCount(value as number)));
    select(this.panelEvents).selectAll("g.axis-y").data([null]).join("g").attr("class", "axis axis-y").call(axis as never);
  }

  private renderSharePanel(): void {
    const yScale = scaleLinear().domain([0, 1]).range([LABEL_HEIGHT + SHARE_HEIGHT, LABEL_HEIGHT]);
    const points = this.rows.map((row) => ({ date: row.week_start, value: row.one_sided_event_share }));
    const areaGen = d3Area<{ date: Date; value: number }>()
      .x((d) => this.xScale(d.date))
      .y0(yScale(0))
      .y1((d) => yScale(d.value));
    const lineGen = d3Line<{ date: Date; value: number }>()
      .x((d) => this.xScale(d.date))
      .y((d) => yScale(d.value));

    select(this.panelShare).selectAll("path.area").data([points]).join("path").attr("class", "area")
      .attr("d", areaGen).attr("fill", violenceColors.oneSided).attr("fill-opacity", 0.1).attr("stroke", "none");
    select(this.panelShare).selectAll("path.line").data([points]).join("path").attr("class", "line")
      .attr("d", lineGen).attr("fill", "none").attr("stroke", violenceColors.oneSided).attr("stroke-width", 2);

    const axis = axisLeft(yScale).tickValues([0, 1]).tickFormat((value) => formatPercent(value as number));
    select(this.panelShare).selectAll("g.axis-y").data([null]).join("g").attr("class", "axis axis-y").call(axis as never);
  }

  private renderFatalitiesPanel(): void {
    const baselineY = LABEL_HEIGHT + FATALITIES_HEIGHT;
    const yMax = Math.max(1, max(this.rows, (row) => row.one_sided_civilian_fatalities) ?? 1);
    const yScale = scaleLinear().domain([0, yMax]).range([baselineY, LABEL_HEIGHT]);
    const points = this.rows.filter((row) => row.one_sided_civilian_fatalities > 0);

    const stems = select(this.panelFatalities)
      .selectAll<SVGLineElement, WeeklyMetric>("line.stem")
      .data(points, (row) => row.week_start.toISOString());
    stems.exit().remove();
    stems
      .enter()
      .append("line")
      .attr("class", "stem")
      .attr("stroke", violenceColors.oneSided)
      // Slightly heavier than the panels above (req. §6) - a non-zero week must register
      // without hovering, but the fatality panel is deliberately the thinnest of the three
      // so it never outweighs the main event chart.
      .attr("stroke-width", 2.5)
      .merge(stems as never)
      .attr("x1", (row) => this.xScale(row.week_start))
      .attr("x2", (row) => this.xScale(row.week_start))
      .attr("y1", baselineY)
      .attr("y2", (row) => yScale(row.one_sided_civilian_fatalities));

    const dots = select(this.panelFatalities)
      .selectAll<SVGCircleElement, WeeklyMetric>("circle.dot")
      .data(points, (row) => row.week_start.toISOString());
    dots.exit().remove();
    dots
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("r", 5)
      .attr("fill", violenceColors.oneSided)
      .attr("stroke", SURFACE)
      .attr("stroke-width", 2)
      .merge(dots as never)
      .attr("cx", (row) => this.xScale(row.week_start))
      .attr("cy", (row) => yScale(row.one_sided_civilian_fatalities));

    const axis = axisLeft(yScale).ticks(3).tickFormat((value) => formatCount(value as number));
    select(this.panelFatalities).selectAll("g.axis-y").data([null]).join("g").attr("class", "axis axis-y").call(axis as never);
  }

  /** Optional caller-supplied week markers (req. §7); a no-op until setAnnotations() is used. */
  private renderAnnotations(): void {
    const markerY = LABEL_HEIGHT;
    select(this.annotationsGroup)
      .selectAll<SVGGElement, TimelineAnnotation>("g.annotation")
      .data(this.annotations, (annotation) => annotation.week.toISOString())
      .join((enter) => {
        const g = enter.append("g").attr("class", "annotation");
        g.append("line").attr("class", "annotation-line").attr("y1", markerY).attr("y2", EVENTS_HEIGHT + LABEL_HEIGHT);
        g.append("circle").attr("class", "annotation-dot").attr("r", 3).attr("cy", markerY);
        g.append("text").attr("class", "annotation-label").attr("y", markerY - 6);
        g.append("title");
        return g;
      })
      .each((annotation, index, nodes) => {
        const x = this.xScale(annotation.week);
        const node = select(nodes[index]);
        node.select("line.annotation-line").attr("x1", x).attr("x2", x);
        node.select("circle.annotation-dot").attr("cx", x);
        // Right-align near the right edge so the label never runs off the plot.
        const nearRightEdge = x > this.xScale.range()[1] - 140;
        node
          .select("text.annotation-label")
          .attr("x", nearRightEdge ? x + 4 : x)
          .attr("text-anchor", nearRightEdge ? "end" : "middle")
          .text(annotation.label);
        node.select("title").text(`${formatWeekLabel(annotation.week)} - ${annotation.label}`);
      });
  }

  private renderFocusLine(): void {
    const focusWeek = this.lastState.focusWeek;
    const row = focusWeek === null ? null : nearestRow(this.rows, focusWeek);
    if (!row) {
      this.focusLine.style.display = "none";
      this.focusFlag.style.display = "none";
      this.focusLabel.hidden = true;
      return;
    }
    const x = this.xScale(row.week_start);
    this.focusLine.setAttribute("x1", String(x));
    this.focusLine.setAttribute("x2", String(x));
    this.focusLine.style.display = "";
    // A small flag above the line, plus a text line outside the SVG entirely - together making
    // the persisted (post-mouseout) selection unambiguous without relying on the tooltip.
    this.focusFlag.setAttribute("points", `${x - 4},-6 ${x + 4},-6 ${x},1`);
    this.focusFlag.style.display = "";
    this.focusLabel.hidden = false;
    this.focusLabel.textContent = `Focused week: ${formatWeekLabel(row.week_start)}`;
  }

  private renderTable(): void {
    this.tableBody.replaceChildren(
      ...this.rows.map((row) => {
        const tr = document.createElement("tr");
        for (const column of TABLE_COLUMNS) {
          const td = document.createElement("td");
          td.textContent = column.value(row);
          tr.append(td);
        }
        return tr;
      }),
    );
  }

  private focusRowAt(row: WeeklyMetric, hostX: number, hostY: number): void {
    const x = this.xScale(row.week_start);
    this.hoverLine.setAttribute("x1", String(x));
    this.hoverLine.setAttribute("x2", String(x));
    this.hoverLine.style.display = "";
    this.tooltip.show(renderTimelineTooltip(row), hostX, hostY);
  }

  private hideHover(): void {
    this.hoverLine.style.display = "none";
    this.tooltip.hide();
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.rows.length === 0) return;
    const [hostX, hostY] = pointer(event, this.chartHost);
    const target = this.xScale.invert(hostX - MARGIN.left);
    const row = nearestRow(this.rows, target);
    if (row) this.focusRowAt(row, hostX, hostY);
  };

  private readonly onPointerLeave = (): void => {
    this.hideHover();
  };

  private readonly onClick = (event: PointerEvent): void => {
    if (this.rows.length === 0) return;
    const [hostX] = pointer(event, this.chartHost);
    const target = this.xScale.invert(hostX - MARGIN.left);
    const row = nearestRow(this.rows, target);
    if (row) this.store.setState({ focusWeek: row.week_start });
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (this.rows.length === 0) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const current = this.lastState.focusWeek === null
      ? this.rows[0]
      : nearestRow(this.rows, this.lastState.focusWeek) ?? this.rows[0];
    const currentIndex = this.rows.indexOf(current);
    if (event.key === "Enter" || event.key === " ") {
      this.store.setState({ focusWeek: current.week_start });
      return;
    }
    const nextIndex = event.key === "ArrowLeft"
      ? Math.max(0, currentIndex - 1)
      : Math.min(this.rows.length - 1, currentIndex + 1);
    const row = this.rows[nextIndex];
    const x = this.xScale(row.week_start);
    this.focusRowAt(row, x + MARGIN.left, MARGIN.top);
  };

  /** Drag a selection on the brush track to zoom the three chart panels to that date range. */
  private onBrushEnd(event: D3BrushEvent<unknown>): void {
    if (!event.sourceEvent) return; // ignore the programmatic clear below
    const selection = event.selection as [number, number] | null;
    if (!selection || selection[1] - selection[0] < 4) {
      select(this.panelBrush).call(this.brush.move, null);
      return;
    }
    const [start, end] = extent(this.rows, (row) => row.week_start);
    if (!start || !end) return;
    const candidate: [Date, Date] = [this.xScaleContext.invert(selection[0]), this.xScaleContext.invert(selection[1])];
    this.zoomDomain = clampZoomDomain(candidate, [start, end]);
    select(this.panelBrush).call(this.brush.move, null);
    this.render(this.lastState);
  }
}
