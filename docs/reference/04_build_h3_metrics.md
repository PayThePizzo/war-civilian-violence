# `04_build_h3_metrics.py`

Build weekly H3 spatial aggregations for the conflict map — **Web 2: WHERE?**

## Responsibility

Aggregate spatially eligible events into H3 cells, producing one row per `actor × week × H3 cell` (plus the `__ALL__` conflict-wide series).

## Input

```text
data/processed/events_clean.parquet
data/processed/actor_events.parquet
```

```yaml
spatial:
  h3_resolution: 5
```

## Spatial eligibility

This is the **only** stage in the pipeline that drops rows on `spatial_eligible` — every other stage retains spatially ineligible rows. Filters both inputs to `spatial_eligible == True` before H3 assignment.

## Transformations

1. Filter both datasets to `spatial_eligible == True`.
2. Generate `h3_id = h3.latlng_to_cell(latitude, longitude, resolution)` per row.
3. Validate each generated cell (`h3.is_valid_cell`) and that its resolution matches `config.spatial.h3_resolution`; hard-fail otherwise.
4. Compute H3 cell centers (`h3_center_lat`, `h3_center_lon`).
5. **Global aggregation** — from `events_clean`, grouped by `(week_start, h3_id)`, `actor_id = "__ALL__"`.
6. **Actor aggregation** — from `actor_events`, grouped by `(actor_id, week_start, h3_id)`.
7. Compute event/fatality counts per group.
8. `civilian_fatality_share = civilian_fatalities / best_fatalities` and `one_sided_civilian_fatality_share = one_sided_civilian_fatalities / best_fatalities`, both `0` when `best_fatalities == 0`.
9. Validate that, per week, `sum(__ALL__.event_count across H3 cells)` equals the number of spatially eligible unique events for that week.

Unlike [`03_build_weekly_metrics.py`](03_build_weekly_metrics.md), **no** complete week × H3-cell grid is built — a dense grid would be dominated by empty (week, cell) pairs and bloat the output. Only combinations with at least one event appear.

## Output

```text
data/derived/h3_weekly_metrics.csv
```

Fields: `week_start`, `actor_id`, `actor_name`, `h3_id`, `h3_resolution`, `h3_center_lat`, `h3_center_lon`, `event_count`, `state_based_event_count`, `non_state_event_count`, `one_sided_event_count`, `combat_event_count`, `combatant_fatalities`, `civilian_fatalities`, `one_sided_civilian_fatalities`, `best_fatalities`, `one_sided_event_share`, `civilian_fatality_share`, `one_sided_civilian_fatality_share`.

## Invariants

```text
h3_id is valid; resolution(h3_id) == configured resolution
event_count >= 0
0 <= all shares <= 1
sum(__ALL__ event_count across H3 cells) == spatially eligible unique events for that week
```

## Implementation notes

Structured as `load_events_clean`, `load_actor_events`, `validate_inputs`, `filter_spatially_eligible`, `compute_week_start`, `assign_h3_cells`, `build_h3_centers`, `build_canonical_actor_names`, `add_shares`, `aggregate_global`, `aggregate_actors`, `validate_h3_metrics`, `finalize`, `print_summary`, `main`. Uses the `h3` package v4 API (`h3.latlng_to_cell`, `h3.is_valid_cell`, `h3.get_resolution`, `h3.cell_to_latlng`). Cell centers are computed once per distinct `h3_id`, not per row. Actor display names are re-derived in-script, same rationale as [`03_build_weekly_metrics.py`](03_build_weekly_metrics.md).

**Status:** implemented (546 lines), not yet run against the raw GED file.
