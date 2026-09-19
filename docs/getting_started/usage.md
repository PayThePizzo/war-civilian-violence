# Usage

This guide walks through the full project flow from a fresh checkout: preparing the raw GED file, running the Python pipeline, checking the generated outputs, and launching the frontend.

## 1. Download the raw data

The pipeline starts from the UCDP Georeferenced Event Dataset (GED).

Place the source file at:

```text
data/raw/GEDEvent_v26_1.csv
```

Do not modify the raw file. Treat it as the immutable upstream dataset.

---

## 2. Install the project environment

Follow the setup in the installation guide first:

```bash
pyenv install 3.12.7
pyenv virtualenv 3.12.7 test
pyenv activate test
pip install poetry==1.8.5
poetry install
```

Then confirm the environment is active and the project dependencies are available:

```bash
python --version
poetry run python --version
```

---

## 3. Review and edit configuration

Open `config/config.yaml` and confirm the project settings:

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

The configuration defines the analytical window, spatial resolution, and episode thresholds. Do not hard-code these values in the scripts.

---

## 4. Run the pipeline

The canonical way to run the data pipeline is:

```bash
poetry run python scripts/build_all.py
```

This script runs the stages in strict order and stops on the first failure. The intended order is:

```text
01_clean_events.py
02_build_actor_events.py
03_build_weekly_metrics.py
04_build_h3_metrics.py
05_build_actor_profiles.py
06_build_event_windows.py
07_validate_outputs.py
```

You can also run a single stage directly when debugging:

```bash
poetry run python scripts/01_clean_events.py
poetry run python scripts/02_build_actor_events.py
```

---

## 5. Check the generated outputs

The pipeline generates the output datasets under `data/processed/`, `data/derived/`, and `data/validation/`.

### Processed outputs

```text
data/processed/
├── events_clean.parquet
├── actor_events.parquet
├── actor_lookup.csv
```

### Derived outputs for the web app

```text
data/derived/
├── weekly_metrics.csv
├── h3_weekly_metrics.csv
├── actor_profiles.csv
├── event_windows.csv
├── metadata.json
├── build_manifest.json
```

### Validation outputs

```text
data/validation/
├── validation_report.json
├── validation_failures.csv
```

These files are the source of truth for the visualization dashboards. The browser does not run the analytical pipeline; it consumes the pre-computed outputs.

---

## 6. Sync derived data to the frontend

The frontend reads the generated CSVs from `web/.generated/data/` after a sync step. Run:

```bash
cd web
npm install
npm run sync-data
```

The sync script copies the CSVs and metadata from `data/derived/` into the Vite app’s generated-data directory without altering the authoritative source files.

---

## 7. Start the frontend

Once the data has been synced, launch the local dev server:

```bash
cd web
npm run dev
```

This should start the Vite application so you can view the four visualizations:

- Web 1: timeline
- Web 2: H3 map
- Web 3: actor profiles
- Web 4: event windows before/after episodes

---

## 8. Build the frontend for production

When you are ready to compile the static app:

```bash
cd web
npm run build
```

This performs the TypeScript build and produces the production bundle under `web/dist/`.

---

## 9. Run the docs site

To preview the MkDocs site locally:

```bash
poetry run mkdocs serve
```

Then open the local documentation URL provided by MkDocs in the terminal.

---

## 10. Typical workflow summary

```bash
# 1. install dependencies
pyenv activate test
poetry install

# 2. place raw GED file
# data/raw/GEDEvent_v26_1.csv

# 3. review config
# config/config.yaml

# 4. run pipeline
poetry run python scripts/build_all.py

# 5. sync data for frontend
cd web
npm install
npm run sync-data

# 6. start frontend
npm run dev
```

This is the expected zero-to-running workflow for the project: raw data -> configured pipeline -> derived outputs -> live front-end.