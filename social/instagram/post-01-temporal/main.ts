/**
 * Instagram post 1 - "WHEN does violence turn toward civilians?"
 * Static, non-interactive counterpart of Web 1's Timeline (web/src/viz/timeline/Timeline.ts):
 * same __ALL__ weekly series and semantic colors, but re-composed as one editorial
 * image (larger type, minimal axes, no brush/tooltip/controls) rather than a
 * screenshot of the interactive chart. See VIZ.md §1 for what Web 1 shows.
 */
import { area as d3Area, extent, line as d3Line, max, scaleLinear, scaleUtc } from "d3";
import { loadSocialData } from "../../shared/data";
import { violenceColors } from "../../shared/colors";
import { formatCount, formatMonthYear, formatPercent, formatWeekLabel } from "../../shared/format";
import type { WeeklyMetric } from "../../shared/types";

const ROOT_ID = "social-root";
const SVG_NS = "http://www.w3.org/2000/svg";

const EVENT_SERIES: ReadonlyArray<{ key: keyof WeeklyMetric; label: string; color: string }> = [
  { key: "state_based_event_count", label: "State-based", color: violenceColors.stateBased },
  { key: "non_state_event_count", label: "Non-state", color: violenceColors.nonState },
  { key: "one_sided_event_count", label: "One-sided", color: violenceColors.oneSided },
];

const CHART_WIDTH = 920;
const MAIN_CHART_HEIGHT = 340;
const SHARE_CHART_HEIGHT = 110;

interface AnnotatedWeek {
  week: Pick<WeeklyMetric, "week_start" | "one_sided_event_share" | "one_sided_civilian_fatalities" | "event_count">;
  rank: number;
}

async function render(): Promise<void> {
  const root = document.getElementById(ROOT_ID);
  if (!root) throw new Error("Missing #social-root");

  const data = await loadSocialData();
  // __ALL__ rows are read directly from weekly_metrics.csv, never summed from
  // actor rows - see CLAUDE.md's double-counting rule and DATA_FILES.md §5.
  const weekly = data.weeklyMetrics
    .filter((row) => row.actor_id === "__ALL__")
    .sort((a, b) => a.week_start.getTime() - b.week_start.getTime());
  if (weekly.length === 0) throw new Error("No __ALL__ rows in weekly_metrics.csv");

  const annotations = selectAnnotatedWeeks(weekly);

  const mainBlock = buildChartBlock("WEEKLY VIOLENCE", "events per week", buildMainChart(weekly, annotations));
  mainBlock.append(buildSwatches());

  root.innerHTML = "";
  root.append(
    buildEyebrow(),
    buildHeadline(),
    buildSubtitle(),
    buildDivider(),
    mainBlock,
    buildDivider(),
    buildChartBlock("ONE-SIDED SHARE", "% of that week's events", buildShareChart(weekly, annotations)),
    buildAnnotationList(annotations),
    buildDivider(),
    buildFinding(),
    buildFooter(data.metadata.country, data.metadata.analysis_start, data.metadata.analysis_end),
  );

  document.body.dataset.renderState = "ready";
}

/**
 * Deterministic, display-only annotation rule (no manually invented dates):
 * 1. Restrict to weeks whose event_count is at or above the median weekly
 *    event_count for the whole series - this is the "reasonable minimum
 *    activity" condition, so a week with one or two events can never be
 *    picked just because its one_sided_event_share happens to read 100%.
 * 2. Rank the remaining weeks by one_sided_civilian_fatalities descending -
 *    the same peak metric the pipeline itself uses for episode detection
 *    (DATA_FILES.md §8), so this post's notion of "significant week" matches
 *    Web 4's rather than inventing a second one.
 * 3. Walk that ranking greedily, keeping a candidate only if it is at least
 *    MIN_GAP_DAYS from every week already kept, so nearby weeks from the same
 *    episode don't crowd out temporally distinct ones. Stop at MAX_ANNOTATIONS.
 */
const MIN_GAP_DAYS = 28;
const MAX_ANNOTATIONS = 3;

function selectAnnotatedWeeks(weekly: WeeklyMetric[]): AnnotatedWeek[] {
  const counts = weekly.map((row) => row.event_count).sort((a, b) => a - b);
  const mid = Math.floor(counts.length / 2);
  const medianEventCount = counts.length % 2 === 0 ? (counts[mid - 1] + counts[mid]) / 2 : counts[mid];

  const active = weekly.filter((row) => row.event_count >= medianEventCount);
  const rankedByFatalities = active
    .filter((row) => row.one_sided_civilian_fatalities > 0)
    .sort((a, b) => b.one_sided_civilian_fatalities - a.one_sided_civilian_fatalities);

  const selected: AnnotatedWeek[] = [];
  for (const candidate of rankedByFatalities) {
    const tooClose = selected.some(
      (s) => Math.abs(candidate.week_start.getTime() - s.week.week_start.getTime()) < MIN_GAP_DAYS * 86_400_000,
    );
    if (!tooClose) selected.push({ week: candidate, rank: 0 });
    if (selected.length === MAX_ANNOTATIONS) break;
  }
  // Renumber left to right (chronological), not by significance rank, so the
  // numbered badges read in the same order they appear across the chart.
  return selected
    .sort((a, b) => a.week.week_start.getTime() - b.week.week_start.getTime())
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function buildEyebrow(): HTMLParagraphElement {
  const eyebrow = document.createElement("p");
  eyebrow.className = "social-eyebrow";
  eyebrow.textContent = "From Battlefield to Civilians · UCDP GED";
  return eyebrow;
}

function buildHeadline(): HTMLHeadingElement {
  const headline = document.createElement("h1");
  headline.className = "social-headline";
  headline.textContent = "When does one-sided violence become more prominent?";
  return headline;
}

function buildSubtitle(): HTMLParagraphElement {
  const subtitle = document.createElement("p");
  subtitle.className = "social-subtitle";
  subtitle.textContent =
    "Weekly composition of recorded violence in Sudan - state-based, non-state, and one-sided against civilians.";
  return subtitle;
}

function buildDivider(): HTMLHRElement {
  const hr = document.createElement("hr");
  hr.className = "social-divider";
  return hr;
}

function buildChartBlock(title: string, unit: string, svg: SVGSVGElement): HTMLDivElement {
  const block = document.createElement("div");
  block.className = "chart-block";

  const label = document.createElement("p");
  label.className = "panel-label";
  label.innerHTML = `${title} <span class="panel-label-unit">· ${unit}</span>`;
  block.append(label, svg);
  return block;
}

/** Direct-labeled swatch row: a fixed-order legend (skill rule: identity is never color-alone). */
function buildSwatches(): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "chart-swatches";
  for (const series of EVENT_SERIES) {
    const item = document.createElement("span");
    item.className = "swatch-item";
    const dot = document.createElement("span");
    dot.className = "swatch-dot";
    dot.style.background = series.color;
    item.append(dot, document.createTextNode(series.label));
    row.append(item);
  }
  return row;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

// Root <svg> elements clip to their viewBox (overflow:hidden by default), so anything drawn
// outside 0..width/0..height would silently vanish. TOP_MARGIN reserves room for the numbered
// annotation badges above the plot; BOTTOM_MARGIN (main chart only) reserves room for the
// baseline's year labels - both are part of each chart's own svg, never negative coordinates.
const TOP_MARGIN = 22;
const BOTTOM_MARGIN = 24;

/** Stacked area of the three mutually exclusive event types; they sum to event_count (DATA_FILES.md §5). */
function buildMainChart(weekly: WeeklyMetric[], annotations: AnnotatedWeek[]): SVGSVGElement {
  const plotHeight = MAIN_CHART_HEIGHT;
  const totalHeight = TOP_MARGIN + plotHeight + BOTTOM_MARGIN;
  const svg = svgEl("svg");
  svg.setAttribute("width", String(CHART_WIDTH));
  svg.setAttribute("height", String(totalHeight));
  svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${totalHeight}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Weekly event composition: state-based, non-state, one-sided");

  const plot = svgEl("g");
  plot.setAttribute("transform", `translate(0,${TOP_MARGIN})`);
  svg.append(plot);

  const [start, end] = extent(weekly, (row) => row.week_start) as [Date, Date];
  const x = scaleUtc().domain([start, end]).range([0, CHART_WIDTH]);
  const yMax = max(weekly, (row) => row.state_based_event_count + row.non_state_event_count + row.one_sided_event_count) ?? 1;
  const y = scaleLinear().domain([0, yMax]).range([plotHeight, 0]).nice();

  type Point = { date: Date; y0: number; y1: number };
  const layers: Point[][] = EVENT_SERIES.map(() => []);
  for (const row of weekly) {
    let cumulative = 0;
    EVENT_SERIES.forEach((series, index) => {
      const value = row[series.key] as number;
      const y0 = cumulative;
      const y1 = cumulative + value;
      layers[index].push({ date: row.week_start, y0, y1 });
      cumulative = y1;
    });
  }

  const areaGen = d3Area<Point>()
    .x((d) => x(d.date))
    .y0((d) => y(d.y0))
    .y1((d) => y(d.y1));

  EVENT_SERIES.forEach((series, index) => {
    const area = svgEl("path");
    area.setAttribute("fill", series.color);
    area.setAttribute("d", areaGen(layers[index]) ?? "");
    area.setAttribute("fill-opacity", "0.85");
    if (index > 0) {
      // A thin surface-colored seam between stacked bands (dataviz skill: 2px gap between
      // stacked segments), so adjacent fills never visually merge into one mass.
      area.setAttribute("stroke", "var(--paper)");
      area.setAttribute("stroke-width", "1.5");
    }
    plot.append(area);
  });

  // Minimal axis: a single baseline plus the first/last calendar year, no tick grid -
  // "simpler axes than the web visualization" per the brief.
  const baseline = svgEl("line");
  baseline.setAttribute("x1", "0");
  baseline.setAttribute("x2", String(CHART_WIDTH));
  baseline.setAttribute("y1", String(plotHeight));
  baseline.setAttribute("y2", String(plotHeight));
  baseline.setAttribute("stroke", "var(--axis)");
  baseline.setAttribute("stroke-width", "1");
  plot.append(baseline);

  for (const [date, anchor] of [
    [start, "start"],
    [end, "end"],
  ] as const) {
    const label = svgEl("text");
    label.setAttribute("x", String(x(date)));
    label.setAttribute("y", String(plotHeight + 20));
    label.setAttribute("text-anchor", anchor);
    label.setAttribute("class", "axis-year-label");
    label.textContent = String(date.getUTCFullYear());
    plot.append(label);
  }

  appendAnnotationMarkers(svg, plot, annotations, x, plotHeight);
  return svg;
}

/** 0-100% line/area of one_sided_event_share; the exact metric Web 1's share panel plots. */
function buildShareChart(weekly: WeeklyMetric[], annotations: AnnotatedWeek[]): SVGSVGElement {
  const plotHeight = SHARE_CHART_HEIGHT;
  const totalHeight = TOP_MARGIN + plotHeight;
  const svg = svgEl("svg");
  svg.setAttribute("width", String(CHART_WIDTH));
  svg.setAttribute("height", String(totalHeight));
  svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${totalHeight}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "One-sided share of weekly events, 0 to 100 percent");

  const plot = svgEl("g");
  plot.setAttribute("transform", `translate(0,${TOP_MARGIN})`);
  svg.append(plot);

  const [start, end] = extent(weekly, (row) => row.week_start) as [Date, Date];
  const x = scaleUtc().domain([start, end]).range([0, CHART_WIDTH]);
  const y = scaleLinear().domain([0, 1]).range([plotHeight, 0]);

  type Point = { date: Date; value: number };
  const points: Point[] = weekly.map((row) => ({ date: row.week_start, value: row.one_sided_event_share }));

  const areaGen = d3Area<Point>()
    .x((d) => x(d.date))
    .y0(y(0))
    .y1((d) => y(d.value));
  const lineGen = d3Line<Point>()
    .x((d) => x(d.date))
    .y((d) => y(d.value));

  const area = svgEl("path");
  area.setAttribute("d", areaGen(points) ?? "");
  area.setAttribute("fill", violenceColors.oneSided);
  area.setAttribute("fill-opacity", "0.16");
  plot.append(area);

  const line = svgEl("path");
  line.setAttribute("d", lineGen(points) ?? "");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", violenceColors.oneSided);
  line.setAttribute("stroke-width", "2.5");
  plot.append(line);

  // Only the 0% and 100% bounds are labeled, inside the plot area - "very limited
  // gridlines" per the brief.
  for (const value of [0, 1]) {
    const gridline = svgEl("line");
    gridline.setAttribute("x1", "0");
    gridline.setAttribute("x2", String(CHART_WIDTH));
    gridline.setAttribute("y1", String(y(value)));
    gridline.setAttribute("y2", String(y(value)));
    gridline.setAttribute("stroke", "var(--border)");
    gridline.setAttribute("stroke-width", "1");
    plot.append(gridline);

    const label = svgEl("text");
    label.setAttribute("x", "6");
    label.setAttribute("y", String(y(value) + (value === 0 ? -4 : 14)));
    label.setAttribute("text-anchor", "start");
    label.setAttribute("class", "axis-share-label");
    label.textContent = formatPercent(value);
    plot.append(label);
  }

  // Subtle midpoint reference (dashed, no gridline weight) so "is this week above or
  // below half" reads at a glance without competing with the 0%/100% bounds.
  const midline = svgEl("line");
  midline.setAttribute("x1", "0");
  midline.setAttribute("x2", String(CHART_WIDTH));
  midline.setAttribute("y1", String(y(0.5)));
  midline.setAttribute("y2", String(y(0.5)));
  midline.setAttribute("stroke", "var(--border)");
  midline.setAttribute("stroke-width", "1");
  midline.setAttribute("stroke-dasharray", "2,3");
  midline.setAttribute("opacity", "0.7");
  plot.append(midline);

  const midLabel = svgEl("text");
  midLabel.setAttribute("x", "6");
  midLabel.setAttribute("y", String(y(0.5) - 4));
  midLabel.setAttribute("text-anchor", "start");
  midLabel.setAttribute("class", "axis-share-label axis-share-label-mid");
  midLabel.textContent = formatPercent(0.5);
  plot.append(midLabel);

  appendAnnotationMarkers(svg, plot, annotations, x, plotHeight);
  return svg;
}

/** Thin numbered marker lines at each annotated week's x position, shared by both panels. */
function appendAnnotationMarkers(
  svg: SVGSVGElement,
  plot: SVGGElement,
  annotations: AnnotatedWeek[],
  x: (date: Date) => number,
  plotHeight: number,
): void {
  for (const annotation of annotations) {
    const xPos = x(annotation.week.week_start);
    const marker = svgEl("line");
    marker.setAttribute("x1", String(xPos));
    marker.setAttribute("x2", String(xPos));
    marker.setAttribute("y1", "0");
    marker.setAttribute("y2", String(plotHeight));
    marker.setAttribute("stroke", "var(--ink)");
    marker.setAttribute("stroke-width", "1.25");
    marker.setAttribute("stroke-dasharray", "2,3");
    marker.setAttribute("opacity", "0.65");
    plot.append(marker);

    const badge = svgEl("circle");
    badge.setAttribute("cx", String(xPos));
    badge.setAttribute("cy", String(TOP_MARGIN / 2));
    badge.setAttribute("r", "9");
    badge.setAttribute("fill", "var(--ink)");
    svg.append(badge);

    const badgeText = svgEl("text");
    badgeText.setAttribute("x", String(xPos));
    badgeText.setAttribute("y", String(TOP_MARGIN / 2 + 4));
    badgeText.setAttribute("text-anchor", "middle");
    badgeText.setAttribute("class", "marker-badge-text");
    badgeText.textContent = String(annotation.rank);
    svg.append(badgeText);
  }
}

/** Short, descriptive (never causal) captions for the numbered markers, read left to right. */
function buildAnnotationList(annotations: AnnotatedWeek[]): HTMLDivElement {
  const list = document.createElement("div");
  list.className = "annotation-list";
  for (const annotation of annotations) {
    const item = document.createElement("div");
    item.className = "annotation-item";
    const badge = document.createElement("span");
    badge.className = "annotation-item-badge";
    badge.textContent = String(annotation.rank);
    const body = document.createElement("span");
    body.className = "annotation-item-body";
    const date = document.createElement("span");
    date.className = "annotation-item-date";
    date.textContent = formatWeekLabel(annotation.week.week_start);
    const detail = document.createElement("span");
    detail.className = "annotation-item-detail";
    detail.textContent = `${formatCount(
      annotation.week.one_sided_civilian_fatalities,
    )} one-sided civilian fatalities in events dated to this week (${formatPercent(annotation.week.one_sided_event_share)} of events)`;
    body.append(date, detail);
    item.append(badge, body);
    list.append(item);
  }
  return list;
}

function buildFinding(): HTMLDivElement {
  const finding = document.createElement("div");
  finding.className = "social-finding";
  const label = document.createElement("p");
  label.className = "social-finding-label";
  label.textContent = "Main finding";
  const text = document.createElement("p");
  text.className = "social-finding-text";
  // Supported by the plotted data: one_sided_event_share swings between 0% and 100% across
  // weeks (stdev ~0.19 against a mean of ~0.26) with isolated spikes rather than a level
  // trend - see the annotated weeks above. Description of association only, not causation.
  text.textContent =
    "One-sided violence was concentrated in particular phases of the conflict rather than remaining constant over time.";
  finding.append(label, text);
  return finding;
}

function buildFooter(country: string, analysisStart: string, analysisEnd: string): HTMLDivElement {
  const wrap = document.createElement("div");
  const start = new Date(`${analysisStart}T00:00:00.000Z`);
  const end = new Date(`${analysisEnd}T00:00:00.000Z`);
  const footer = document.createElement("p");
  footer.className = "social-footer";
  footer.textContent = `UCDP Georeferenced Event Dataset (GED) · ${country} · ${formatMonthYear(start)}-${formatMonthYear(end)}`;
  const note = document.createElement("p");
  note.className = "social-footer-note";
  note.textContent = "Events aggregated weekly by UCDP date_start";
  wrap.append(footer, note);
  return wrap;
}

render().catch((error: unknown) => {
  const root = document.getElementById(ROOT_ID);
  if (root) {
    root.innerHTML = "";
    const message = document.createElement("p");
    message.className = "social-error";
    message.textContent = `Failed to render: ${error instanceof Error ? error.message : String(error)}`;
    root.appendChild(message);
  }
  document.body.dataset.renderState = "error";
  console.error(error);
});
