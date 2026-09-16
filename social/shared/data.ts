/**
 * Fetch and parse the two datasets synced by scripts/sync-data.mjs. Parsing
 * rules mirror web/src/data/parsers.ts (fail loud on schema drift, preserve
 * null vs. 0) but are consolidated into one file since social/ only ever
 * reads two CSVs plus metadata.json.
 */
import { csvParseRows } from "d3";
import type { ActorProfile, EventWindow, H3Metric, ProjectMetadata, SocialData, WeeklyMetric } from "./types";

type CsvRow = Record<string, string | undefined>;
type CsvRowParser<T> = ((row: CsvRow) => T) & { readonly columns: readonly string[] };

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

function parseString(value: unknown, field = "value"): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field}: expected a non-empty string`);
  }
  return value;
}

function parseNumber(value: unknown, field = "value"): number {
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

function parseNullableNumber(value: unknown, field = "value"): number | null {
  if (typeof value === "string" && /^(?:na|n\/a|nan|null)?$/i.test(value.trim())) {
    return null;
  }
  return parseNumber(value, field);
}

function parseBoolean(value: unknown, field = "value"): boolean {
  const text = parseString(value, field).trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  throw new Error(`${field}: expected True or False, received ${JSON.stringify(value)}`);
}

function parseDate(value: unknown, field = "value"): Date {
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

const parseWeeklyMetric = createRowParser<WeeklyMetric>({
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

const parseActorProfile = createRowParser<ActorProfile>({
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

const parseH3Metric = createRowParser<H3Metric>({
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

const parseEventWindow = createRowParser<EventWindow>({
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

function parseProjectMetadata(value: unknown): ProjectMetadata {
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

/** Fetch a public asset by absolute path so nested post pages resolve it the same way. */
async function loadFile<T>(filename: string, decode: (text: string) => T): Promise<T> {
  const url = `/data/${filename}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }
    if (response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      throw new Error("Received HTML instead of a dataset; check that sync-data has run");
    }
    return decode(await response.text());
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Unable to load ${filename} (${url}): ${message}`, { cause });
  }
}

function loadCsv<T extends object>(filename: string, parseRow: CsvRowParser<T>): Promise<T[]> {
  return loadFile(filename, (text) => {
    const [columns, ...rows] = csvParseRows(text.replace(/^﻿/, ""));
    if (!columns || columns.every((column) => column.trim() === "")) {
      throw new Error("CSV is empty; expected a header row");
    }
    if (new Set(columns).size !== columns.length) {
      throw new Error("CSV contains duplicate column names");
    }
    const missing = parseRow.columns.filter((column) => !columns.includes(column));
    if (missing.length > 0) {
      throw new Error(`CSV is missing required columns: ${missing.join(", ")}`);
    }
    return rows.map((values, index) => {
      try {
        if (values.length !== columns.length) {
          throw new Error(`Expected ${columns.length} fields, received ${values.length}`);
        }
        return parseRow(Object.fromEntries(columns.map((column, i) => [column, values[i]])));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`CSV data row ${index + 1}: ${message}`, { cause });
      }
    });
  });
}

/** Load both datasets the two Instagram posts need, concurrently; reject if any request or parser fails. */
export async function loadSocialData(): Promise<SocialData> {
  const [weeklyMetrics, actorProfiles, metadata] = await Promise.all([
    loadCsv("weekly_metrics.csv", parseWeeklyMetric),
    loadCsv("actor_profiles.csv", parseActorProfile),
    loadFile("metadata.json", (text) => parseProjectMetadata(JSON.parse(text))),
  ]);
  return { weeklyMetrics, actorProfiles, metadata };
}

/** Load frontend metadata.json alone, for posts that don't need the full SocialData bundle. */
export function loadMetadata(): Promise<ProjectMetadata> {
  return loadFile("metadata.json", (text) => parseProjectMetadata(JSON.parse(text)));
}

/** Load pipeline-selected episodes, preserving null metrics in unobserved weeks (never zero-filled). */
export function loadEventWindows(): Promise<EventWindow[]> {
  return loadCsv("event_windows.csv", parseEventWindow);
}

/** Load the precomputed actor/week/H3-cell metrics; __ALL__ rows come straight from the pipeline. */
export function loadH3Metrics(): Promise<H3Metric[]> {
  return loadCsv("h3_weekly_metrics.csv", parseH3Metric);
}
