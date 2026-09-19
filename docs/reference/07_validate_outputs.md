# `07_validate_outputs.py`

Validate the complete processed and derived data pipeline - the final integrity gate before the visualization layer.

## Responsibility

Verify that every prior stage's outputs satisfy their declared schemas, value constraints, relational constraints, and cross-dataset invariants. It does **not** generate analytical data and must never silently repair a failing dataset - corrections belong in the upstream stage that produced the invalid output.

## Input

```text
data/processed/events_clean.parquet
data/processed/actor_events.parquet
data/processed/actor_lookup.csv
data/derived/weekly_metrics.csv
data/derived/h3_weekly_metrics.csv
data/derived/actor_profiles.csv
data/derived/event_windows.csv
```

## Checks

| # | Category | Check |
|---|---|---|
| A | File existence | every expected output path exists |
| B | Schema | each output has all required columns |
| C | Events | `event_id` non-null/unique, dates valid, fatalities ≥ 0, `type_of_violence ∈ {1,2,3}` |
| D | Actor events | `(event_id, actor_id)` unique; `event_id` exists in `events_clean` (foreign key) |
| E | Actor lookup | `actor_id` unique; every actor in `actor_events` appears in the lookup |
| F | Weekly global consistency | `weekly.__ALL__.event_count == unique events_clean events` per week |
| G | Weekly decomposition | `event_count == state_based + non_state + one_sided`; `combat_event_count == state_based + non_state` |
| H | H3 conservation | `sum(__ALL__ H3 event_count) == spatially eligible unique events` per week |
| I | Actor profile consistency | `actor_profiles.total_event_count == nunique(actor_events.event_id)` per actor |
| J | Event windows | `relative_week` unique within episode; `relative_week == 0` exists exactly once; `calendar_week(T0) == t0_date` |
| K | Shares | every share in `[0, 1]` |
| L | NA policy | no `NA` in IDs/counts/`week_start`, except Web 4 metrics where `is_observed_week == False` |

## Output

**`data/validation/validation_report.json`** - machine-readable summary, e.g. `{"status": "PASS", "checks_run": 47, "checks_passed": 47, "checks_failed": 0}`.

**`data/validation/validation_failures.csv`** - always created; header-only when everything passes, one or more rows per failed check otherwise (`check_id`, `message`, plus optional `dataset`, `severity`, `row_identifier`, `expected`, `observed`).

## Exit code

```text
0 -> all checks passed
1 -> at least one check failed
```

## Implementation notes

Structured around a `ValidationRecorder` class plus `load_all`, `check_schema`, `check_events`, `check_actor_events`, `check_actor_lookup`, `check_weekly_global`, `check_weekly_decomposition`, `check_h3_conservation`, `check_actor_profile_consistency`, `check_event_windows`, `check_shares`, `check_na_policy`, `write_validation_report`, `write_validation_failures`, `print_summary`, `main`. Several of these checks duplicate lighter-weight defense-in-depth versions already embedded in scripts 03-06 ([`03_build_weekly_metrics.py`](03_build_weekly_metrics.md), [`04_build_h3_metrics.py`](04_build_h3_metrics.md), [`05_build_actor_profiles.py`](05_build_actor_profiles.md)) - this script is the authoritative, pipeline-wide gate.

**Status:** implemented (866 lines), not yet run against the raw GED file.

---

## Recorder

::: scripts.07_validate_outputs.ValidationRecorder

## Loading

::: scripts.07_validate_outputs.load_all

## Schema and per-file checks

::: scripts.07_validate_outputs.check_schema

::: scripts.07_validate_outputs.check_events

::: scripts.07_validate_outputs.check_actor_events

::: scripts.07_validate_outputs.check_actor_lookup

## Weekly metrics checks

::: scripts.07_validate_outputs._week_start

::: scripts.07_validate_outputs.check_weekly_global

::: scripts.07_validate_outputs.check_weekly_decomposition

## Cross-file conservation checks

::: scripts.07_validate_outputs.check_h3_conservation

::: scripts.07_validate_outputs.check_actor_profile_consistency

::: scripts.07_validate_outputs.check_event_windows

::: scripts.07_validate_outputs.check_shares

::: scripts.07_validate_outputs.check_na_policy

## Reporting and orchestration

::: scripts.07_validate_outputs.write_validation_report

::: scripts.07_validate_outputs.write_validation_failures

::: scripts.07_validate_outputs.print_summary

::: scripts.07_validate_outputs.main
