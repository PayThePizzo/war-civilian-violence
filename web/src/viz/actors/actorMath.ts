/** Pure axis/geometry helpers for ActorParallelCoordinates.ts (WEB.md §25-28), DOM-free so they unit test under plain node:test. */
import { scaleLinear, scaleSymlog } from "d3";
import type { ScaleContinuousNumeric } from "d3";
import type { ActorProfile } from "../../data/types";

export type AxisKey =
  | "combat_event_count"
  | "actor_deaths_suffered"
  | "one_sided_event_count"
  | "one_sided_civilian_fatalities"
  | "one_sided_event_share"
  | "active_h3_cell_count";

export interface AxisDef {
  key: AxisKey;
  label: string;
  scale: "symlog" | "linear";
}

/** Fixed axis set and order (WEB.md §25) - actor-specific metrics, not the generic total fatality count. */
export const AXES: readonly AxisDef[] = [
  { key: "combat_event_count", label: "Combat events", scale: "symlog" },
  { key: "actor_deaths_suffered", label: "Actor deaths", scale: "symlog" },
  { key: "one_sided_event_count", label: "One-sided events", scale: "symlog" },
  { key: "one_sided_civilian_fatalities", label: "Civilian fatalities", scale: "symlog" },
  { key: "one_sided_event_share", label: "One-sided share", scale: "linear" },
  { key: "active_h3_cell_count", label: "Geographic spread", scale: "linear" },
];

/** Human-friendly names for detail-card rows; never surface raw CSV field names in the UI. */
export const METRIC_LABELS = {
  total_event_count: "Total events",
  combat_event_count: "Combat events",
  active_week_count: "Active weeks",
  one_sided_event_count: "One-sided events",
  one_sided_event_share: "One-sided share",
  one_sided_civilian_fatalities: "One-sided civilian fatalities",
  actor_deaths_suffered: "Actor deaths suffered",
  active_h3_cell_count: "Geographic spread",
} as const;

/**
 * One scale per axis, range [height, 0] (SVG y grows downward, so larger values sit higher).
 * Skewed count/fatality axes use scaleSymlog (WEB.md §28); one_sided_event_share is always
 * plotted on its fixed 0-1 domain, never rescaled to the data's observed range.
 */
export function buildAxisScales(profiles: readonly ActorProfile[], height: number): Map<AxisKey, ScaleContinuousNumeric<number, number>> {
  const scales = new Map<AxisKey, ScaleContinuousNumeric<number, number>>();
  for (const axis of AXES) {
    if (axis.key === "one_sided_event_share") {
      scales.set(axis.key, scaleLinear().domain([0, 1]).range([height, 0]));
      continue;
    }
    const max = profiles.reduce((acc, profile) => Math.max(acc, profile[axis.key] as number), 0);
    scales.set(axis.key, scaleSymlog().domain([0, max > 0 ? max : 1]).range([height, 0]));
  }
  return scales;
}

/** Evenly spaced x positions for `count` axes across [0, width]; a single axis sits at x = 0. */
export function axisPositions(count: number, width: number): number[] {
  if (count <= 1) return count === 1 ? [0] : [];
  const step = width / (count - 1);
  return Array.from({ length: count }, (_, index) => index * step);
}

/** One actor's polyline vertices, one per axis, in AXES order. */
export function pointsForProfile(
  profile: ActorProfile,
  scales: ReadonlyMap<AxisKey, ScaleContinuousNumeric<number, number>>,
  positions: readonly number[],
): Array<{ x: number; y: number }> {
  return AXES.map((axis, index) => ({
    x: positions[index],
    y: scales.get(axis.key)!(profile[axis.key] as number),
  }));
}
