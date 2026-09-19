# `05_build_actor_profiles.py`

Build multidimensional violence profiles for armed actors - **Web 3: WHO?**

## Responsibility

Produce one row per canonical armed actor, with consistent temporal, behavioral, fatality, and geographic metrics.

## Input

```text
data/processed/actor_events.parquet
data/processed/actor_lookup.csv
```

```yaml
actors:
  min_events: 5
```

## Transformations

1. Group by `actor_id` (name attached afterward from `actor_lookup.csv`, since that lookup is a declared input here, unlike in scripts 03/04).
2. `first_event_date`, `last_event_date`.
3. `active_week_count = nunique(week_start)`.
4. `total_event_count = nunique(event_id)`.
5. `combat_event_count` / `one_sided_event_count` - unique events where `is_combat` / `is_one_sided`.
6. `combatant_fatalities_in_involved_events` - sum of `combatant_fatalities` over the actor's combat events. **Not** fatalities suffered by the actor.
7. `actor_deaths_suffered` - sum of the actor-specific losses column, kept separate for that purpose.
8. `civilian_fatalities_in_involved_events`, `one_sided_civilian_fatalities`.
9. `one_sided_event_share = one_sided_event_count / total_event_count`.
10. Geographic spread, valid coordinates only, same H3 resolution as [`04_build_h3_metrics.py`](04_build_h3_metrics.md): `active_h3_cell_count = nunique(h3_id)`, `active_location_count = nunique(where_coordinates)`.
11. Rate metrics: `events_per_active_week`, `one_sided_events_per_active_week`, `civilian_fatalities_per_active_week`.
12. `eligible_for_web3 = total_event_count >= config.actors.min_events`. Actors are **not** dropped for low activity - this flag lets the frontend filter instead.
13. Check `combat_event_count + one_sided_event_count == total_event_count`.

## Output

```text
data/derived/actor_profiles.csv
```

Fields: `actor_id`, `actor_name`, `first_event_date`, `last_event_date`, `active_week_count`, `total_event_count`, `combat_event_count`, `one_sided_event_count`, `combatant_fatalities_in_involved_events`, `actor_deaths_suffered`, `civilian_fatalities_in_involved_events`, `one_sided_civilian_fatalities`, `one_sided_event_share`, `active_location_count`, `active_h3_cell_count`, `events_per_active_week`, `one_sided_events_per_active_week`, `civilian_fatalities_per_active_week`, `eligible_for_web3`.

## Invariants

```text
actor_id is unique
total_event_count > 0
combat_event_count + one_sided_event_count == total_event_count
0 <= one_sided_event_share <= 1
```

## Implementation notes

Structured as `load_actor_events`, `load_actor_lookup`, `validate_inputs`, `compute_week_start`, `assign_h3_cells`, `build_activity_metrics`, `build_geographic_metrics`, `finalize`, `validate_actor_profiles`, `print_summary`, `main`. Actors with zero spatially eligible events get `active_location_count = active_h3_cell_count = 0` via `fillna(0)` rather than dropping from the profile table. `civilian_fatalities_per_active_week` is computed from `civilian_fatalities_in_involved_events` (all civilian fatalities in events the actor participated in), not `one_sided_civilian_fatalities` - flagged as a judgment call worth revisiting since `one_sided_events_per_active_week` already covers the one-sided-specific angle separately. `eligible_for_web3` reads `config.actors.min_events` (matches `config/config.yaml`).

**Status:** implemented (456 lines), not yet run against the raw GED file.

---

## Loading and validation

::: scripts.05_build_actor_profiles.load_actor_events

::: scripts.05_build_actor_profiles.load_actor_lookup

::: scripts.05_build_actor_profiles.validate_inputs

## Spatial/temporal helpers

::: scripts.05_build_actor_profiles.compute_week_start

::: scripts.05_build_actor_profiles.assign_h3_cells

## Profile metrics

::: scripts.05_build_actor_profiles.build_activity_metrics

::: scripts.05_build_actor_profiles.build_geographic_metrics

## Finalization and orchestration

::: scripts.05_build_actor_profiles.finalize

::: scripts.05_build_actor_profiles.validate_actor_profiles

::: scripts.05_build_actor_profiles.print_summary

::: scripts.05_build_actor_profiles.main
