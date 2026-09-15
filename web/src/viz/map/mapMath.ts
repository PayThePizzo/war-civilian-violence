/** Pure geometry/encoding helpers for ConflictMap.ts and H3Layer.ts (WEB.md §16-22), DOM/WebGL-free so they unit test under plain node:test. */
import type { H3Metric, H3OverviewMetric } from "../../data/types";

export type IntensityMetric = "event_count" | "best_fatalities" | "one_sided_civilian_fatalities";
export type ColorMetric = "one_sided_event_share" | "one_sided_civilian_fatality_share";

/** Single source of truth for metric display names, shared by MapControls (option text), the
 * legend, and the map's context label so wording never drifts between them. */
export const INTENSITY_METRIC_LABELS: Record<IntensityMetric, string> = {
  event_count: "Events",
  best_fatalities: "Best fatalities",
  one_sided_civilian_fatalities: "One-sided civilian fatalities",
};

export const COLOR_METRIC_LABELS: Record<ColorMetric, string> = {
  one_sided_event_share: "One-sided event share",
  one_sided_civilian_fatality_share: "One-sided civilian fatality share",
};

const MIN_OPACITY = 0.22;
const MAX_OPACITY = 0.88;
export const MAX_ELEVATION = 20000;

type Cell = Pick<H3Metric | H3OverviewMetric, "h3_center_lat" | "h3_center_lon">;

/** [[minLon, minLat], [maxLon, maxLat]] over cell centers, or null for an empty set. */
export function computeBounds(cells: readonly Cell[]): [[number, number], [number, number]] | null {
  if (cells.length === 0) return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const cell of cells) {
    minLon = Math.min(minLon, cell.h3_center_lon);
    maxLon = Math.max(maxLon, cell.h3_center_lon);
    minLat = Math.min(minLat, cell.h3_center_lat);
    maxLat = Math.max(maxLat, cell.h3_center_lat);
  }
  return [[minLon, minLat], [maxLon, maxLat]];
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Interpolate a fill color between `fromHex` (share = 0) and `toHex` (share = 1);
 * `share` is clamped to [0, 1] so out-of-range or NaN input never produces an invalid color.
 */
export function colorForShare(share: number, fromHex: string, toHex: string): [number, number, number, number] {
  const t = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const [r0, g0, b0] = hexToRgb(fromHex);
  const [r1, g1, b1] = hexToRgb(toHex);
  return [Math.round(r0 + (r1 - r0) * t), Math.round(g0 + (g1 - g0) * t), Math.round(b0 + (b1 - b0) * t), 255];
}

/** Square-root scale (perceptually gentler than linear for skewed counts/fatalities) mapped to [0, MAX_ELEVATION]. */
export function elevationForIntensity(value: number, maxValue: number): number {
  if (!(maxValue > 0) || !(value > 0)) return 0;
  return Math.sqrt(Math.min(1, value / maxValue)) * MAX_ELEVATION;
}

/**
 * Square-root scale mapped to [MIN_OPACITY, MAX_OPACITY]: zero-count cells stay faintly visible
 * rather than invisible, and the busiest cells stop short of full opacity so their white
 * borders (H3Layer's getLineColor) still separate them from equally busy neighbours.
 */
export function opacityForIntensity(value: number, maxValue: number): number {
  if (!(maxValue > 0) || !(value > 0)) return MIN_OPACITY;
  return MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * Math.sqrt(Math.min(1, value / maxValue));
}

/** Distinct observed week_start values for an actor, ascending - the Week-mode stepper's timeline. */
export function observedWeeks(rows: readonly { week_start: Date }[]): Date[] {
  const seen = new Map<number, Date>();
  for (const row of rows) seen.set(row.week_start.getTime(), row.week_start);
  return [...seen.values()].sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Move one step through `weeks` from `current` (null starts before the first week).
 * Clamps at either end instead of wrapping, so repeated stepping settles rather than cycling.
 */
export function stepWeek(weeks: readonly Date[], current: Date | null, direction: -1 | 1): Date | null {
  if (weeks.length === 0) return null;
  if (current === null) return direction > 0 ? weeks[0] : weeks[weeks.length - 1];
  const index = weeks.findIndex((week) => week.getTime() === current.getTime());
  const from = index === -1 ? (direction > 0 ? -1 : weeks.length) : index;
  const next = Math.min(weeks.length - 1, Math.max(0, from + direction));
  return weeks[next];
}
