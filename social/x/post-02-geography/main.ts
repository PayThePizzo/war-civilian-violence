/**
 * X post 2 — "Do combat and civilian targeting occupy the same space?"
 * Static, non-interactive counterpart of Web 2's MapLibre/deck.gl H3 map
 * (web/src/viz/map/ConflictMap.ts, VIZ.md §2): same __ALL__ h3_weekly_metrics
 * rows, same h3_center_lat/h3_center_lon positions (never recomputed), and
 * the same combat->one-sided color encoding, but rendered as a static SVG
 * choropleth with d3-geo instead of an interactive WebGL basemap. Each cell
 * is drawn as a uniform-size hexagon at its true projected center - not its
 * literal H3 boundary - so a dense resolution-5 grid never produces the
 * overlapping, irregular shapes a naive true-boundary render does; position
 * is exact, only the display size is normalized for legibility. No zoom, no
 * OSM tiles, no 3D extrusion.
 */
import { geoMercator, geoPath, max as d3max } from "d3";
import { feature as topojsonFeature } from "topojson-client";
// Real Natural Earth-derived country boundaries (public domain, via world-atlas), not a
// fabricated shape: 50m resolution is the sharpest bundled tier, fine for a static export.
import countriesTopology from "world-atlas/countries-50m.json" with { type: "json" };
import type { Topology } from "topojson-specification";
import { loadH3Metrics, loadMetadata } from "../../shared/data";
import { violenceColors } from "../../shared/colors";
import { formatCount, formatMonthYear, formatPercent } from "../../shared/format";
import type { H3Metric } from "../../shared/types";

// ISO 3166-1 numeric code for Sudan, as used by world-atlas's TopoJSON feature ids.
const SUDAN_NUMERIC_ID = "729";

function loadSudanBoundary(): GeoJSON.Feature {
  const topology = countriesTopology as unknown as Topology;
  const countries = topojsonFeature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
  const sudan = countries.features.find((f) => String(f.id) === SUDAN_NUMERIC_ID);
  if (!sudan) throw new Error(`Sudan (id ${SUDAN_NUMERIC_ID}) not found in world-atlas countries topology`);
  return sudan;
}

const ROOT_ID = "social-root";
const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_OPACITY = 0.4;
const MAX_OPACITY = 1;

interface CellAggregate {
  h3Id: string;
  lat: number;
  lon: number;
  eventCount: number;
  oneSidedEventCount: number;
  oneSidedCivilianFatalities: number;
  oneSidedEventShare: number;
}

/**
 * Sum additive weekly metrics per H3 cell across the full analysis period,
 * then recompute the share from the summed counts - never averaged across
 * weeks (DATA_FILES.md's rule for full-period H3 shares, mirroring
 * aggregateH3Overview in web/src/data/selectors.ts).
 */
function aggregateFullPeriod(rows: readonly H3Metric[]): CellAggregate[] {
  const byCell = new Map<
    string,
    { lat: number; lon: number; eventCount: number; oneSidedEventCount: number; oneSidedCivilianFatalities: number }
  >();
  for (const row of rows) {
    let cell = byCell.get(row.h3_id);
    if (!cell) {
      cell = { lat: row.h3_center_lat, lon: row.h3_center_lon, eventCount: 0, oneSidedEventCount: 0, oneSidedCivilianFatalities: 0 };
      byCell.set(row.h3_id, cell);
    }
    cell.eventCount += row.event_count;
    cell.oneSidedEventCount += row.one_sided_event_count;
    cell.oneSidedCivilianFatalities += row.one_sided_civilian_fatalities;
  }
  return [...byCell.entries()].map(([h3Id, cell]) => ({
    h3Id,
    lat: cell.lat,
    lon: cell.lon,
    eventCount: cell.eventCount,
    oneSidedEventCount: cell.oneSidedEventCount,
    oneSidedCivilianFatalities: cell.oneSidedCivilianFatalities,
    oneSidedEventShare: cell.eventCount > 0 ? cell.oneSidedEventCount / cell.eventCount : 0,
  }));
}

interface Callout {
  rank: number;
  cell: CellAggregate;
  label: string;
  text: string;
}

/**
 * Deterministic, display-only callout rule (no invented place names - cells
 * are identified only by their own values, never a fabricated location):
 * 1. "Highest one-sided share" - restrict to cells at or above the 90th
 *    percentile of event_count (an activity floor, so a 2-event cell can
 *    never qualify just because its share reads 100%), then take the
 *    highest one_sided_event_share among them.
 * 2. "Highest civilian toll" - the single cell with the largest
 *    one_sided_civilian_fatalities across all cells, skipped if it is the
 *    same cell already picked in step 1.
 */
function selectCallouts(cells: readonly CellAggregate[]): Callout[] {
  const sortedCounts = cells.map((c) => c.eventCount).sort((a, b) => a - b);
  const p90Index = Math.floor(sortedCounts.length * 0.9);
  const activityFloor = sortedCounts[Math.min(p90Index, sortedCounts.length - 1)];

  const active = cells.filter((c) => c.eventCount >= activityFloor);
  const highestShare = active.slice().sort((a, b) => b.oneSidedEventShare - a.oneSidedEventShare)[0];
  const highestFatalities = cells.slice().sort((a, b) => b.oneSidedCivilianFatalities - a.oneSidedCivilianFatalities)[0];

  const picked: CellAggregate[] = [highestShare];
  if (highestFatalities && highestFatalities.h3Id !== highestShare.h3Id) picked.push(highestFatalities);

  const labels = ["High one-sided share", "High activity"];
  return picked.map((cell, index) => ({
    rank: index + 1,
    cell,
    label: labels[index],
    text: `${formatCount(Math.round(cell.eventCount))} events · ${formatPercent(cell.oneSidedEventShare)} one-sided`,
  }));
}

async function render(): Promise<void> {
  const root = document.getElementById(ROOT_ID);
  if (!root) throw new Error("Missing #social-root");

  const [h3Rows, metadata] = await Promise.all([loadH3Metrics(), loadMetadata()]);
  // __ALL__ rows are read directly from h3_weekly_metrics.csv, never summed from
  // actor rows - see CLAUDE.md's double-counting rule and DATA_FILES.md §6.
  const allRows = h3Rows.filter((row) => row.actor_id === "__ALL__");
  if (allRows.length === 0) throw new Error("No __ALL__ rows in h3_weekly_metrics.csv");

  const cells = aggregateFullPeriod(allRows);
  const callouts = selectCallouts(cells);

  const leftCol = document.createElement("div");
  leftCol.className = "x-left-col";
  leftCol.append(
    buildEyebrow(),
    buildHeadline(),
    buildSubtitle(),
    buildLegend(),
    buildCalloutList(callouts),
    Object.assign(document.createElement("div"), { className: "spacer" }),
    buildFinding(),
    buildFooter(metadata.country, metadata.analysis_start, metadata.analysis_end),
  );

  const rightCol = document.createElement("div");
  rightCol.className = "x-right-col";
  const mapFrame = document.createElement("div");
  mapFrame.className = "map-frame";
  mapFrame.append(buildMap(cells, callouts));
  rightCol.append(mapFrame);

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
  headline.textContent = "Combat and civilian targeting do not occupy space in the same way";
  return headline;
}

function buildSubtitle(): HTMLParagraphElement {
  const subtitle = document.createElement("p");
  subtitle.className = "social-subtitle";
  subtitle.textContent = "Each hexagon is one H3 cell, aggregated across the full analysis period.";
  return subtitle;
}

function legendRow(title: string, gradient: string, leftLabel: string, rightLabel: string): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "legend-row";

  const titleEl = document.createElement("p");
  titleEl.className = "legend-title";
  titleEl.textContent = title;

  const bar = document.createElement("div");
  bar.className = "legend-gradient";
  bar.style.background = gradient;

  const labels = document.createElement("div");
  labels.className = "legend-labels";
  const left = document.createElement("span");
  left.textContent = leftLabel;
  const right = document.createElement("span");
  right.textContent = rightLabel;
  labels.append(left, right);

  row.append(titleEl, bar, labels);
  return row;
}

function buildLegend(): HTMLDivElement {
  const block = document.createElement("div");
  block.className = "legend-block";

  const colorRow = legendRow(
    "Colour · one-sided event share",
    `linear-gradient(to right, ${violenceColors.stateBased}, ${violenceColors.oneSided})`,
    "Combat-dominated",
    "One-sided-dominated",
  );

  const opacityRow = legendRow(
    "Opacity · recorded event count",
    `linear-gradient(to right, ${violenceColors.oneSided}22, ${violenceColors.oneSided})`,
    "Lower activity",
    "Higher activity",
  );
  opacityRow.classList.add("legend-row-last");

  block.append(colorRow, opacityRow);
  return block;
}

function buildCalloutList(callouts: readonly Callout[]): HTMLDivElement {
  const list = document.createElement("div");
  list.className = "callout-list";
  for (const callout of callouts) {
    const item = document.createElement("div");
    item.className = "callout-item";
    const badge = document.createElement("span");
    badge.className = "callout-item-badge";
    badge.textContent = String(callout.rank);
    const body = document.createElement("div");
    body.className = "callout-item-body";
    const label = document.createElement("p");
    label.className = "callout-item-label";
    label.textContent = callout.label.toUpperCase();
    const value = document.createElement("p");
    value.className = "callout-item-value";
    value.textContent = callout.text;
    body.append(label, value);
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
  // Supported by the plotted cells: the single busiest cell (callout 2, the highest
  // one-sided civilian toll) shows a one-sided share far below the cell singled out
  // in callout 1 - so intensity and one-sided concentration are not the same thing.
  // Descriptive spatial comparison only; no tactical intent or causal claim.
  text.textContent = "High conflict activity did not always coincide with a high share of one-sided violence.";
  finding.append(label, text);
  return finding;
}

function buildFooter(country: string, analysisStart: string, analysisEnd: string): HTMLDivElement {
  const wrap = document.createElement("div");
  const start = new Date(`${analysisStart}T00:00:00.000Z`);
  const end = new Date(`${analysisEnd}T00:00:00.000Z`);
  const footer = document.createElement("p");
  footer.className = "social-footer";
  footer.textContent = `UCDP Georeferenced Event Dataset (GED) · ${country} · ${formatMonthYear(start)}–${formatMonthYear(end)}`;
  const note = document.createElement("p");
  note.className = "social-footer-note";
  note.textContent = "H3 spatial aggregation";
  wrap.append(footer, note);
  return wrap;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Interpolate combat (share=0) -> one-sided (share=1); share clamped so invalid input never breaks the color. */
function colorForShare(share: number): string {
  const t = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const [r0, g0, b0] = hexToRgb(violenceColors.stateBased);
  const [r1, g1, b1] = hexToRgb(violenceColors.oneSided);
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

/** Square-root scale (gentler than linear for skewed counts): low-activity cells stay faint, never invisible. */
function opacityForIntensity(value: number, maxValue: number): number {
  if (!(maxValue > 0) || !(value > 0)) return MIN_OPACITY;
  return MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * Math.sqrt(Math.min(1, value / maxValue));
}

// Matches the right column's actual content box (1600 canvas - 2*64 padding - 460 left
// col - 48 gap = 964 wide; 900 - 2*64 = 772 tall), so the SVG fills .map-frame edge to
// edge instead of being letterboxed by a mismatched viewBox aspect ratio.
const MAP_WIDTH = 964;
const MAP_HEIGHT = 772;

/** Flat-top regular hexagon path centered at (cx, cy) with circumradius r. */
function hexagonPath(cx: number, cy: number, r: number): string {
  const points = [0, 60, 120, 180, 240, 300].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  });
  return `M${points.map((p) => p.join(",")).join("L")}Z`;
}

/** Euclidean distance from each point to its single closest neighbor. */
function nearestNeighborDistances(points: readonly [number, number][]): number[] {
  return points.map(([x1, y1], i) => {
    let min = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const [x2, y2] = points[j];
      const d = Math.hypot(x2 - x1, y2 - y1);
      if (d < min) min = d;
    }
    return min;
  });
}

function buildMap(cells: readonly CellAggregate[], callouts: readonly Callout[]): SVGSVGElement {
  const svg = svgEl("svg");
  svg.setAttribute("width", String(MAP_WIDTH));
  svg.setAttribute("height", String(MAP_HEIGHT));
  svg.setAttribute("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "H3 map of Sudan: hexagon colour shows one-sided event share, opacity shows event intensity");

  const sudanBoundary = loadSudanBoundary();

  const pointFeatures = cells.map((cell) => ({
    type: "Feature" as const,
    properties: { cell },
    geometry: { type: "Point" as const, coordinates: [cell.lon, cell.lat] },
  }));
  // Fit to the real boundary AND the cells' own centers together, not the boundary alone:
  // a handful of recorded events sit right at the coastline in a low-res (50m) polygon, so
  // this guarantees every hexagon stays inside the frame even where the two disagree by a
  // pixel or two, without ever needing to fabricate or adjust the boundary geometry itself.
  const fitCollection = {
    type: "FeatureCollection" as const,
    features: [sudanBoundary, ...pointFeatures],
  };

  // hexRadius below is clamped to a max of 22px, so 34px covers the widest possible
  // hexagon (its circumradius) plus a small buffer - cells never clip at the edge.
  const padding = 34;
  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [MAP_WIDTH - padding, MAP_HEIGHT - padding],
    ],
    fitCollection as never,
  );

  const projected = cells.map((cell) => ({ cell, xy: projection([cell.lon, cell.lat]) as [number, number] }));

  const frame = svgEl("rect");
  frame.setAttribute("x", "0");
  frame.setAttribute("y", "0");
  frame.setAttribute("width", String(MAP_WIDTH));
  frame.setAttribute("height", String(MAP_HEIGHT));
  frame.setAttribute("class", "map-frame-border");
  svg.append(frame);

  const boundaryPath = svgEl("path");
  const pathGenerator = geoPath(projection);
  boundaryPath.setAttribute("d", pathGenerator(sudanBoundary) ?? "");
  boundaryPath.setAttribute("class", "map-country-boundary");
  svg.append(boundaryPath);

  const panelLabel = svgEl("text");
  panelLabel.setAttribute("x", "20");
  panelLabel.setAttribute("y", "34");
  panelLabel.setAttribute("class", "map-panel-label");
  panelLabel.textContent = "SUDAN";
  svg.append(panelLabel);

  const coverageCaption = svgEl("text");
  coverageCaption.setAttribute("x", "20");
  coverageCaption.setAttribute("y", String(MAP_HEIGHT - 18));
  coverageCaption.setAttribute("class", "map-coverage-caption");
  coverageCaption.textContent =
    "Hexagons shown at a uniform display size; position is each cell's true center.";
  svg.append(coverageCaption);

  const maxEventCount = d3max(cells, (c) => c.eventCount) ?? 1;

  // Uniform display size, never a per-cell scale transform: hexRadius is derived from the
  // 10th percentile of nearest-neighbor spacing among all projected centers (a robust
  // "typical tightest packing" figure, insensitive to the handful of outlier pairs a bare
  // minimum would be), then shrunk 12% for a visible gap. This is what keeps hexagons from
  // intersecting even in the densest cluster, while still filling more of the panel than
  // each cell's literal (and here, unused) true H3 boundary would at this zoom level.
  const nnDistances = nearestNeighborDistances(projected.map((p) => p.xy)).sort((a, b) => a - b);
  const spacingIndex = Math.floor(nnDistances.length * 0.35);
  const typicalSpacing = nnDistances[Math.min(spacingIndex, nnDistances.length - 1)] || 16;
  const hexRadius = Math.max(8, Math.min(22, (typicalSpacing / 2) * 0.92));

  const cellGroup = svgEl("g");
  svg.append(cellGroup);
  for (const { cell, xy } of projected) {
    const [cx, cy] = xy;
    const polygon = svgEl("path");
    polygon.setAttribute("class", "map-cell");
    polygon.setAttribute("d", hexagonPath(cx, cy, hexRadius));
    polygon.setAttribute("fill", colorForShare(cell.oneSidedEventShare));
    polygon.setAttribute("fill-opacity", String(opacityForIntensity(cell.eventCount, maxEventCount)));
    cellGroup.append(polygon);
  }

  const badgeGroup = svgEl("g");
  svg.append(badgeGroup);
  for (const callout of callouts) {
    const match = projected.find((p) => p.cell.h3Id === callout.cell.h3Id);
    if (!match) continue;
    const [x, y] = match.xy;
    const badge = svgEl("circle");
    badge.setAttribute("cx", String(x));
    badge.setAttribute("cy", String(y));
    badge.setAttribute("r", "13");
    badge.setAttribute("fill", "var(--ink)");
    badge.setAttribute("stroke", "var(--paper)");
    badge.setAttribute("stroke-width", "2.5");
    badgeGroup.append(badge);

    const badgeText = svgEl("text");
    badgeText.setAttribute("x", String(x));
    badgeText.setAttribute("y", String(y + 4));
    badgeText.setAttribute("text-anchor", "middle");
    badgeText.setAttribute("class", "map-badge-text");
    badgeText.textContent = String(callout.rank);
    badgeGroup.append(badgeText);
  }

  return svg;
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
