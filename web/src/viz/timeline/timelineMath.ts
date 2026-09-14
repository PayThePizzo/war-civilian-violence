/** Pure data/geometry helpers for Timeline.ts (WEB.md §10-15), kept DOM-free so they unit test under plain node:test. */
import { bisector } from "d3";
import type { WeeklyMetric } from "../../data/types";

export type DisplayMode = "absolute" | "composition";
export type EventPoint = { date: Date; y0: number; y1: number };

const bisectWeek = bisector((row: WeeklyMetric) => row.week_start).left;

/** Find the row whose week_start is closest to `target`; rows must be date-sorted. */
export function nearestRow(rows: WeeklyMetric[], target: Date): WeeklyMetric | null {
  if (rows.length === 0) return null;
  const index = bisectWeek(rows, target, 1);
  const before = rows[index - 1];
  const after = rows[index];
  if (!after) return before;
  if (!before) return after;
  const targetMs = target.getTime();
  return targetMs - before.week_start.getTime() <= after.week_start.getTime() - targetMs ? before : after;
}

/** Cumulative layer per series key; composition mode expresses each week as a fraction of that week's total. */
export function buildEventLayers(
  rows: WeeklyMetric[],
  mode: DisplayMode,
  seriesKeys: ReadonlyArray<keyof WeeklyMetric>,
): EventPoint[][] {
  const layers: EventPoint[][] = seriesKeys.map(() => []);
  for (const row of rows) {
    const values = seriesKeys.map((key) => row[key] as number);
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

/**
 * Clamp a candidate zoom domain to the full data extent, discarding it (returning `full`)
 * if it is degenerate (non-finite, reversed, or collapsed to a single instant).
 */
export function clampZoomDomain(candidate: [Date, Date], full: [Date, Date]): [Date, Date] {
  const [fullStart, fullEnd] = full;
  let start = Math.max(fullStart.getTime(), Math.min(candidate[0].getTime(), candidate[1].getTime()));
  let end = Math.min(fullEnd.getTime(), Math.max(candidate[0].getTime(), candidate[1].getTime()));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return full;
  return [new Date(start), new Date(end)];
}
