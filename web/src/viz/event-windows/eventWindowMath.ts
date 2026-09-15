/** Pure grouping/statistics/encoding helpers for the Web 4 matrix + summary (WEB.md §32-35), DOM-free so they unit test under plain node:test. */
import type { EventWindow } from "../../data/types";

export type BackgroundMetric = "combat_event_count" | "combatant_fatalities" | "actor_deaths_suffered";

/** Human-friendly names shared by the metric selector, summary caption, and details panel. */
export const BACKGROUND_METRIC_LABELS: Record<BackgroundMetric, string> = {
  combat_event_count: "Combat events",
  combatant_fatalities: "Combatant fatalities",
  actor_deaths_suffered: "Actor deaths suffered",
};

export interface Episode {
  episodeId: string;
  actorId: string;
  actorName: string;
  peakRank: number;
  t0Date: Date;
  rows: EventWindow[];
}

/** Group window rows into episodes, preserving the order episodes first appear in `rows`. */
export function groupEpisodes(rows: readonly EventWindow[]): Episode[] {
  const episodes = new Map<string, Episode>();
  for (const row of rows) {
    let episode = episodes.get(row.episode_id);
    if (!episode) {
      episode = {
        episodeId: row.episode_id,
        actorId: row.actor_id,
        actorName: row.actor_name,
        peakRank: row.peak_rank,
        t0Date: row.t0_date,
        rows: [],
      };
      episodes.set(row.episode_id, episode);
    }
    episode.rows.push(row);
  }
  for (const episode of episodes.values()) {
    episode.rows.sort((left, right) => left.relative_week - right.relative_week);
  }
  return [...episodes.values()];
}

/** Consecutive integer relative weeks from -beforeWeeks to +afterWeeks, inclusive of T0 (0). */
export function relativeWeekRange(beforeWeeks: number, afterWeeks: number): number[] {
  const weeks: number[] = [];
  for (let week = 0 - beforeWeeks; week <= afterWeeks; week++) weeks.push(week);
  return weeks;
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

export interface BandPoint {
  relativeWeek: number;
  median: number | null;
  q1: number | null;
  q3: number | null;
}

/**
 * Per relative-week median and interquartile range of `metric` across episodes.
 * Unobserved weeks (null) are excluded from the statistic entirely, never treated as zero
 * (WEB.md §35); a week with no observed episodes at all yields nulls, not a false zero.
 */
export function medianBand(episodes: readonly Episode[], metric: BackgroundMetric, weeks: readonly number[]): BandPoint[] {
  return weeks.map((relativeWeek) => {
    const values = episodes
      .map((episode) => episode.rows.find((row) => row.relative_week === relativeWeek)?.[metric])
      .filter((value): value is number => value !== null && value !== undefined)
      .sort((a, b) => a - b);
    if (values.length === 0) return { relativeWeek, median: null, q1: null, q3: null };
    return {
      relativeWeek,
      median: quantile(values, 0.5),
      q1: quantile(values, 0.25),
      q3: quantile(values, 0.75),
    };
  });
}

/**
 * White-to-`hex` intensity for a background cell; null (unobserved week) stays null so the
 * caller renders a hatch pattern instead of ever conflating "not observed" with "observed zero".
 */
export function sequentialColor(value: number | null, maxValue: number, hex: string): string | null {
  if (value === null) return null;
  const t = maxValue > 0 ? Math.min(1, Math.max(0, value / maxValue)) : 0;
  const target = Number.parseInt(hex.slice(1), 16);
  const tr = (target >> 16) & 255;
  const tg = (target >> 8) & 255;
  const tb = target & 255;
  const r = Math.round(255 + (tr - 255) * t);
  const g = Math.round(255 + (tg - 255) * t);
  const b = Math.round(255 + (tb - 255) * t);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Sqrt-scaled circle radius for the one_sided_civilian_fatalities overlay; 0 for null or
 * non-positive input (never drawn), and never above `maxRadius` (never fully covers a cell).
 * `minRadius` floors any genuinely positive value so small counts stay visible rather than
 * rounding away to an invisible sliver.
 */
export function circleRadius(value: number | null, maxValue: number, maxRadius: number, minRadius = 0): number {
  if (!(maxValue > 0) || value === null || !(value > 0)) return 0;
  return Math.max(minRadius, Math.sqrt(Math.min(1, value / maxValue)) * maxRadius);
}
