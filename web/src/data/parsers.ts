/** Pure conversions for CSV rows and metadata; fetching belongs in loaders.ts. */
import type {
  ActorProfile,
  EventWindow,
  H3Metric,
  ProjectMetadata,
  WeeklyMetric,
} from "./types";

/** Compatible with the string-valued rows returned by D3's CSV reader. */
export type CsvRow = Record<string, string | undefined>;

/** A row converter and the columns it requires, including for empty datasets. */
export type CsvRowParser<T> = ((row: CsvRow) => T) & {
  readonly columns: readonly string[];
};

/** Keep field conversion and required headers in one exhaustive typed schema. */
function createRowParser<T>(schema: {
  [Field in keyof T]: (value: unknown, field: string) => T[Field];
}): CsvRowParser<T> {
  const fields = Object.keys(schema) as Array<keyof T & string>;
  const parser = (row: CsvRow): T => {
    const result = {} as T;
    for (const field of fields) result[field] = schema[field](row[field], field);
    return result;
  };
  return Object.assign(parser, { columns: Object.freeze(fields) });
}

/** Require a non-empty string without rewriting identifiers or display names. */
export function parseString(value: unknown, field = "value"): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field}: expected a non-empty string`);
  }
  return value;
}

/** Parse a finite decimal number, including scientific notation; never coerce blanks to zero. */
export function parseNumber(value: unknown, field = "value"): number {
  const text = parseString(value, field).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
    throw new Error(`${field}: invalid number ${JSON.stringify(value)}`);
  }
  const number = Number(text);
  if (!Number.isFinite(number)) {
    throw new Error(`${field}: expected a finite number`);
  }
  return number;
}

/** Preserve CSV missing-value markers as null, while rejecting missing columns. */
export function parseNullableNumber(value: unknown, field = "value"): number | null {
  if (typeof value === "string" && /^(?:na|n\/a|nan|null)?$/i.test(value.trim())) {
    return null;
  }
  return parseNumber(value, field);
}

/** Parse explicit true/false text, including the pipeline's True/False spelling. */
export function parseBoolean(value: unknown, field = "value"): boolean {
  const text = parseString(value, field).trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  throw new Error(`${field}: expected True or False, received ${JSON.stringify(value)}`);
}

/** Parse YYYY-MM-DD at midnight UTC, rejecting impossible calendar dates. */
export function parseDate(value: unknown, field = "value"): Date {
  const text = parseString(value, field).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${field}: expected a YYYY-MM-DD date`);
  }
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`${field}: invalid calendar date ${JSON.stringify(value)}`);
  }
  return date;
}

/** Convert one weekly_metrics.csv row without aggregating or filtering it. */
export const parseWeeklyMetric = createRowParser<WeeklyMetric>({
  week_start: parseDate,
  actor_id: parseString,
  actor_name: parseString,
  event_count: parseNumber,
  state_based_event_count: parseNumber,
  non_state_event_count: parseNumber,
  one_sided_event_count: parseNumber,
  combat_event_count: parseNumber,
  combatant_fatalities: parseNumber,
  actor_deaths_suffered: parseNullableNumber,
  civilian_fatalities: parseNumber,
  one_sided_civilian_fatalities: parseNumber,
  best_fatalities: parseNumber,
  low_fatalities: parseNumber,
  high_fatalities: parseNumber,
  active_location_count: parseNumber,
  one_sided_event_share: parseNumber,
});

/** Convert one already aggregated h3_weekly_metrics.csv row. */
export const parseH3Metric = createRowParser<H3Metric>({
  week_start: parseDate,
  actor_id: parseString,
  actor_name: parseString,
  h3_id: parseString,
  h3_resolution: parseNumber,
  h3_center_lat: parseNumber,
  h3_center_lon: parseNumber,
  event_count: parseNumber,
  state_based_event_count: parseNumber,
  non_state_event_count: parseNumber,
  one_sided_event_count: parseNumber,
  combat_event_count: parseNumber,
  combatant_fatalities: parseNumber,
  civilian_fatalities: parseNumber,
  one_sided_civilian_fatalities: parseNumber,
  best_fatalities: parseNumber,
  one_sided_event_share: parseNumber,
  civilian_fatality_share: parseNumber,
  one_sided_civilian_fatality_share: parseNumber,
});

/** Convert one actor_profiles.csv row, preserving pipeline-defined eligibility. */
export const parseActorProfile = createRowParser<ActorProfile>({
  actor_id: parseString,
  actor_name: parseString,
  first_event_date: parseDate,
  last_event_date: parseDate,
  active_week_count: parseNumber,
  total_event_count: parseNumber,
  combat_event_count: parseNumber,
  one_sided_event_count: parseNumber,
  combatant_fatalities_in_involved_events: parseNumber,
  actor_deaths_suffered: parseNumber,
  civilian_fatalities_in_involved_events: parseNumber,
  one_sided_civilian_fatalities: parseNumber,
  one_sided_event_share: parseNumber,
  active_location_count: parseNumber,
  active_h3_cell_count: parseNumber,
  events_per_active_week: parseNumber,
  one_sided_events_per_active_week: parseNumber,
  civilian_fatalities_per_active_week: parseNumber,
  eligible_for_web3: parseBoolean,
});

/** Convert one event_windows.csv row, keeping unobserved metrics null. */
export const parseEventWindow = createRowParser<EventWindow>({
  episode_id: parseString,
  actor_id: parseString,
  actor_name: parseString,
  peak_rank: parseNumber,
  t0_date: parseDate,
  peak_metric_value: parseNumber,
  relative_week: parseNumber,
  calendar_week: parseDate,
  is_observed_week: parseBoolean,
  combat_event_count: parseNullableNumber,
  combatant_fatalities: parseNullableNumber,
  actor_deaths_suffered: parseNullableNumber,
  one_sided_event_count: parseNullableNumber,
  one_sided_civilian_fatalities: parseNullableNumber,
  civilian_fatalities: parseNullableNumber,
  active_location_count: parseNullableNumber,
});

/** Validate an already decoded metadata.json object, retaining its JSON types. */
export function parseProjectMetadata(value: unknown): ProjectMetadata {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("metadata: expected a JSON object");
  }
  const data = value as Record<string, unknown>;
  const analysisStart = parseString(data.analysis_start, "analysis_start");
  const analysisEnd = parseString(data.analysis_end, "analysis_end");
  parseDate(analysisStart, "analysis_start");
  parseDate(analysisEnd, "analysis_end");

  function jsonNumber(field: string): number {
    const number = data[field];
    if (typeof number !== "number" || !Number.isFinite(number)) {
      throw new Error(`${field}: expected a finite JSON number`);
    }
    return number;
  }

  return {
    country: parseString(data.country, "country"),
    analysis_start: analysisStart,
    analysis_end: analysisEnd,
    temporal_resolution: parseString(data.temporal_resolution, "temporal_resolution"),
    week_start: parseString(data.week_start, "week_start"),
    h3_resolution: jsonNumber("h3_resolution"),
    event_window_before_weeks: jsonNumber("event_window_before_weeks"),
    event_window_after_weeks: jsonNumber("event_window_after_weeks"),
  };
}
