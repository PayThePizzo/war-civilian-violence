/** Centralized fetching for the five generated frontend datasets. */
import { csvParseRows } from "d3";
import {
  parseActorProfile,
  parseEventWindow,
  parseH3Metric,
  parseProjectMetadata,
  parseWeeklyMetric,
} from "./parsers";
import type { CsvRowParser } from "./parsers";
import type {
  ActorProfile,
  AppData,
  EventWindow,
  H3Metric,
  ProjectMetadata,
  WeeklyMetric,
} from "./types";

/** Fetch and decode a public asset, attaching its filename to any failure. */
async function loadFile<T>(filename: string, decode: (text: string) => T): Promise<T> {
  // Vite supplies '/' in development and the configured base for deployment.
  const url = `${import.meta.env.BASE_URL}data/${filename}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }
    // A static host may return its HTML fallback with status 200 for a missing asset.
    if (response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      throw new Error("Received HTML instead of a dataset; check that sync-data has run");
    }
    return decode(await response.text());
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Unable to load ${filename} (${url}): ${message}`, { cause });
  }
}

/** Decode CSV with D3 so quoted commas and newlines are preserved. */
function loadCsv<T extends object>(filename: string, parseRow: CsvRowParser<T>): Promise<T[]> {
  return loadFile(filename, (text) => {
    const [columns, ...rows] = csvParseRows(text.replace(/^\uFEFF/, ""));
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
    // Header-only datasets are valid, for example when no episodes were found.
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

/** Load the complete weekly table, including __ALL__ and zero-filled weeks. */
export function loadWeeklyMetrics(): Promise<WeeklyMetric[]> {
  return loadCsv("weekly_metrics.csv", parseWeeklyMetric);
}

/** Load the precomputed actor/week/H3-cell metrics. */
export function loadH3Metrics(): Promise<H3Metric[]> {
  return loadCsv("h3_weekly_metrics.csv", parseH3Metric);
}

/** Load every actor profile; display eligibility is applied by selectors. */
export function loadActorProfiles(): Promise<ActorProfile[]> {
  return loadCsv("actor_profiles.csv", parseActorProfile);
}

/** Load pipeline-selected episodes, preserving null metrics in unobserved weeks. */
export function loadEventWindows(): Promise<EventWindow[]> {
  return loadCsv("event_windows.csv", parseEventWindow);
}

/** Load and validate frontend metadata while retaining its JSON field types. */
export function loadMetadata(): Promise<ProjectMetadata> {
  return loadFile("metadata.json", (text) => parseProjectMetadata(JSON.parse(text)));
}

/** Fetch all five datasets concurrently; reject if any request or parser fails. */
export async function loadAppData(): Promise<AppData> {
  const [weekly, h3, actors, windows, metadata] = await Promise.all([
    loadWeeklyMetrics(),
    loadH3Metrics(),
    loadActorProfiles(),
    loadEventWindows(),
    loadMetadata(),
  ]);

  return {
    weeklyMetrics: weekly,
    h3Metrics: h3,
    actorProfiles: actors,
    eventWindows: windows,
    metadata,
  };
}
