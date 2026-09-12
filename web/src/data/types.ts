/**
 * Frontend data contracts with the original dataset column names.
 * CSV parsers convert dates to Date, numeric fields to number, boolean fields
 * to boolean, and missing metric values to null. Metadata retains JSON types.
 */

/** One actor/week row, including the synthetic __ALL__ conflict-wide series. */
export interface WeeklyMetric {
  week_start: Date;

  actor_id: string;
  actor_name: string;

  event_count: number;

  state_based_event_count: number;
  non_state_event_count: number;
  one_sided_event_count: number;
  combat_event_count: number;

  combatant_fatalities: number;
  /** Null for __ALL__, where actor-specific losses are not applicable. */
  actor_deaths_suffered: number | null;

  civilian_fatalities: number;
  one_sided_civilian_fatalities: number;

  best_fatalities: number;
  low_fatalities: number;
  high_fatalities: number;

  active_location_count: number;
  one_sided_event_share: number;
}

/** One actor/week/H3-cell row, with spatial aggregation already performed. */
export interface H3Metric {
  week_start: Date;

  actor_id: string;
  actor_name: string;

  h3_id: string;
  h3_resolution: number;
  h3_center_lat: number;
  h3_center_lon: number;

  event_count: number;

  state_based_event_count: number;
  non_state_event_count: number;
  one_sided_event_count: number;
  combat_event_count: number;

  combatant_fatalities: number;
  civilian_fatalities: number;
  one_sided_civilian_fatalities: number;

  best_fatalities: number;

  one_sided_event_share: number;
  civilian_fatality_share: number;
  one_sided_civilian_fatality_share: number;
}

/** One armed actor's profile across the full analysis period. */
export interface ActorProfile {
  actor_id: string;
  actor_name: string;

  first_event_date: Date;
  last_event_date: Date;
  active_week_count: number;

  total_event_count: number;
  combat_event_count: number;
  one_sided_event_count: number;

  combatant_fatalities_in_involved_events: number;
  actor_deaths_suffered: number;

  civilian_fatalities_in_involved_events: number;
  one_sided_civilian_fatalities: number;

  one_sided_event_share: number;

  active_location_count: number;
  active_h3_cell_count: number;

  events_per_active_week: number;
  one_sided_events_per_active_week: number;
  civilian_fatalities_per_active_week: number;

  eligible_for_web3: boolean;
}

/**
 * One relative week of a pipeline-selected episode.
 * Metrics are null for unobserved weeks outside the analysis period;
 * zero denotes observed inactivity.
 */
export interface EventWindow {
  episode_id: string;

  actor_id: string;
  actor_name: string;

  peak_rank: number;
  t0_date: Date;
  peak_metric_value: number;

  relative_week: number;
  calendar_week: Date;
  is_observed_week: boolean;

  combat_event_count: number | null;
  combatant_fatalities: number | null;
  actor_deaths_suffered: number | null;

  one_sided_event_count: number | null;
  one_sided_civilian_fatalities: number | null;
  civilian_fatalities: number | null;

  active_location_count: number | null;
}

/** Frontend-facing metadata.json; analysis dates are ISO YYYY-MM-DD strings. */
export interface ProjectMetadata {
  country: string;

  analysis_start: string;
  analysis_end: string;

  temporal_resolution: string;
  week_start: string;

  h3_resolution: number;

  event_window_before_weeks: number;
  event_window_after_weeks: number;
}

/** All frontend datasets loaded together before initializing the views. */
export interface AppData {
  weeklyMetrics: WeeklyMetric[];
  h3Metrics: H3Metric[];
  actorProfiles: ActorProfile[];
  eventWindows: EventWindow[];
  metadata: ProjectMetadata;
}

/** Display-only H3 totals over the full period, with no single week assigned. */
export type H3OverviewMetric = Omit<H3Metric, "week_start">;
