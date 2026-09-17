# `build_all.py`

Run the complete project data-preparation pipeline. This is the orchestrator, not an analytical script.

## Responsibility

Execute all seven pipeline stages in strict order, stopping immediately if any stage fails, then write frontend-facing metadata and a build manifest.

```text
01_clean_events → 02_build_actor_events → 03_build_weekly_metrics →
04_build_h3_metrics → 05_build_actor_profiles → 06_build_event_windows →
07_validate_outputs
```

A downstream stage runs only if every preceding stage completed successfully. The pipeline must never continue using stale downstream outputs after an upstream failure.

## Input

```text
config/config.yaml
data/raw/GEDEvent_v26_1.csv
```

plus all seven stage modules (each exposes a callable `main()`).

## Pre-flight validation

Before running any stage:

```text
config file exists and parses
raw GED input exists
output directories can be created
start_date < end_date
h3_resolution in valid range
before_weeks >= 0, after_weeks >= 0
top_k_per_actor > 0
min_gap_weeks > 0
```

## Additional outputs

**`data/derived/metadata.json`** — frontend-facing subset of the analytical configuration (the web app should read this rather than parsing the YAML config directly):

```json
{
  "country": "Sudan",
  "analysis_start": "2023-04-15",
  "analysis_end": "2025-12-31",
  "temporal_resolution": "week",
  "week_start": "Monday",
  "h3_resolution": 5,
  "event_window_before_weeks": 8,
  "event_window_after_weeks": 8
}
```

**`data/derived/build_manifest.json`** — technical provenance for reproducibility/debugging: `raw_input_path`, `raw_input_sha256`, `config_path`, `config_sha256`, row counts for every processed/derived output, `validation_status`, `build_timestamp`.

A build is successful only when [`07_validate_outputs.py`](07_validate_outputs.md) reports a `PASS` status.

## Implementation notes

Structured as `validate_config`, `preflight`, `run_stage`, `file_sha256`, `count_rows`, `build_metadata`, `write_json`, `main`.

**Status:** implemented (338 lines), not yet run end-to-end against the raw GED file.

---

## Preflight

::: scripts.build_all.validate_config

::: scripts.build_all.preflight

## Stage execution

::: scripts.build_all.run_stage

## Provenance helpers

::: scripts.build_all.file_sha256

::: scripts.build_all.count_rows

::: scripts.build_all.build_metadata

::: scripts.build_all.write_json

## Orchestration

::: scripts.build_all.main
