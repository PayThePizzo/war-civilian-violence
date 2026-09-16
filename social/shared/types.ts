/**
 * Row shapes for the two datasets the Instagram posts consume, copied
 * verbatim from web/src/data/types.ts (field names match DATA_FILES.md
 * exactly). Kept as a subset here - only WeeklyMetric, ActorProfile, and
 * ProjectMetadata - since social/ never loads h3_weekly_metrics.csv or
 * event_windows.csv.
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

/** The two datasets loaded together before rendering either post. */
export interface SocialData {
  weeklyMetrics: WeeklyMetric[];
  actorProfiles: ActorProfile[];
  metadata: ProjectMetadata;
}
