/** Pure display selections over loaded data; never modify the source datasets. */
import type {
  ActorProfile,
  AppData,
  EventWindow,
  H3Metric,
  H3OverviewMetric,
  WeeklyMetric,
} from "./types";

const ALL_ACTORS = "__ALL__";
const DEFAULT_EPISODE_LIMIT = 20;

/** Compare identifiers deterministically, independent of the browser locale. */
function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Return an actor's complete timeline, including zero weeks, in date order. */
export function getWeeklyForActor(data: AppData, actorId: string): WeeklyMetric[] {
  // __ALL__ already contains unique event totals; do not sum actor rows.
  return data.weeklyMetrics
    .filter((row) => row.actor_id === actorId)
    .sort((left, right) => left.week_start.getTime() - right.week_start.getTime());
}

/** Select a single actor/week by date value; null leaves week mode unselected. */
export function getH3ForActorAndWeek(
  data: AppData,
  actorId: string,
  week: Date | null,
): H3Metric[] {
  if (week === null) return [];
  const timestamp = week.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new RangeError("week must be a valid Date");
  }
  return data.h3Metrics
    .filter((row) => row.actor_id === actorId && row.week_start.getTime() === timestamp)
    .sort((left, right) => compareIds(left.h3_id, right.h3_id));
}

/** Use pipeline-defined eligibility unless the user enables minor actors. */
export function getActorProfiles(data: AppData, showMinorActors = false): ActorProfile[] {
  return data.actorProfiles.filter((row) => showMinorActors || row.eligible_for_web3);
}

/** Rank existing episodes by peak value, breaking ties by date and episode ID. */
function compareEpisodes(left: EventWindow, right: EventWindow): number {
  return right.peak_metric_value - left.peak_metric_value
    || left.t0_date.getTime() - right.t0_date.getTime()
    || compareIds(left.episode_id, right.episode_id);
}

/**
 * Return every window row for an actor's episodes, in stored peak-rank order.
 * The global selection shows the top 20 actor episodes, as specified for Web 4.
 */
export function getEpisodesForActor(data: AppData, actorId: string): EventWindow[] {
  if (actorId === ALL_ACTORS) return getTopEpisodes(data);
  return data.eventWindows
    .filter((row) => row.actor_id === actorId)
    .sort((left, right) => left.peak_rank - right.peak_rank
      || compareEpisodes(left, right)
      || left.relative_week - right.relative_week);
}

/**
 * Select whole episodes by descending peak magnitude, then return all their
 * window rows in episode/relative-week order. Null boundary metrics are retained.
 */
export function getTopEpisodes(data: AppData, limit = DEFAULT_EPISODE_LIMIT): EventWindow[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError("Episode limit must be a non-negative safe integer");
  }
  if (limit === 0) return [];

  const episodes = new Map<string, EventWindow>();
  for (const row of data.eventWindows) {
    if (row.actor_id !== ALL_ACTORS && !episodes.has(row.episode_id)) {
      episodes.set(row.episode_id, row);
    }
  }
  const selected = new Set(
    [...episodes.values()].sort(compareEpisodes).slice(0, limit).map((row) => row.episode_id),
  );
  return data.eventWindows
    .filter((row) => row.actor_id !== ALL_ACTORS && selected.has(row.episode_id))
    .sort((left, right) => compareEpisodes(left, right) || left.relative_week - right.relative_week);
}

const H3_SUM_FIELDS = [
  "event_count",
  "state_based_event_count",
  "non_state_event_count",
  "one_sided_event_count",
  "combat_event_count",
  "combatant_fatalities",
  "civilian_fatalities",
  "one_sided_civilian_fatalities",
  "best_fatalities",
] as const;

/**
 * Sum one actor's H3 metrics across the full period for overview display only.
 * __ALL__ uses only its existing conflict-wide rows. Shares are ratios of sums,
 * with zero for a zero denominator, rather than averages of weekly shares.
 */
export function aggregateH3Overview(data: AppData, actorId: string): H3OverviewMetric[] {
  const cells = new Map<string, H3OverviewMetric>();
  for (const row of data.h3Metrics) {
    if (row.actor_id !== actorId) continue;

    let cell = cells.get(row.h3_id);
    if (!cell) {
      cell = {
        actor_id: row.actor_id,
        actor_name: row.actor_name,
        h3_id: row.h3_id,
        h3_resolution: row.h3_resolution,
        h3_center_lat: row.h3_center_lat,
        h3_center_lon: row.h3_center_lon,
        event_count: 0,
        state_based_event_count: 0,
        non_state_event_count: 0,
        one_sided_event_count: 0,
        combat_event_count: 0,
        combatant_fatalities: 0,
        civilian_fatalities: 0,
        one_sided_civilian_fatalities: 0,
        best_fatalities: 0,
        one_sided_event_share: 0,
        civilian_fatality_share: 0,
        one_sided_civilian_fatality_share: 0,
      };
      cells.set(row.h3_id, cell);
    }
    for (const field of H3_SUM_FIELDS) cell[field] += row[field];
  }

  for (const cell of cells.values()) {
    cell.one_sided_event_share = cell.event_count === 0
      ? 0 : cell.one_sided_event_count / cell.event_count;
    cell.civilian_fatality_share = cell.best_fatalities === 0
      ? 0 : cell.civilian_fatalities / cell.best_fatalities;
    cell.one_sided_civilian_fatality_share = cell.best_fatalities === 0
      ? 0 : cell.one_sided_civilian_fatalities / cell.best_fatalities;
  }
  return [...cells.values()].sort((left, right) => compareIds(left.h3_id, right.h3_id));
}
