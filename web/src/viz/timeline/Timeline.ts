/**
 * Web 1 "WHEN": three time-aligned panels (WEB.md §10-15) -
 * event composition, one-sided share, and one-sided civilian fatalities.
 */
import {
  area as d3Area,
  axisBottom,
  axisLeft,
  bisector,
  extent,
  line as d3Line,
  max,
  pointer,
  scaleLinear,
  scaleUtc,
  select,
} from "d3";
import type { AppState } from "../../app/state";
import type { AppStore } from "../../app/store";
import { getWeeklyForActor } from "../../data/selectors";
import type { AppData, WeeklyMetric } from "../../data/types";
import { createTooltip } from "../../ui/Tooltip";
import type { Tooltip } from "../../ui/Tooltip";
import { violenceColors } from "../../utils/colors";
import { formatCount, formatPercent, formatWeekLabel } from "../../utils/format";
import { renderTimelineTooltip } from "./TimelineTooltip";
import "./timeline.css";

type DisplayMode = "absolute" | "composition";
type EventPoint = { date: Date; y0: number; y1: number };

const MARGIN = { top: 12, right: 16, bottom: 28, left: 52 };
const EVENTS_HEIGHT = 180;
const SHARE_HEIGHT = 48;
const FATALITIES_HEIGHT = 88;
const PANEL_GAP = 28;
const SHARE_TOP = EVENTS_HEIGHT + PANEL_GAP;
const FATALITIES_TOP = SHARE_TOP + SHARE_HEIGHT + PANEL_GAP;
const PLOT_HEIGHT = FATALITIES_TOP + FATALITIES_HEIGHT;
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

const bisectWeek = bisector((row: WeeklyMetric) => row.week_start).left;

/** Find the row whose week_start is closest to `target`; rows must be date-sorted. */
function nearestRow(rows: WeeklyMetric[], target: Date): WeeklyMetric | null {
  if (rows.length === 0) return null;
  const index = bisectWeek(rows, target, 1);
  const before = rows[index - 1];
  const after = rows[index];
  if (!after) return before;
  if (!before) return after;
  const targetMs = target.getTime();
  return targetMs - before.week_start.getTime() <= after.week_start.getTime() - targetMs ? before : after;
}

/** Cumulative layer per series; composition mode expresses each week as a fraction of that week's total. */
function buildEventLayers(rows: WeeklyMetric[], mode: DisplayMode): EventPoint[][] {
  const layers: EventPoint[][] = EVENT_SERIES.map(() => []);
  for (const row of rows) {
    const values = EVENT_SERIES.map((series) => row[series.key] as number);
    const total = values.reduce((sum, value) => sum + value, 0);
    let cumulative = 0;
    values.forEach((value, index) => {
      const scaled = mode === "composition" ? (total === 0 ? 0 : value / total) : value;
      const y0 = cumulative;
      const y1 = cumulative + scaled;
      layers[index].push({ date: row.week_start, y0, y1 });
      cumulative = y1;
    });
  }
  return layers;
}

export class Timeline {
  private readonly data: AppData;
  private readonly store: AppStore;
  private readonly root: HTMLDivElement;
  private readonly chartHost: HTMLDivElement;
  private readonly emptyState: HTMLParagraphElement;
  private readonly svg: SVGSVGElement;
  private readonly plot: SVGGElement;
  private readonly panelEvents: SVGGElement;
  private readonly panelShare: SVGGElement;
  private readonly panelFatalities: SVGGElement;
  private readonly axisX: SVGGElement;
  private readonly hoverLine: SVGLineElement;
  private readonly focusLine: SVGLineElement;
  private readonly overlay: SVGRectElement;
  private readonly tooltip: Tooltip;
  private readonly absoluteButton: HTMLButtonElement;
  private readonly compositionButton: HTMLButtonElement;
  private readonly tableBody: HTMLTableSectionElement;
  private readonly resizeObserver: ResizeObserver;

  private mode: DisplayMode = "absolute";
  private lastState: AppState = { selectedActorId: "__ALL__", focusWeek: null };
  private rows: WeeklyMetric[] = [];
  private xScale = scaleUtc().domain([new Date(), new Date()]).range([0, 1]);

  constructor(container: HTMLElement, data: AppData, store: AppStore) {
    this.data = data;
    this.store = store;

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
    controls.append(this.absoluteButton, this.compositionButton);

    this.chartHost = document.createElement("div");
    this.chartHost.className = "timeline-chart";

    const svgNs = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(svgNs, "svg");
    this.svg.setAttribute("class", "timeline-svg");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "Weekly violence timeline");
    this.plot = document.createElementNS(svgNs, "g");
    this.plot.setAttribute("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    this.panelEvents = document.createElementNS(svgNs, "g");
    this.panelEvents.setAttribute("class", "panel panel-events");
    this.panelShare = document.createElementNS(svgNs, "g");
    this.panelShare.setAttribute("class", "panel panel-share");
    this.panelShare.setAttribute("transform", `translate(0,${SHARE_TOP})`);
    this.panelFatalities = document.createElementNS(svgNs, "g");
    this.panelFatalities.setAttribute("class", "panel panel-fatalities");
    this.panelFatalities.setAttribute("transform", `translate(0,${FATALITIES_TOP})`);
    this.axisX = document.createElementNS(svgNs, "g");
    this.axisX.setAttribute("class", "axis axis-x");
    this.axisX.setAttribute("transform", `translate(0,${PLOT_HEIGHT})`);
    this.hoverLine = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.hoverLine.setAttribute("class", "hover-line");
    this.hoverLine.setAttribute("y1", "0");
    this.hoverLine.setAttribute("y2", String(PLOT_HEIGHT));
    this.hoverLine.style.display = "none";
    this.focusLine = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.focusLine.setAttribute("class", "focus-line");
    this.focusLine.setAttribute("y1", "0");
    this.focusLine.setAttribute("y2", String(PLOT_HEIGHT));
    this.focusLine.style.display = "none";
    this.overlay = document.createElementNS(svgNs, "rect") as SVGRectElement;
    this.overlay.setAttribute("class", "overlay");
    this.overlay.setAttribute("y", "0");
    this.overlay.setAttribute("height", String(PLOT_HEIGHT));
    this.overlay.setAttribute("tabindex", "0");
    this.overlay.setAttribute("role", "img");
    this.overlay.setAttribute(
      "aria-label",
      "Weekly chart. Move with arrow keys, press Enter to focus the week across every view.",
    );
    this.plot.append(
      this.panelEvents,
      this.panelShare,
      this.panelFatalities,
      this.axisX,
      this.hoverLine,
      this.focusLine,
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

    this.root.append(controls, this.chartHost, this.emptyState, details);
    container.append(this.root);

    this.resizeObserver = new ResizeObserver(() => this.render(this.lastState));
    this.resizeObserver.observe(this.chartHost);
  }

  update(state: Readonly<AppState>): void {
    this.render(state);
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

    const [start, end] = extent(this.rows, (row) => row.week_start);
    this.xScale = scaleUtc()
      .domain(start && end ? [start, end] : [new Date(), new Date()])
      .range([0, plotWidth]);

    this.renderEventsPanel();
    this.renderSharePanel();
    this.renderFatalitiesPanel();
    select(this.axisX).call(axisBottom(this.xScale).ticks(Math.max(2, Math.floor(plotWidth / 90))) as never);
    this.renderFocusLine();
    this.hideHover();
    this.renderTable();

    this.emptyState.hidden = this.rows.length > 0;
    this.emptyState.textContent = "No weekly data for this actor.";
    this.chartHost.hidden = this.rows.length === 0;
  }

  private renderEventsPanel(): void {
    const layers = buildEventLayers(this.rows, this.mode);
    const yMax = this.mode === "composition" ? 1 : Math.max(1, max(this.rows, (row) =>
      row.state_based_event_count + row.non_state_event_count + row.one_sided_event_count) ?? 1);
    const yScale = scaleLinear().domain([0, yMax]).range([EVENTS_HEIGHT, 0]);
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
    const yScale = scaleLinear().domain([0, 1]).range([SHARE_HEIGHT, 0]);
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
    const yMax = Math.max(1, max(this.rows, (row) => row.one_sided_civilian_fatalities) ?? 1);
    const yScale = scaleLinear().domain([0, yMax]).range([FATALITIES_HEIGHT, 0]);
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
      .attr("stroke-width", 2)
      .merge(stems as never)
      .attr("x1", (row) => this.xScale(row.week_start))
      .attr("x2", (row) => this.xScale(row.week_start))
      .attr("y1", FATALITIES_HEIGHT)
      .attr("y2", (row) => yScale(row.one_sided_civilian_fatalities));

    const dots = select(this.panelFatalities)
      .selectAll<SVGCircleElement, WeeklyMetric>("circle.dot")
      .data(points, (row) => row.week_start.toISOString());
    dots.exit().remove();
    dots
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("r", 4)
      .attr("fill", violenceColors.oneSided)
      .attr("stroke", SURFACE)
      .attr("stroke-width", 2)
      .merge(dots as never)
      .attr("cx", (row) => this.xScale(row.week_start))
      .attr("cy", (row) => yScale(row.one_sided_civilian_fatalities));

    const axis = axisLeft(yScale).ticks(3).tickFormat((value) => formatCount(value as number));
    select(this.panelFatalities).selectAll("g.axis-y").data([null]).join("g").attr("class", "axis axis-y").call(axis as never);
  }

  private renderFocusLine(): void {
    const focusWeek = this.lastState.focusWeek;
    const row = focusWeek === null ? null : nearestRow(this.rows, focusWeek);
    if (!row) {
      this.focusLine.style.display = "none";
      return;
    }
    const x = this.xScale(row.week_start);
    this.focusLine.setAttribute("x1", String(x));
    this.focusLine.setAttribute("x2", String(x));
    this.focusLine.style.display = "";
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
}
