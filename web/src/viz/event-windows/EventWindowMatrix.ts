/** Web 4 "BEFORE & AFTER" Part B: episode x relative-week matrix (WEB.md §30-36). */
import { pointer, select } from "d3";
import type { AppState } from "../../app/state";
import type { AppStore } from "../../app/store";
import { getEpisodesForActor } from "../../data/selectors";
import type { AppData, EventWindow } from "../../data/types";
import { createTooltip } from "../../ui/Tooltip";
import type { Tooltip } from "../../ui/Tooltip";
import { violenceColors } from "../../utils/colors";
import { formatWeekLabel } from "../../utils/format";
import { renderEventWindowDetails } from "./EventWindowDetails";
import { EventWindowSummary } from "./EventWindowSummary";
import { renderEventWindowTooltip } from "./EventWindowTooltip";
import { BACKGROUND_METRIC_LABELS, circleRadius, groupEpisodes, relativeWeekRange, sequentialColor } from "./eventWindowMath";
import type { BackgroundMetric, Episode } from "./eventWindowMath";
import "./event-windows.css";

const ROW_HEIGHT = 24;
const COL_WIDTH = 28;
const HEADER_HEIGHT = 28;
const ROW_LABEL_WIDTH = 220;
const CIRCLE_MAX_RADIUS = 9;
const CIRCLE_MIN_RADIUS = 2;
const HATCH_ID = "ew-hatch";
const ROW_LABEL_CLIP_ID = "ew-row-label-clip";

const METRIC_OPTIONS = Object.entries(BACKGROUND_METRIC_LABELS) as Array<[BackgroundMetric, string]>;

export class EventWindowMatrix {
  private readonly data: AppData;
  private readonly store: AppStore;
  private readonly root: HTMLDivElement;
  private readonly summary: EventWindowSummary;
  private readonly matrixWrapper: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly t0Band: SVGRectElement;
  private readonly rowsGroup: SVGGElement;
  private readonly tooltip: Tooltip;
  private readonly emptyState: HTMLParagraphElement;
  private readonly detailsHost: HTMLDivElement;
  private readonly weeks: readonly number[];
  private readonly resizeObserver: ResizeObserver;

  private metric: BackgroundMetric = "combat_event_count";
  private lastState: AppState = { selectedActorId: "__ALL__", focusWeek: null };
  /** Currently hovered episode's data, kept alongside the render pass that last built it so the
   * details panel can show it without recomputing groupEpisodes() outside render(). */
  private hoveredEpisodeId: string | null = null;
  private currentEpisodes: Episode[] = [];

  constructor(container: HTMLElement, data: AppData, store: AppStore) {
    this.data = data;
    this.store = store;
    this.weeks = relativeWeekRange(data.metadata.event_window_before_weeks, data.metadata.event_window_after_weeks);

    this.root = document.createElement("div");
    this.root.className = "ew";

    const controls = document.createElement("div");
    controls.className = "ew-controls";
    const metricLabel = document.createElement("label");
    metricLabel.className = "ew-select";
    const metricText = document.createElement("span");
    metricText.textContent = "Background metric";
    const metricSelect = document.createElement("select");
    for (const [value, label] of METRIC_OPTIONS) metricSelect.add(new Option(label, value));
    metricSelect.addEventListener("change", () => {
      this.metric = metricSelect.value as BackgroundMetric;
      this.render();
    });
    metricLabel.append(metricText, metricSelect);
    controls.append(metricLabel);

    const summaryHost = document.createElement("div");
    this.summary = new EventWindowSummary(summaryHost);

    this.matrixWrapper = document.createElement("div");
    this.matrixWrapper.className = "ew-matrix-wrapper";

    const svgNs = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(svgNs, "svg");
    this.svg.setAttribute("class", "ew-matrix-svg");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "Episode matrix: combat activity and civilian fatalities around T0");

    const defs = document.createElementNS(svgNs, "defs");
    const pattern = document.createElementNS(svgNs, "pattern");
    pattern.setAttribute("id", HATCH_ID);
    pattern.setAttribute("width", "6");
    pattern.setAttribute("height", "6");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("patternTransform", "rotate(45)");
    const patternBg = document.createElementNS(svgNs, "rect");
    patternBg.setAttribute("width", "6");
    patternBg.setAttribute("height", "6");
    patternBg.setAttribute("fill", "#f4f3ee");
    const patternLine = document.createElementNS(svgNs, "line");
    patternLine.setAttribute("x1", "0");
    patternLine.setAttribute("y1", "0");
    patternLine.setAttribute("x2", "0");
    patternLine.setAttribute("y2", "6");
    patternLine.setAttribute("stroke", "#c9c7bb");
    patternLine.setAttribute("stroke-width", "2");
    pattern.append(patternBg, patternLine);
    defs.append(pattern);

    const labelClip = document.createElementNS(svgNs, "clipPath");
    labelClip.setAttribute("id", ROW_LABEL_CLIP_ID);
    const labelClipRect = document.createElementNS(svgNs, "rect");
    labelClipRect.setAttribute("x", "0");
    labelClipRect.setAttribute("y", "0");
    labelClipRect.setAttribute("width", String(ROW_LABEL_WIDTH - 10));
    labelClipRect.setAttribute("height", String(ROW_HEIGHT));
    labelClip.append(labelClipRect);
    defs.append(labelClip);

    // A T0 band behind every row, in addition to the dashed header line, so the reference
    // column reads as a strong column (not just a thin line) even when scrolled or scanned quickly.
    this.t0Band = document.createElementNS(svgNs, "rect");
    this.t0Band.setAttribute("class", "ew-t0-band");

    this.rowsGroup = document.createElementNS(svgNs, "g");
    this.rowsGroup.setAttribute("class", "ew-rows");
    this.svg.append(defs, this.t0Band, this.rowsGroup);
    this.matrixWrapper.append(this.svg);
    this.tooltip = createTooltip(this.matrixWrapper);

    const legend = document.createElement("div");
    legend.className = "ew-legend";
    legend.innerHTML = `
      <span class="ew-legend-item"><span class="ew-legend-swatch ew-legend-zero"></span>0 (observed)</span>
      <span class="ew-legend-item"><span class="ew-legend-swatch ew-legend-hatch"></span>Not observed</span>
      <span class="ew-legend-item"><span class="ew-legend-circle"></span>One-sided civilian fatalities</span>
    `;

    this.emptyState = document.createElement("p");
    this.emptyState.className = "ew-empty";
    this.emptyState.hidden = true;

    const left = document.createElement("div");
    left.className = "ew-left";
    left.append(controls, summaryHost, this.matrixWrapper, legend, this.emptyState);

    const right = document.createElement("div");
    right.className = "ew-right";
    this.detailsHost = document.createElement("div");
    right.append(this.detailsHost);

    const layout = document.createElement("div");
    layout.className = "ew-layout";
    layout.append(left, right);

    this.root.append(layout);
    container.append(this.root);

    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.root);
  }

  update(state: Readonly<AppState>): void {
    this.lastState = state;
    this.render();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.tooltip.destroy();
    this.root.remove();
  }

  private render(): void {
    const rows = getEpisodesForActor(this.data, this.lastState.selectedActorId);
    const episodes = groupEpisodes(rows);
    this.currentEpisodes = episodes;

    this.summary.render(episodes, this.metric, this.weeks);

    this.emptyState.hidden = episodes.length > 0;
    this.emptyState.textContent = "No episodes for this selection.";
    this.matrixWrapper.hidden = episodes.length === 0;
    if (episodes.length === 0) {
      select(this.rowsGroup).selectAll("*").remove();
      this.renderDetails();
      return;
    }

    const width = ROW_LABEL_WIDTH + this.weeks.length * COL_WIDTH;
    const height = HEADER_HEIGHT + episodes.length * ROW_HEIGHT;
    this.svg.setAttribute("width", String(width));
    this.svg.setAttribute("height", String(height));
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const t0X = ROW_LABEL_WIDTH + (0 - this.weeks[0]) * COL_WIDTH;
    this.t0Band.setAttribute("x", String(t0X));
    this.t0Band.setAttribute("y", String(HEADER_HEIGHT));
    this.t0Band.setAttribute("width", String(COL_WIDTH));
    this.t0Band.setAttribute("height", String(episodes.length * ROW_HEIGHT));

    let maxMetric = 0;
    let maxFatalities = 0;
    for (const episode of episodes) {
      for (const cell of episode.rows) {
        if (cell[this.metric] !== null) maxMetric = Math.max(maxMetric, cell[this.metric] as number);
        if (cell.one_sided_civilian_fatalities !== null) maxFatalities = Math.max(maxFatalities, cell.one_sided_civilian_fatalities);
      }
    }

    this.renderHeader();
    this.renderRows(episodes, maxMetric, maxFatalities);
    this.renderDetails();
  }

  private renderHeader(): void {
    select(this.svg).selectAll("g.ew-header").data([null]).join((enter) => {
      const header = enter.append("g").attr("class", "ew-header");
      header.append("line").attr("class", "ew-t0-col").attr("y1", 0).attr("y2", "100%");
      return header;
    }).each((_, index, nodes) => {
      const header = select(nodes[index]);
      header.selectAll<SVGTextElement, number>("text.ew-col-label")
        .data(this.weeks)
        .join("text")
        .attr("class", "ew-col-label")
        .attr("x", (w) => ROW_LABEL_WIDTH + (w - this.weeks[0]) * COL_WIDTH + COL_WIDTH / 2)
        .attr("y", HEADER_HEIGHT - 8)
        .attr("text-anchor", "middle")
        .classed("ew-col-label-t0", (w) => w === 0)
        .text((w) => (w === 0 ? "T0" : `${w > 0 ? "+" : ""}${w}`));
      const t0X = ROW_LABEL_WIDTH + (0 - this.weeks[0]) * COL_WIDTH;
      header.select("line.ew-t0-col").attr("x1", t0X).attr("x2", t0X);
    });
  }

  private renderRows(episodes: Episode[], maxMetric: number, maxFatalities: number): void {
    const selectedActorId = this.lastState.selectedActorId;
    const focusTime = this.lastState.focusWeek?.getTime() ?? null;

    const rowSelection = select(this.rowsGroup)
      .selectAll<SVGGElement, Episode>("g.ew-episode")
      .data(episodes, (episode) => episode.episodeId)
      .join((enter) => {
        const g = enter.append("g").attr("class", "ew-episode");
        g.append("rect").attr("class", "ew-row-stripe");
        g.append("rect").attr("class", "ew-row-hit");
        g.append("text").attr("class", "ew-row-label");
        g.append("g").attr("class", "ew-cells");
        return g;
      });

    rowSelection.each((episode, index, nodes) => {
      const node = select(nodes[index]);
      const y = HEADER_HEIGHT + index * ROW_HEIGHT;
      const isActive = episode.actorId === selectedActorId && episode.t0Date.getTime() === focusTime;
      node.classed("ew-episode-active", isActive);
      node.attr("transform", `translate(0,${y})`);

      const rowWidth = ROW_LABEL_WIDTH + this.weeks.length * COL_WIDTH;
      node.select("rect.ew-row-stripe")
        .attr("x", 0).attr("y", 0)
        .attr("width", rowWidth).attr("height", ROW_HEIGHT)
        .classed("ew-row-stripe-alt", index % 2 === 1);
      node.select("rect.ew-row-hit")
        .attr("x", 0).attr("y", 0)
        .attr("width", rowWidth).attr("height", ROW_HEIGHT)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("pointerenter", () => this.onHoverEpisode(episode))
        .on("pointerleave", () => this.onHoverEnd())
        .on("click", () => this.selectEpisode(episode));

      node.select("text.ew-row-label")
        .attr("x", 6).attr("y", ROW_HEIGHT / 2 + 4)
        .attr("clip-path", `url(#${ROW_LABEL_CLIP_ID})`)
        .text(`${episode.actorName} · ${formatWeekLabel(episode.t0Date)}`);

      const cells = select(nodes[index]).select("g.ew-cells")
        .selectAll<SVGGElement, EventWindow>("g.ew-cell")
        .data(episode.rows, (row) => row.relative_week)
        .join((enter) => {
          const cellGroup = enter.append("g").attr("class", "ew-cell");
          cellGroup.append("rect").attr("class", "ew-cell-bg");
          cellGroup.append("circle").attr("class", "ew-cell-circle");
          return cellGroup;
        });

      cells.each((cell, cellIndex, cellNodes) => {
        const cellNode = select(cellNodes[cellIndex]);
        const x = ROW_LABEL_WIDTH + (cell.relative_week - this.weeks[0]) * COL_WIDTH;
        const color = sequentialColor(cell[this.metric], maxMetric, violenceColors.stateBased);
        const radius = circleRadius(cell.one_sided_civilian_fatalities, maxFatalities, CIRCLE_MAX_RADIUS, CIRCLE_MIN_RADIUS);

        cellNode.select("rect.ew-cell-bg")
          .attr("x", x + 1).attr("y", 1)
          .attr("width", COL_WIDTH - 2).attr("height", ROW_HEIGHT - 2)
          .attr("fill", color ?? `url(#${HATCH_ID})`)
          .attr("stroke", "#e1e0d9");
        cellNode.select("circle.ew-cell-circle")
          .attr("cx", x + COL_WIDTH / 2).attr("cy", ROW_HEIGHT / 2)
          .attr("r", radius)
          .attr("fill", violenceColors.oneSided)
          .attr("fill-opacity", 0.85)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", radius > 0 ? 1 : 0);

        cellNode
          .style("cursor", "pointer")
          .on("pointerenter", (event: PointerEvent) => {
            this.onHoverEpisode(episode);
            const [px, py] = pointer(event, this.matrixWrapper);
            this.tooltip.show(renderEventWindowTooltip(episode, cell), px, py);
          })
          .on("pointerleave", () => this.onHoverEnd())
          .on("click", () => this.selectEpisode(episode));
      });
    });
  }

  private onHoverEpisode(episode: Episode): void {
    if (this.hoveredEpisodeId === episode.episodeId) return;
    this.hoveredEpisodeId = episode.episodeId;
    this.renderDetails();
  }

  private onHoverEnd(): void {
    this.hoveredEpisodeId = null;
    this.tooltip.hide();
    this.renderDetails();
  }

  /** Details panel shows the hovered episode; failing that, the one matching the global
   * selection (row/cell click already set selectedActorId + focusWeek to its t0Date); failing
   * that, a placeholder that names the globally selected actor if one is set. */
  private renderDetails(): void {
    const hovered = this.hoveredEpisodeId !== null
      ? this.currentEpisodes.find((episode) => episode.episodeId === this.hoveredEpisodeId) ?? null
      : null;
    const selectedActorId = this.lastState.selectedActorId;
    const focusTime = this.lastState.focusWeek?.getTime() ?? null;
    const selected = hovered === null
      ? this.currentEpisodes.find(
        (episode) => episode.actorId === selectedActorId && episode.t0Date.getTime() === focusTime,
      ) ?? null
      : null;

    const selectedActorName = selectedActorId === "__ALL__"
      ? null
      : this.data.actorProfiles.find((actor) => actor.actor_id === selectedActorId)?.actor_name ?? selectedActorId;

    this.detailsHost.replaceChildren(
      renderEventWindowDetails(hovered ?? selected, { metric: this.metric, selectedActorName }),
    );
  }

  private selectEpisode(episode: Episode): void {
    this.store.setState({ selectedActorId: episode.actorId, focusWeek: episode.t0Date });
  }
}
