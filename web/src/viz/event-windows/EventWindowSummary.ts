/** Web 4 Part A: median line + interquartile band across displayed episodes (WEB.md §32). */
import { area as d3Area, axisBottom, axisLeft, line as d3Line, max, scaleLinear, select } from "d3";
import { violenceColors } from "../../utils/colors";
import { formatCount } from "../../utils/format";
import { medianBand } from "./eventWindowMath";
import type { BackgroundMetric, BandPoint, Episode } from "./eventWindowMath";

const MARGIN = { top: 12, right: 16, bottom: 24, left: 44 };
const HEIGHT = 140;

export class EventWindowSummary {
  private readonly root: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly plot: SVGGElement;
  private readonly band: SVGPathElement;
  private readonly medianLine: SVGPathElement;
  private readonly t0Line: SVGLineElement;
  private readonly axisX: SVGGElement;
  private readonly axisY: SVGGElement;
  private readonly emptyState: HTMLParagraphElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ew-summary";

    const svgNs = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(svgNs, "svg");
    this.svg.setAttribute("class", "ew-summary-svg");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "Median activity across displayed episodes, relative to T0");
    this.plot = document.createElementNS(svgNs, "g");
    this.plot.setAttribute("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    this.band = document.createElementNS(svgNs, "path") as SVGPathElement;
    this.band.setAttribute("class", "ew-band");
    this.medianLine = document.createElementNS(svgNs, "path") as SVGPathElement;
    this.medianLine.setAttribute("class", "ew-median");
    this.medianLine.setAttribute("fill", "none");
    this.t0Line = document.createElementNS(svgNs, "line") as SVGLineElement;
    this.t0Line.setAttribute("class", "ew-t0-line");
    this.t0Line.setAttribute("y1", "0");
    this.t0Line.setAttribute("y2", String(HEIGHT));
    this.axisX = document.createElementNS(svgNs, "g");
    this.axisX.setAttribute("class", "axis axis-x");
    this.axisX.setAttribute("transform", `translate(0,${HEIGHT})`);
    this.axisY = document.createElementNS(svgNs, "g");
    this.axisY.setAttribute("class", "axis axis-y");
    this.plot.append(this.band, this.t0Line, this.medianLine, this.axisX, this.axisY);
    this.svg.append(this.plot);

    this.emptyState = document.createElement("p");
    this.emptyState.className = "ew-empty";
    this.emptyState.hidden = true;

    this.root.append(this.svg, this.emptyState);
    container.append(this.root);
  }

  render(episodes: readonly Episode[], metric: BackgroundMetric, weeks: readonly number[]): void {
    const width = Math.max(240, this.root.clientWidth);
    const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
    const totalHeight = MARGIN.top + HEIGHT + MARGIN.bottom;
    this.svg.setAttribute("width", String(width));
    this.svg.setAttribute("height", String(totalHeight));
    this.svg.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);

    this.emptyState.hidden = episodes.length > 0;
    this.emptyState.textContent = "No episodes for this selection.";
    this.svg.style.display = episodes.length === 0 ? "none" : "";
    if (episodes.length === 0) return;

    const points = medianBand([...episodes], metric, weeks);
    const xScale = scaleLinear().domain([weeks[0], weeks[weeks.length - 1]]).range([0, plotWidth]);
    const yMax = Math.max(1, max(points, (p) => p.q3 ?? 0) ?? 1);
    const yScale = scaleLinear().domain([0, yMax]).range([HEIGHT, 0]);

    // .defined() breaks the line/area at a week with zero observed episodes instead of
    // silently bridging the gap with an interpolated segment (a week with no observed data
    // must never be drawn as if it smoothly continues its neighbors - WEB.md §35).
    const areaGen = d3Area<BandPoint>()
      .defined((d) => d.median !== null)
      .x((d) => xScale(d.relativeWeek))
      .y0((d) => yScale(d.q1 as number))
      .y1((d) => yScale(d.q3 as number));
    const lineGen = d3Line<BandPoint>()
      .defined((d) => d.median !== null)
      .x((d) => xScale(d.relativeWeek))
      .y((d) => yScale(d.median as number));

    select(this.band).attr("d", areaGen(points)).attr("fill", violenceColors.stateBased).attr("fill-opacity", 0.15).attr("stroke", "none");
    select(this.medianLine).attr("d", lineGen(points)).attr("stroke", violenceColors.stateBased).attr("stroke-width", 2);

    const t0X = xScale(0);
    this.t0Line.setAttribute("x1", String(t0X));
    this.t0Line.setAttribute("x2", String(t0X));

    select(this.axisX).call(axisBottom(xScale).tickValues(weeks.filter((w) => w % 2 === 0)).tickFormat((w) => (Number(w) === 0 ? "T0" : `${Number(w) > 0 ? "+" : ""}${w}`)) as never);
    select(this.axisY).call(axisLeft(yScale).ticks(4).tickFormat((v) => formatCount(v as number)) as never);
  }
}
