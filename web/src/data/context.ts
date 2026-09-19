/**
 * Display-only external context: named real-world events that fall in a given week.
 *
 * These are NOT UCDP fields and never feed any computation - they only label a week the pipeline
 * already produced, so a reader knows what a spike coincides with. They describe temporal
 * coincidence only, never causation. Keep in sync with social/shared/context.ts.
 */
import type { TimelineAnnotation } from "../viz/timeline/timelineMath";

export interface ExternalContext {
  /** Monday week start, YYYY-MM-DD (same convention as weekly_metrics.csv week_start). */
  weekStart: string;
  label: string;
}

export const EXTERNAL_CONTEXT: readonly ExternalContext[] = [{ weekStart: "2025-10-20", label: "El Fasher massacre" }];

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/** The context entry for the week starting on `week`, or null. */
export function contextForWeek(week: Date): ExternalContext | null {
  const key = isoDay(week);
  return EXTERNAL_CONTEXT.find((entry) => entry.weekStart === key) ?? null;
}

/** Timeline markers for every context entry. */
export function contextAnnotations(): TimelineAnnotation[] {
  return EXTERNAL_CONTEXT.map((entry) => ({ week: new Date(`${entry.weekStart}T00:00:00.000Z`), label: entry.label }));
}
