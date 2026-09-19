# Python Scripts Reference

Reference documentation for every script in `scripts/`, generated from each script's module docstring, cross-checked against [`data/DATA_FILES.md`](https://github.com/PayThePizzo/war-civilian-violence/blob/main/data/DATA_FILES.md) (authoritative for field names) and [`scripts/SCRIPTS.md`](https://github.com/PayThePizzo/war-civilian-violence/blob/main/scripts/SCRIPTS.md) (per-script contract).

/// note | Status
Every script below has a real implementation (functions beyond the module docstring), not just a docstring stub. None has been run end-to-end against the raw GED file yet - see each page's Status section for specifics.
///

## Pipeline order

```text
data/raw/GEDEvent_v26_1.csv
  → 01_clean_events.py        → data/processed/events_clean.parquet
  → 02_build_actor_events.py  → data/processed/actor_events.parquet
                               → data/processed/actor_lookup.csv
  → 03_build_weekly_metrics.py → data/derived/weekly_metrics.csv     (Web 1: timeline)
  → 04_build_h3_metrics.py     → data/derived/h3_weekly_metrics.csv  (Web 2: H3 map)
  → 05_build_actor_profiles.py → data/derived/actor_profiles.csv     (Web 3: actor fingerprints)
  → 06_build_event_windows.py  → data/derived/event_windows.csv      (Web 4: before/after episodes)
  → 07_validate_outputs.py     → data/validation/validation_report.json + validation_failures.csv
```

`build_all.py` runs all seven stages above in strict order and stops on the first failure; it also writes `data/derived/metadata.json` (frontend-facing config subset) and `data/derived/build_manifest.json` (provenance/checksums/row counts).

## Scripts

| Stage | Script | Produces | Answers |
|---|---|---|---|
| 1 | [`01_clean_events.py`](01_clean_events.md) | `events_clean.parquet` | - |
| 2 | [`02_build_actor_events.py`](02_build_actor_events.md) | `actor_events.parquet`, `actor_lookup.csv` | - |
| 3 | [`03_build_weekly_metrics.py`](03_build_weekly_metrics.md) | `weekly_metrics.csv` | WHEN? (Web 1) |
| 4 | [`04_build_h3_metrics.py`](04_build_h3_metrics.md) | `h3_weekly_metrics.csv` | WHERE? (Web 2) |
| 5 | [`05_build_actor_profiles.py`](05_build_actor_profiles.md) | `actor_profiles.csv` | WHO? (Web 3) |
| 6 | [`06_build_event_windows.py`](06_build_event_windows.md) | `event_windows.csv` | BEFORE/AFTER? (Web 4) |
| 7 | [`07_validate_outputs.py`](07_validate_outputs.md) | `validation_report.json`, `validation_failures.csv` | - |
| - | [`build_all.py`](build_all.md) | orchestrates 1-7, `metadata.json`, `build_manifest.json` | - |

See [`data/DATA_FILES.md`](https://github.com/PayThePizzo/war-civilian-violence/blob/main/data/DATA_FILES.md) for full field-by-field schema of every output file, and the project `CLAUDE.md` for the pipeline-wide invariants (the `__ALL__` double-counting rule, fatality field semantics, spatial eligibility, fail-loud conventions).
