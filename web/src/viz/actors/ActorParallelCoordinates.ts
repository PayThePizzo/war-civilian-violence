/** Web 3 "WHO": parallel-coordinates plot over actor_profiles.csv (WEB.md §23-29). */
import { line as d3Line, pointer, select } from "d3";
import type { AppState } from "../../app/state";
import type { AppStore } from "../../app/store";
import { getActorProfiles } from "../../data/selectors";
import type { ActorProfile, AppData } from "../../data/types";
import { createTooltip } from "../../ui/Tooltip";
import type { Tooltip } from "../../ui/Tooltip";
import { formatCount, formatPercent } from "../../utils/format";
import { renderActorDetails } from "./ActorDetails";
import { renderActorTooltip } from "./ActorTooltip";
import { AXES, axisPositions, buildAxisScales, pointsForProfile } from "./actorMath";
import "./actors.css";

const MARGIN = { top: 74, right: 88, bottom: 12, left: 16 };
const HEIGHT = 260;
const SELECTED_COLOR = "#20252b";
const HOVER_COLOR = "#5a3ea8";
const NORMAL_COLOR = "#9a988f";
const SELECTED_WIDTH = 3;
const HOVER_WIDTH = 2.5;
const NORMAL_WIDTH = 1.25;
const FADED_OPACITY = 0.25;
const NORMAL_OPACITY = 0.6;

export class ActorParallelCoordinates {
  private readonly data: AppData;
  private readonly store: AppStore;
  private readonly root: HTMLDivElement;
  private readonly chartHost: HTMLDivElement;
  private readonly emptyState: HTMLParagraphElement;
  private readonly svg: SVGSVGElement;
  private readonly plot: SVGGElement;
  private readonly axesGroup: SVGGElement;
  private readonly linesGroup: SVGGElement;
  private readonly detailsHost: HTMLDivElement;
  private readonly minorActorsCheckbox: HTMLInputElement;
  private readonly tooltip: Tooltip;
  private readonly resizeObserver: ResizeObserver;

  private lastState: AppState = { selectedActorId: "__ALL__", focusWeek: null };
  private showMinorActors = false;
  private hoveredActorId: string | null = null;

  constructor(container: HTMLElement, data: AppData, store: AppStore) {
    this.data = data;
    this.store = store;

    this.root = document.createElement("div");
    this.root.className = "actor-pc";

    const main = document.createElement("div");
    main.className = "actor-pc-main";

    const controls = document.createElement("label");
    controls.className = "actor-pc-controls";
    this.minorActorsCheckbox = document.createElement("input");
    this.minorActorsCheckbox.type = "checkbox";
    this.minorActorsCheckbox.addEventListener("change", () => {
      this.showMinorActors = this.minorActorsCheckbox.checked;
      this.render();
    });
    controls.append(this.minorActorsCheckbox, document.createTextNode("Show minor actors"));

    const intro = document.createElement("p");
    intro.className = "actor-pc-intro";
    intro.textContent = "Each line represents one armed actor. Higher positions indicate larger values on each dimension.";
    const scaleNote = document.createElement("p");
    scaleNote.className = "actor-pc-note";
    scaleNote.textContent = "Count and fatality axes use a symlog scale to accommodate highly skewed values.";

    this.chartHost = document.createElement("div");
    this.chartHost.className = "actor-pc-chart";

    const svgNs = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(svgNs, "svg");
    this.svg.setAttribute("class", "actor-pc-svg");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "Parallel coordinates of armed actor violence profiles");
    this.plot = document.createElementNS(svgNs, "g");
    this.plot.setAttribute("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    this.axesGroup = document.createElementNS(svgNs, "g");
    this.axesGroup.setAttribute("class", "pc-axes");
    this.linesGroup = document.createElementNS(svgNs, "g");
    this.linesGroup.setAttribute("class", "pc-lines");
    this.plot.append(this.axesGroup, this.linesGroup);
    this.svg.append(this.plot);
    this.chartHost.append(this.svg);
    this.tooltip = createTooltip(this.chartHost);

    this.emptyState = document.createElement("p");
    this.emptyState.className = "actor-pc-empty";
    this.emptyState.hidden = true;

    main.append(controls, intro, scaleNote, this.chartHost, this.emptyState);

    const side = document.createElement("div");
    side.className = "actor-pc-side";
    this.detailsHost = document.createElement("div");
    side.append(this.detailsHost);

    this.root.append(main, side);
    container.append(this.root);

    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.chartHost);
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
    const profiles = getActorProfiles(this.data, this.showMinorActors);
    const width = Math.max(240, this.chartHost.clientWidth);
    const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
    const totalHeight = MARGIN.top + HEIGHT + MARGIN.bottom;
    this.svg.setAttribute("width", String(width));
    this.svg.setAttribute("height", String(totalHeight));
    this.svg.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);

    const positions = axisPositions(AXES.length, plotWidth);
    const scales = buildAxisScales(profiles, HEIGHT);
    const lineGen = d3Line<{ x: number; y: number }>().x((d) => d.x).y((d) => d.y);

    this.renderAxes(positions, scales);

    const selectedId = this.lastState.selectedActorId;
    const groups = select(this.linesGroup)
      .selectAll<SVGGElement, ActorProfile>("g.pc-actor")
      .data(profiles, (profile) => profile.actor_id)
      .join((enter) => {
        const g = enter.append("g").attr("class", "pc-actor");
        g.append("path").attr("class", "pc-line-hit").attr("fill", "none");
        g.append("path").attr("class", "pc-line-visible").attr("fill", "none");
        return g;
      });

    groups.each((profile, index, nodes) => {
      const node = select(nodes[index]);
      const points = pointsForProfile(profile, scales, positions);
      const path = lineGen(points) ?? "";
      const isSelected = profile.actor_id === selectedId;
      const isHovered = profile.actor_id === this.hoveredActorId;
      // A selection or a hover both narrow focus, but neither erases the other: the selected
      // actor keeps its distinct color/width even while a different actor is hovered, and only
      // actors that are neither stay faded.
      const faded = !isSelected && !isHovered && (this.hoveredActorId !== null || selectedId !== "__ALL__");
      const color = isSelected ? SELECTED_COLOR : isHovered ? HOVER_COLOR : NORMAL_COLOR;
      const width = isSelected ? SELECTED_WIDTH : isHovered ? HOVER_WIDTH : NORMAL_WIDTH;
      const opacity = faded ? FADED_OPACITY : isSelected || isHovered ? 1 : NORMAL_OPACITY;

      node.select("path.pc-line-hit")
        .attr("d", path)
        .attr("stroke", "transparent")
        .attr("stroke-width", 12)
        .style("cursor", "pointer")
        .on("pointerenter", (event: PointerEvent) => this.onHover(profile, event))
        .on("pointerleave", () => this.onHoverEnd())
        .on("click", () => this.store.setState({ selectedActorId: profile.actor_id }));
      node.select("path.pc-line-visible")
        .attr("d", path)
        .attr("stroke", color)
        .attr("stroke-width", width)
        .attr("stroke-opacity", opacity)
        .attr("pointer-events", "none");

      node.classed("pc-actor-selected", isSelected);
      // Selected stays on top of the ordinary stack so it remains prominent after mouseout;
      // a hover on another actor may still raise above it while the pointer lingers there.
      if (isSelected) node.raise();
      if (isHovered) node.raise();
    });

    this.renderDetails();

    this.emptyState.hidden = profiles.length > 0;
    this.emptyState.textContent = "No actors meet the display threshold.";
    this.chartHost.hidden = profiles.length === 0;
  }

  private renderAxes(positions: number[], scales: ReturnType<typeof buildAxisScales>): void {
    const axesSelection = select(this.axesGroup)
      .selectAll<SVGGElement, (typeof AXES)[number]>("g.pc-axis")
      .data(AXES, (axis) => axis.key)
      .join((enter) => {
        const g = enter.append("g").attr("class", "pc-axis");
        g.append("line").attr("class", "pc-axis-line");
        g.append("text").attr("class", "pc-axis-title");
        g.append("text").attr("class", "pc-axis-max");
        g.append("text").attr("class", "pc-axis-min");
        return g;
      });

    axesSelection.each((axis, index, nodes) => {
      const x = positions[index];
      const scale = scales.get(axis.key)!;
      const [minValue, maxValue] = scale.domain();
      const node = select(nodes[index]);
      node.attr("transform", `translate(${x},0)`);
      node.select("line.pc-axis-line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", HEIGHT);
      node.select("text.pc-axis-title")
        .attr("text-anchor", "start")
        .attr("transform", "translate(6,-34) rotate(-20)")
        .text(axis.label);
      const format = axis.key === "one_sided_event_share"
        ? (value: number) => formatPercent(value, 0)
        : (value: number) => formatCount(Math.round(value));
      node.select("text.pc-axis-max").attr("y", -2).attr("text-anchor", "middle").text(format(maxValue));
      node.select("text.pc-axis-min").attr("y", HEIGHT + 14).attr("text-anchor", "middle").text(format(minValue));
    });
  }

  private onHover(profile: ActorProfile, event: PointerEvent): void {
    this.hoveredActorId = profile.actor_id;
    this.render();
    const [x, y] = pointer(event, this.chartHost);
    this.tooltip.show(renderActorTooltip(profile), x, y);
  }

  private onHoverEnd(): void {
    this.hoveredActorId = null;
    this.render();
    this.tooltip.hide();
  }

  private renderDetails(): void {
    const focused = this.hoveredActorId !== null
      ? this.data.actorProfiles.find((profile) => profile.actor_id === this.hoveredActorId) ?? null
      : this.lastState.selectedActorId === "__ALL__"
        ? null
        : this.data.actorProfiles.find((profile) => profile.actor_id === this.lastState.selectedActorId) ?? null;
    this.detailsHost.replaceChildren(renderActorDetails(focused));
  }
}
