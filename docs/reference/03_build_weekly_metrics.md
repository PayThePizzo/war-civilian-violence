# `03_build_weekly_metrics.py`

Build weekly conflict metrics for the temporal visualization - **Web 1: WHEN?**

## Responsibility

Produce one row per `actor × week`, plus a synthetic conflict-wide series `actor_id = "__ALL__"` computed independently of the actor-level rows.

## Input

```text
data/processed/events_clean.parquet
data/processed/actor_events.parquet
```

## Temporal definition

`week_start` is the Monday of the week containing `date_start` (`date_start.to_period("W-SUN").start_time`); weeks run Monday -> Sunday. Not driven by `config.temporal.week_start` - the Monday anchoring is structural.

## Transformations

1. Compute `week_start` for both input datasets.
2. Build a complete weekly grid spanning `analysis.start_date` -> `analysis.end_date`, so weeks with zero events are represented explicitly (not dropped from the timeline).
3. **Global aggregation** - from `events_clean.parquet` only, grouped by `week_start`, emitted as `actor_id = "__ALL__"`, `actor_name = "All actors"`.
4. **Actor aggregation** - from `actor_events.parquet`, grouped by `(actor_id, actor_name, week_start)`. `event_count` uses `nunique(event_id)`, never `len(group)`.
5. `active_location_count` = `nunique(where_coordinates)` over non-null values.
6. `one_sided_event_share = one_sided_event_count / event_count`, defined as `0` when `event_count == 0`.
7. Zero-fill missing actor-week combinations within the observation period.
8. Validate that `__ALL__.event_count` for each week equals the unique-event count in `events_clean.parquet` for that week.

## Output

```text
data/derived/weekly_metrics.csv
```

Fields: `week_start`, `actor_id`, `actor_name`, `event_count`, `state_based_event_count`, `non_state_event_count`, `one_sided_event_count`, `combat_event_count`, `combatant_fatalities`, `actor_deaths_suffered`, `civilian_fatalities`, `one_sided_civilian_fatalities`, `best_fatalities`, `low_fatalities`, `high_fatalities`, `active_location_count`, `one_sided_event_share`.

`actor_deaths_suffered` is `NA` for `actor_id = "__ALL__"` - there is no meaningful "deaths suffered by all actors" aggregate.

## Invariants

```text
event_count >= 0
state_based_event_count + non_state_event_count + one_sided_event_count == event_count
combat_event_count == state_based_event_count + non_state_event_count
0 <= one_sided_event_share <= 1
__ALL__.event_count == unique events_clean.parquet events for that week
```

## Implementation notes

Structured as `load_events_clean`, `load_actor_events`, `validate_inputs`, `compute_week_start`, `build_full_week_grid`, `aggregate_global`, `build_canonical_actor_names`, `aggregate_actors`, `validate_weekly_metrics`, `finalize`, `print_summary`, `main`.

Actor display names are **not** read from `actor_lookup.csv` (not a declared input of this stage) - `build_canonical_actor_names` re-derives a stable `actor_id -> actor_name` mapping in-script using the same most-frequent-name technique as [`02_build_actor_events.py`](02_build_actor_events.md). `validate_weekly_metrics` independently re-derives the `__ALL__` series from `events_clean` as a defense-in-depth check (not a replacement for [`07_validate_outputs.py`](07_validate_outputs.md)).

**Status:** implemented (506 lines), not yet run against the raw GED file.

---

## Loading and validation

::: scripts.03_build_weekly_metrics.load_events_clean

::: scripts.03_build_weekly_metrics.load_actor_events

::: scripts.03_build_weekly_metrics.validate_inputs

## Week grid

::: scripts.03_build_weekly_metrics.compute_week_start

::: scripts.03_build_weekly_metrics.build_full_week_grid

## Aggregation

::: scripts.03_build_weekly_metrics.aggregate_global

::: scripts.03_build_weekly_metrics.build_canonical_actor_names

::: scripts.03_build_weekly_metrics.aggregate_actors

## Finalization and orchestration

::: scripts.03_build_weekly_metrics.validate_weekly_metrics

::: scripts.03_build_weekly_metrics.finalize

::: scripts.03_build_weekly_metrics.print_summary

::: scripts.03_build_weekly_metrics.main
