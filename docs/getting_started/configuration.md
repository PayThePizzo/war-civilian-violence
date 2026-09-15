# Configuration

The project is configured through the repository YAML file at `config/config.yaml`, with all paths centralized in `project_paths.py`. The scripts do not hard-code country, date range, H3 resolution, or episode thresholds in Python; those values flow from configuration.

## Required project structure

Before running the pipeline, these items should exist:

```text
war-civilian-violence/
├── config/
│   ├── config.yaml
│   └── config_parser.py
├── data/
│   ├── raw/
│   │   └── GEDEvent_v26_1.csv
│   ├── processed/
│   ├── derived/
│   └── validation/
├── scripts/
│   ├── 01_clean_events.py
│   ├── 02_build_actor_events.py
│   ├── 03_build_weekly_metrics.py
│   ├── 04_build_h3_metrics.py
│   ├── 05_build_actor_profiles.py
│   ├── 06_build_event_windows.py
│   ├── 07_validate_outputs.py
│   └── build_all.py
├── project_paths.py
├── pyproject.toml
├── README.md
└── web/
    ├── package.json
    ├── vite.config.ts
    └── src/
```

The raw UCDP dataset is the required input and must remain under `data/raw/`. The pipeline expects the canonical file name:

```text
data/raw/GEDEvent_v26_1.csv
```

---

## Main configuration file

The main project tuning lives in:

```text
config/config.yaml
```

A typical configuration includes analysis period, geography, and threshold settings:

```yaml
analysis:
  country: "Sudan"
  start_date: "2023-04-15"
  end_date: "2025-12-31"

  h3_resolution: 5

  event_window:
    before_weeks: 8
    after_weeks: 8

  episodes:
    min_gap_weeks: 6
    top_k_per_actor: 10

  actors:
    min_events: 5
```

These values are not meant to be repeated in each script. The scripts read from the shared config through `config/config_parser.py` and the central path definitions in `project_paths.py`.

---

## What configuration controls

### Country and date range

The analysis is restricted to the configured country and time window. This is applied during the event cleaning stage so that all downstream derived tables are consistent with the same study period.

### H3 aggregation

`h3_resolution` determines how coarse or granular the spatial aggregation will be for map-based views. The project specification notes that H3 resolution 5 is the baseline setting, with larger or smaller resolutions possible depending on the output being reviewed.

### Event windows and episodes

The event-window detector uses:

- `before_weeks`
- `after_weeks`
- `min_gap_weeks`
- `top_k_per_actor`

These parameters define the observation window around each episode and the greedily filtered ranking logic used for episode detection.

### Actor eligibility

The pipeline uses a minimum-event threshold to decide which actors are eligible for the actor profile view and related cross-visualization filters.

---

## Configuration workflow

1. Confirm the raw GED file is in `data/raw/`.
2. Review `config/config.yaml` and update the analysis period and thresholds as needed.
3. Run the pipeline from the repo root so all scripts read the same config and path constants.
4. Rebuild the derived outputs before opening the frontend.

Example:

```bash
pyenv activate test
poetry run python scripts/build_all.py
```

---

## Frontend configuration

The browser is intentionally thin: it reads pre-aggregated CSVs from `data/derived/` and does not re-run the analytical logic. It is therefore not configured with business rules like episode detection. The frontend mainly consumes:

- `weekly_metrics.csv`
- `h3_weekly_metrics.csv`
- `actor_profiles.csv`
- `event_windows.csv`
- `metadata.json`

This data is synced into the Vite app via the `web/scripts/sync-data.mjs` script.

---

## Important constraints

- Do not edit the raw dataset in place.
- Keep all date and actor thresholds in `config/config.yaml` rather than in the scripts.
- Keep the source-of-truth field names aligned with `data/DATA_FILES.md`.
- If you change the config, rerun the pipeline so the derived data reflects the new parameter values.

The configuration is therefore the project’s single control point for analytical scope and model parameters.