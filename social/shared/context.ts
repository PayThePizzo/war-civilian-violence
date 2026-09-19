/**
 * Display-only external context: named real-world events that fall in a given week.
 *
 * NOT a UCDP field and never used in any computation - it only labels a week the pipeline
 * already produced. Temporal coincidence only, never causation. Keep in sync with
 * web/src/data/context.ts.
 */
export interface ExternalContext {
  /** Monday week start, YYYY-MM-DD (same convention as weekly_metrics.csv week_start). */
  weekStart: string;
  label: string;
}

export const EXTERNAL_CONTEXT: readonly ExternalContext[] = [{ weekStart: "2025-10-20", label: "El Fasher massacre" }];

/** The context entry for the week starting on `week`, or null. */
export function contextForWeek(week: Date): ExternalContext | null {
  const key = week.toISOString().slice(0, 10);
  return EXTERNAL_CONTEXT.find((entry) => entry.weekStart === key) ?? null;
}
