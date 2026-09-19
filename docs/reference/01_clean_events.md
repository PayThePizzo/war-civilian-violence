# `01_clean_events.py`

Clean and validate the raw UCDP Georeferenced Event Dataset used by the project.

## Responsibility

Transform the original GED file into a clean, project-specific **event-level** dataset without changing the unit of observation:

> 1 input row = 1 UCDP event = 1 output row.

Does **not** perform actor expansion, weekly aggregation, spatial aggregation, episode detection, or visualization-specific transformations - those are delegated to later pipeline stages.

## Input

```text
data/raw/GEDEvent_v26_1.csv
```

(or the path configured in `config/config.yaml`). Required source columns:

```text
id, date_start, date_end, date_prec, type_of_violence,
conflict_new_id, conflict_name, dyad_new_id, dyad_name,
side_a_new_id, side_a, side_b_new_id, side_b,
country, adm_1, adm_2, where_coordinates,
latitude, longitude,
deaths_a, deaths_b, deaths_civilians, deaths_unknown,
low, best, high
```

Missing any of these fails the script immediately.

## Configuration used

```yaml
analysis:
  country: "Sudan"
  start_date: "2023-04-15"
  end_date: "2025-12-31"
  violence_types: {...}   # codes for state_based/non_state/one_sided
```

## Transformations

1. Validate the schema against the required-columns set above.
2. Validate `id` is non-null and unique, then rename it to `event_id`.
3. Parse `date_start`/`date_end`; require `date_start <= date_end`.
4. Filter to the configured `country` (after whitespace normalization).
5. Filter to events with `date_start` inside `[start_date, end_date]`.
6. Validate `type_of_violence ∈ {1, 2, 3}`.
7. Derive `violence_type_label` (`state_based` / `non_state` / `one_sided`) and booleans `is_combat`, `is_one_sided`.
8. Convert fatality fields to numeric; reject negative counts.
9. Validate `low <= best <= high` where all three are available (hard fail, not a warning).
10. Derive `combatant_fatalities = deaths_a + deaths_b` (combat events only, else 0), `civilian_fatalities = deaths_civilians`, `one_sided_civilian_fatalities` (`deaths_civilians` when `type_of_violence == 3`, else 0).
11. Diagnostic-only check that `side_a` is present for one-sided events (does not reject on `deaths_a == 0` / `deaths_b == 0`).
12. Validate coordinates; derive `spatial_eligible` (`-90 <= latitude <= 90` and `-180 <= longitude <= 180`, both non-null). Invalid/missing coordinates do **not** drop the row - Web 1, 3, and 4 still use these events; only Web 2 (H3 map) requires `spatial_eligible = True`.
13. Conservative `.str.strip()` normalization on descriptive text fields (no aggressive actor-name normalization here).
14. Sort by `(date_start, event_id)`.

## Output

```text
data/processed/events_clean.parquet
```

One row per retained UCDP event, with the canonical column set: `event_id`, dates, violence classification (`type_of_violence`, `violence_type_label`, `is_combat`, `is_one_sided`), conflict/dyad/actor identity, geography (including `spatial_eligible`), and the fatality fields listed above (`deaths_a/b/civilians/unknown`, `combatant_fatalities`, `civilian_fatalities`, `one_sided_civilian_fatalities`, `low`/`best`/`high`).

## Fail-loud conditions

Missing required columns; null/duplicate `event_id`; unparseable dates; `date_start > date_end`; unsupported `type_of_violence`; negative fatality counts; `low > best > high` violations. Invalid coordinates are the one exception - flagged via `spatial_eligible = False`, never rejected.

## Implementation notes

Structured as a pure-function pipeline (`load_raw`, `validate_schema`, `validate_event_key`, `parse_dates`, `filter_country`, `filter_period`, `validate_violence_type`, `add_violence_labels`, `clean_fatalities`, `derive_fatality_fields`, `check_one_sided_actor`, `validate_coordinates`, `normalize_text_fields`, `finalize`, `print_summary`, `main`), each stage taking/returning a DataFrame. Violence-type codes are read from `config.analysis.violence_types` rather than hardcoded `{1,2,3}`. Output columns are written in an explicit fixed order, not insertion order.

**Status:** implemented (592 lines; docstring + functions), not yet run against the raw GED file.

---

## Exceptions

::: scripts.01_clean_events.SchemaError

## Loading

::: scripts.01_clean_events.load_raw

## Validation

::: scripts.01_clean_events.validate_schema

::: scripts.01_clean_events.validate_event_key

::: scripts.01_clean_events.parse_dates

::: scripts.01_clean_events.validate_violence_type

::: scripts.01_clean_events.clean_fatalities

## Filtering

::: scripts.01_clean_events.filter_country

::: scripts.01_clean_events.filter_period

## Labeling and derived fields

::: scripts.01_clean_events.add_violence_labels

::: scripts.01_clean_events.derive_fatality_fields

## Spatial and text normalization

::: scripts.01_clean_events.validate_coordinates

::: scripts.01_clean_events.normalize_text_fields

## Diagnostics

::: scripts.01_clean_events.check_one_sided_actor

## Finalization and orchestration

::: scripts.01_clean_events.finalize

::: scripts.01_clean_events.print_summary

::: scripts.01_clean_events.main