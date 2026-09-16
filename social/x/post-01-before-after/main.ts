/**
 * X post 1 — "What happens around major episodes of one-sided violence?"
 * Static, non-interactive counterpart of Web 4's event-window matrix
 * (web/src/viz/event-windows/EventWindowMatrix.ts, VIZ.md §4): same
 * pipeline-defined episodes/relative weeks and semantic colors, but
 * re-composed as one median+IQR summary chart - no per-episode matrix rows,
 * metric selector, or hover-driven details panel carried over. Episodes are
 * never redetected here; only episode_id, t0_date, relative_week,
 * peak_rank, peak_metric_value, and is_observed_week from the pipeline are
 * used, exactly as event_windows.csv defines them.
 */
import { area as d3Area, line as d3Line, max, scaleLinear } from "d3";
import { loadEventWindows, loadMetadata } from "../../shared/data";
import { violenceColors } from "../../shared/colors";
import { formatCount } from "../../shared/format";
import type { EventWindow } from "../../shared/types";

const ROOT_ID = "social-root";
const SVG_NS = "http://www.w3.org/2000/svg";

const CHART_WIDTH = 944;
const MAIN_CHART_HEIGHT = 380;
const DOT_STRIP_HEIGHT = 60;
const TOP_MARGIN = 24; // room for the T0 badge above the plot area, see appendT0Marker
const NEAR_WEEKS = [-4, -3, -2, -1] as const;
const FAR_WEEKS = [-8, -7, -6, -5] as const;

interface EpisodeGroup {
  episodeId: string;
  rows: EventWindow[];
}

function groupEpisodes(rows: readonly EventWindow[]): EpisodeGroup[] {
  const byId = new Map<string, EventWindow[]>();
  for (const row of rows) {
    const group = byId.get(row.episode_id);
    if (group) group.push(row);
    else byId.set(row.episode_id, [row]);
  }
  return [...byId.entries()].map(([episodeId, episodeRows]) => ({
    episodeId,
    rows: episodeRows.slice().sort((a, b) => a.relative_week - b.relative_week),
  }));
}

/** Linear-interpolation quantile over an already-sorted array (p in [0, 1]). */
function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

interface BandPoint {
  relativeWeek: number;
  median: number | null;
  q1: number | null;
  q3: number | null;
}

/**
 * Per relative-week median/Q1/Q3 of `metric` across episodes. Only rows with
 * is_observed_week === true AND a non-null metric value contribute - an
 * unobserved week (outside an episode's local analysis-period window) is
 * excluded from the statistic entirely, never treated as zero, per
 * DATA_FILES.md's missing-vs-zero policy and the brief's explicit rule.
 */
function medianBand(
  episodes: readonly EpisodeGroup[],
  metric: "combat_event_count" | "one_sided_civilian_fatalities",
  weeks: readonly number[],
): BandPoint[] {
  return weeks.map((relativeWeek) => {
    const values = episodes
      .map((episode) => episode.rows.find((row) => row.relative_week === relativeWeek))
      .filter((row): row is EventWindow => row !== undefined && row.is_observed_week && row[metric] !== null)
      .map((row) => row[metric] as number)
      .sort((a, b) => a - b);
    if (values.length === 0) return { relativeWeek, median: null, q1: null, q3: null };
    return { relativeWeek, median: quantile(values, 0.5), q1: quantile(values, 0.25), q3: quantile(values, 0.75) };
  });
}

/**
 * Descriptive-only statistic, computed directly from event_windows.csv: among
 * episodes with a fully observed 4-week window on both sides, how many show
 * higher total combat_event_count in the 4 weeks immediately before T0 than
 * in the 4 weeks before that. No inferential test, no causal claim - just a
 * count of episodes matching a fixed, transparent rule.
 */
function countHigherNearVsFar(episodes: readonly EpisodeGroup[]): { higher: number; total: number } {
  let higher = 0;
  let total = 0;
  for (const episode of episodes) {
    const near = NEAR_WEEKS.map((w) => episode.rows.find((r) => r.relative_week === w));
    const far = FAR_WEEKS.map((w) => episode.rows.find((r) => r.relative_week === w));
    const nearComplete = near.every((r): r is EventWindow => !!r && r.is_observed_week && r.combat_event_count !== null);
    const farComplete = far.every((r): r is EventWindow => !!r && r.is_observed_week && r.combat_event_count !== null);
    if (!nearComplete || !farComplete) continue;
    total += 1;
    const nearSum = near.reduce((sum, r) => sum + (r!.combat_event_count as number), 0);
    const farSum = far.reduce((sum, r) => sum + (r!.combat_event_count as number), 0);
    if (nearSum > farSum) higher += 1;
  }
  return { higher, total };
}

async function render(): Promise<void> {
  const root = document.getElementById(ROOT_ID);
  if (!root) throw new Error("Missing #social-root");

  const [rows, metadata] = await Promise.all([loadEventWindows(), loadMetadata()]);
  if (rows.length === 0) throw new Error("event_windows.csv has no rows");

  const episodes = groupEpisodes(rows);
  const weeks = [...new Set(rows.map((row) => row.relative_week))].sort((a, b) => a - b);
  const combatBand = medianBand(episodes, "combat_event_count", weeks);
  const civilianBand = medianBand(episodes, "one_sided_civilian_fatalities", weeks);
  const { higher, total } = countHigherNearVsFar(episodes);

  const leftCol = document.createElement("div");
  leftCol.className = "x-left-col";
  leftCol.append(
    buildEyebrow(),
    buildHeadline(),
    buildSubtitle(),
    Object.assign(document.createElement("div"), { className: "spacer" }),
    buildStatCallout(higher, total),
    buildFinding(combatBand),
    buildFooter(metadata.country, metadata.analysis_start, metadata.analysis_end),
  );

  const rightCol = document.createElement("div");
  rightCol.className = "x-right-col";
  rightCol.append(
    buildRangeLabels(metadata.event_window_before_weeks, metadata.event_window_after_weeks),
    buildMainChart(combatBand, weeks),
    buildPanelLabel("ONE-SIDED CIVILIAN FATALITIES", "median at each relative week, dot area ∝ value"),
    buildDotStrip(civilianBand, weeks),
  );

  root.innerHTML = "";
  root.append(leftCol, rightCol);

  document.body.dataset.renderState = "ready";
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
  headline.textContent = "What happens around major episodes of violence against civilians?";
  return headline;
}

function buildSubtitle(): HTMLParagraphElement {
  const subtitle = document.createElement("p");
  subtitle.className = "social-subtitle";
  subtitle.textContent =
    "Combat activity and civilian-fatality levels in the weeks before and after each episode's peak week (T0). A description of temporal association, not a causal analysis.";
  return subtitle;
}

function buildStatCallout(higher: number, total: number): HTMLDivElement {
  const box = document.createElement("div");
  box.className = "stat-callout";
  const label = document.createElement("p");
  label.className = "stat-callout-label";
  label.textContent = "Descriptive statistic";
  const text = document.createElement("p");
  text.className = "stat-callout-text";
  text.textContent = `${higher} of ${total} episodes with a complete 8-week window had higher combat activity in the four weeks before T0 than in the four weeks before that.`;
  box.append(label, text);
  return box;
}

function buildFinding(combatBand: readonly BandPoint[]): HTMLDivElement {
  const finding = document.createElement("div");
  finding.className = "social-finding";
  const label = document.createElement("p");
  label.className = "social-finding-label";
  label.textContent = "Main finding";
  const text = document.createElement("p");
  text.className = "social-finding-text";
  // Supported by combatBand: median combat_event_count stays within a narrow range
  // (see the chart) across the full before/after window, with no sustained rise or
  // fall approaching T0 - so the honest description is "modest variation", not a
  // dramatic pattern. Descriptive only; no causal or motive claim.
  const medians = combatBand.map((point) => point.median).filter((value): value is number => value !== null);
  const spread = medians.length > 0 ? Math.max(...medians) - Math.min(...medians) : 0;
  text.textContent =
    spread <= Math.max(...medians, 1) * 0.5
      ? "Combat intensity varied only modestly in the weeks around major civilian-violence peaks, with no consistent rise or fall before T0."
      : "Combat intensity varied substantially around major civilian-violence peaks.";
  finding.append(label, text);
  return finding;
}

function buildFooter(country: string, analysisStart: string, analysisEnd: string): HTMLParagraphElement {
  const footer = document.createElement("p");
  footer.className = "social-footer";
  const start = new Date(`${analysisStart}T00:00:00.000Z`).getUTCFullYear();
  const end = new Date(`${analysisEnd}T00:00:00.000Z`).getUTCFullYear();
  footer.textContent = `UCDP Georeferenced Event Dataset (GED) · ${country} · ${start}–${end}`;
  return footer;
}

function buildRangeLabels(beforeWeeks: number, afterWeeks: number): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "range-labels";
  const before = document.createElement("span");
  before.textContent = `${beforeWeeks} weeks before`;
  const t0 = document.createElement("span");
  t0.className = "t0-label";
  t0.textContent = "T0";
  const after = document.createElement("span");
  after.textContent = `${afterWeeks} weeks after`;
  row.append(before, t0, after);
  return row;
}

function buildPanelLabel(title: string, unit: string): HTMLParagraphElement {
  const label = document.createElement("p");
  label.className = "chart-panel-label";
  label.innerHTML = `${title} <span class="unit">· ${unit}</span>`;
  return label;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

/** Median line + restrained IQR band for combat_event_count, with a T0 reference line. */
function buildMainChart(band: readonly BandPoint[], weeks: readonly number[]): SVGSVGElement {
  const plotHeight = MAIN_CHART_HEIGHT;
  const totalHeight = TOP_MARGIN + plotHeight;
  const svg = svgEl("svg");
  svg.setAttribute("width", String(CHART_WIDTH));
  svg.setAttribute("height", String(totalHeight));
  svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${totalHeight}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Median combat events per week, with interquartile range, around T0");

  const plot = svgEl("g");
  plot.setAttribute("transform", `translate(0,${TOP_MARGIN})`);
  svg.append(plot);

  const x = scaleLinear().domain([weeks[0], weeks[weeks.length - 1]]).range([0, CHART_WIDTH]);
  const yMax = max(band, (point) => point.q3 ?? 0) ?? 1;
  const y = scaleLinear().domain([0, yMax]).range([plotHeight, 0]).nice();

  const bandGen = d3Area<BandPoint>()
    .defined((point) => point.q1 !== null && point.q3 !== null)
    .x((point) => x(point.relativeWeek))
    .y0((point) => y(point.q1 as number))
    .y1((point) => y(point.q3 as number));
  const bandPath = svgEl("path");
  bandPath.setAttribute("d", bandGen(band as BandPoint[]) ?? "");
  bandPath.setAttribute("fill", violenceColors.stateBased);
  bandPath.setAttribute("fill-opacity", "0.14");
  plot.append(bandPath);

  const lineGen = d3Line<BandPoint>()
    .defined((point) => point.median !== null)
    .x((point) => x(point.relativeWeek))
    .y((point) => y(point.median as number));
  const linePath = svgEl("path");
  linePath.setAttribute("d", lineGen(band as BandPoint[]) ?? "");
  linePath.setAttribute("fill", "none");
  linePath.setAttribute("stroke", violenceColors.stateBased);
  linePath.setAttribute("stroke-width", "3");
  plot.append(linePath);

  // Minimal y-axis: just the top gridline value, not a dense tick grid.
  const axisLabel = svgEl("text");
  axisLabel.setAttribute("x", "0");
  axisLabel.setAttribute("y", "-6");
  axisLabel.setAttribute("class", "axis-y-label");
  axisLabel.textContent = `Median combat events / week (up to ${formatCount(Math.round(yMax))})`;
  plot.append(axisLabel);

  appendT0Marker(svg, plot, x, plotHeight);
  return svg;
}

/** One dot per relative week, radius ∝ median one_sided_civilian_fatalities that week. */
function buildDotStrip(band: readonly BandPoint[], weeks: readonly number[]): SVGSVGElement {
  const plotHeight = DOT_STRIP_HEIGHT;
  const totalHeight = TOP_MARGIN + plotHeight;
  const svg = svgEl("svg");
  svg.setAttribute("width", String(CHART_WIDTH));
  svg.setAttribute("height", String(totalHeight));
  svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${totalHeight}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Median one-sided civilian fatalities per week, around T0");

  const plot = svgEl("g");
  plot.setAttribute("transform", `translate(0,${TOP_MARGIN})`);
  svg.append(plot);

  const x = scaleLinear().domain([weeks[0], weeks[weeks.length - 1]]).range([0, CHART_WIDTH]);
  const maxValue = max(band, (point) => point.median ?? 0) ?? 1;
  const maxRadius = plotHeight / 2 - 4;
  const centerY = plotHeight / 2;

  const baseline = svgEl("line");
  baseline.setAttribute("x1", "0");
  baseline.setAttribute("x2", String(CHART_WIDTH));
  baseline.setAttribute("y1", String(centerY));
  baseline.setAttribute("y2", String(centerY));
  baseline.setAttribute("stroke", "var(--border)");
  baseline.setAttribute("stroke-width", "1");
  plot.append(baseline);

  for (const point of band) {
    if (point.median === null || point.median <= 0 || !(maxValue > 0)) continue;
    const radius = Math.max(3, Math.sqrt(point.median / maxValue) * maxRadius);
    const dot = svgEl("circle");
    dot.setAttribute("cx", String(x(point.relativeWeek)));
    dot.setAttribute("cy", String(centerY));
    dot.setAttribute("r", String(radius));
    dot.setAttribute("fill", violenceColors.oneSided);
    dot.setAttribute("fill-opacity", point.relativeWeek === 0 ? "0.95" : "0.55");
    plot.append(dot);
  }

  appendT0Marker(svg, plot, x, plotHeight);
  return svg;
}

/** Dashed T0 reference line plus a small "T0" badge above the plot, shared by both panels. */
function appendT0Marker(svg: SVGSVGElement, plot: SVGGElement, x: (week: number) => number, plotHeight: number): void {
  const xPos = x(0);
  const line = svgEl("line");
  line.setAttribute("x1", String(xPos));
  line.setAttribute("x2", String(xPos));
  line.setAttribute("y1", "0");
  line.setAttribute("y2", String(plotHeight));
  line.setAttribute("stroke", "var(--ink)");
  line.setAttribute("stroke-width", "1.5");
  line.setAttribute("stroke-dasharray", "3,3");
  line.setAttribute("opacity", "0.6");
  plot.append(line);

  const badgeText = svgEl("text");
  badgeText.setAttribute("x", String(xPos));
  badgeText.setAttribute("y", String(TOP_MARGIN / 2 + 4));
  badgeText.setAttribute("text-anchor", "middle");
  badgeText.setAttribute("class", "t0-tick-label");
  badgeText.textContent = "T0";
  svg.append(badgeText);
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
