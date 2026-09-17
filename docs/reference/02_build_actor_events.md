# `02_build_actor_events.py`

Build the actor-centric long-format representation used by all actor-specific analyses.

## Responsibility

Convert `events_clean.parquet` (1 row = event) into `actor_events.parquet` (1 row = actor × event), so the same actor can be followed consistently across direct combat and one-sided violence.

## Input

```text
data/processed/events_clean.parquet
```

Expects `event_id` unique/non-null, `type_of_violence ∈ {1,2,3}`, parsed dates, numeric fatality fields — the contract produced by [`01_clean_events.py`](01_clean_events.md).

## Transformations

1. Validate the input schema and `event_id` uniqueness.
2. Construct `actor_id`: prefer `ucdp:<side_*_new_id>`; fall back to a normalized `name:<actor_name>` form (with a warning, not the expected path) when the stable ID is missing.
3. For combat events (`type_of_violence ∈ {1,2}`), emit **two** rows — one per side (`side_a`, `side_b`).
4. For one-sided events (`type_of_violence == 3`), emit **one** row for `side_a` only. Civilians are never converted into a comparable armed actor.
5. Set `actor_role` (`side_a`/`side_b`) and `is_one_sided_perpetrator` (`True` only for `side_a` on one-sided events).
6. Derive `actor_deaths_suffered` = `deaths_a` (if `side_a`) or `deaths_b` (if `side_b`).
7. Copy event-level context fields onto each actor-event row: `combatant_fatalities`, `civilian_fatalities`, `one_sided_civilian_fatalities`, `best`, `low`, `high`.
8. Hard-fail if `(event_id, actor_id)` is not unique.
9. Build `actor_lookup`: one row per canonical actor, resolving multiple textual names for the same ID to the most frequent one, with a warning when ambiguity exists.

## Output

**`data/processed/actor_events.parquet`** — one row per actor participating in one event. Key: `(event_id, actor_id)`. Fields: `event_id`, `actor_id`, `actor_name`, `actor_role`, `is_one_sided_perpetrator`, `date_start`, `type_of_violence`, `is_combat`, `is_one_sided`, `combatant_fatalities`, `actor_deaths_suffered`, `civilian_fatalities`, `one_sided_civilian_fatalities`, `best`, `low`, `high`, `latitude`, `longitude`, `spatial_eligible`, `adm_1`, `adm_2`, `where_coordinates`.

**`data/processed/actor_lookup.csv`** — one row per canonical actor: `actor_id`, `actor_name`, `event_count`, `first_event_date`, `last_event_date`.

## Critical invariant — the `__ALL__` / double-counting rule

A combat event involving two armed actors appears **twice** in `actor_events.parquet` by design. This dataset must never be summed across all actors to reconstruct conflict-wide totals — those must always come directly from `events_clean.parquet`. See [`CLAUDE.md`](https://github.com/PayThePizzo/war-civilian-violence/blob/main/CLAUDE.md) for the repo-wide statement of this rule.

## Fail-loud conditions

Duplicate `(event_id, actor_id)` pairs. Missing `side_*_new_id` and actor-name ambiguity are warn-only, not fatal.

## Implementation notes

Structured as `load_events_clean`, `validate_input`, `normalize_actor_name`, `build_actor_id_series`, `expand_side`, `expand_actor_events`, `report_actor_id_fallback_usage`, `validate_actor_event_pairs`, `build_actor_lookup`, `finalize_actor_events`, `print_summary`, `main`. `expand_side(df, side)` builds one side's rows at a time; combat events call it for both sides, one-sided events call it for `side_a` only, then results are concatenated. `build_actor_id_series` fires the name-based fallback per-row only when `side_*_new_id` is null.

**Status:** implemented (488 lines), not yet run against the raw GED file.

---

## Loading and validation

::: scripts.02_build_actor_events.load_events_clean

::: scripts.02_build_actor_events.validate_input

## Actor identity

::: scripts.02_build_actor_events.normalize_actor_name

::: scripts.02_build_actor_events.build_actor_id_series

::: scripts.02_build_actor_events.report_actor_id_fallback_usage

## Expansion into actor-events

::: scripts.02_build_actor_events.expand_side

::: scripts.02_build_actor_events.expand_actor_events

::: scripts.02_build_actor_events.validate_actor_event_pairs

## Actor lookup

::: scripts.02_build_actor_events.build_actor_lookup

## Finalization and orchestration

::: scripts.02_build_actor_events.finalize_actor_events

::: scripts.02_build_actor_events.print_summary

::: scripts.02_build_actor_events.main
