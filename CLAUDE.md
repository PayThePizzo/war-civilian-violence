# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Analysis of the UCDP Georeferenced Event Dataset (GED) to study patterns of one-sided violence against civilians in the Sudan conflict (2023-04-15 to 2025-12-31). Output is a Python data pipeline feeding a Vite + TypeScript / D3 / MapLibre / deck.gl web app (`web/`) plus static social-media exports (`social/`).

Three spec docs exist and disagree in places - authority order when they conflict:

1. **`data/DATA_FILES.md`** - most authoritative. Exact current field names, producer/consumer per file, source-of-truth hierarchy, missing-vs-zero policy. Trust this for schema field names.
2. **`scripts/SCRIPTS.md`** - per-script contract (responsibility, transformations, module docstring to paste into each script). Matches DATA_FILES.md field names; use for *how* a script builds its output, not just *what* the output contains.
3. **`PROJECT_SPEC.md`** - original design narrative (why the architecture looks like this, frontend interaction design, MVP scope, methodological cautions in §66). Its early schema examples (Web 1-4 input tables, §9/18/31/43) use an **older, shorter field-naming draft** (`combat_events`, `combat_fatalities`, `total_fatalities`, `active_locations`, episode ids like `RSF_2024_06_03`) that was superseded by DATA_FILES.md's naming (`combat_event_count`, `combatant_fatalities`, `best_fatalities`, `active_location_count`, episode ids like `ucdp-1234__2024-06-03`). Read PROJECT_SPEC.md for rationale and cross-view interaction design, never for exact column names - use DATA_FILES.md for those.

Resolved mismatches (decided 2026-09-12):
- Config key is `actors.min_events` (matches `config/config.yaml`) - `scripts/SCRIPTS.md` previously said `min_events_web3`, now corrected to match.
- Frontend is **Vite + TypeScript** (PROJECT_SPEC.md §1/§52/§57), now scaffolded in `web/` (see Frontend below). The old plain-JS `web/js/*` layout no longer exists.
- Episode IDs are **actor_id-based**: `<actor_id>__<YYYY-MM-DD>` (e.g. `ucdp-1234__2024-06-03`), per SCRIPTS.md/DATA_FILES.md - not the actor_name-based `RSF_2024_06_03` example in PROJECT_SPEC.md §43.

All pipeline scripts are implemented (`scripts/01_clean_events.py` through `07_validate_outputs.py` plus `build_all.py`, each with a runnable `if __name__ == "__main__":` entry point) and have been **run end-to-end against the raw GED file**: `data/processed/`, `data/derived/` and `data/validation/` are populated, and `validation_report.json` reports `PASS` (146/146 checks). `PROJECT_SPEC.md` has worked pseudocode per transformation step, useful for cross-checking implementation choices. Per-script reference docs (purpose, inputs, config keys, outputs, invariants) live in `docs/reference/*.md`, built via `mkdocs`. Phase reports (dataset, domain knowledge, visual design, tangible design) live in `docs/phase_1` to `docs/phase_4`.

**Frozen inputs for the frontend:** `web/WEB.md` records the decision that `scripts/`, `config/`, `data/processed/` and `data/derived/` are no longer changed for frontend work - `web/` and `social/` only consume the four derived CSVs plus `metadata.json`. If a view needs a new field, raise it before touching the pipeline.

## Commands

Python env: activate `test` pyenv env before running anything (`pyenv activate test`), then use `poetry run <cmd>` - there is no `.python-version` file yet.

```bash
pyenv activate test
poetry install

# lint (flake8 config: max-line-length 130, max-complexity 20, google docstring convention)
poetry run flake8 scripts/ project_paths.py

# format
poetry run black scripts/ project_paths.py

# run one pipeline stage directly
poetry run python scripts/01_clean_events.py

# run the full pipeline (fails fast on first stage error)
poetry run python scripts/build_all.py

# docs site
poetry run mkdocs serve
```

There is no Python test suite (no root `tests/`, no pytest config in `pyproject.toml`); the pipeline is checked by `07_validate_outputs.py`.

Frontend and social workspaces are separate npm projects (each has its own `package.json`, run from inside the folder):

```bash
# web app (Vite + TS)
cd web
npm install
npm run dev        # sync-data (data/derived -> web/.generated/data), then vite
npm run build      # sync-data, tsc, vite build
npm test           # node --test tests/*.test.mjs (view math + integration)

# social posts (Vite + Playwright)
cd social
npm install
npm run export             # build, then render all posts to social/output/*.png
npm run export:instagram   # or export:x
```

`web/.generated/`, `social/.generated/` and `social/output/*.png` are git-ignored build artifacts. `data/derived/metadata.json` and `build_manifest.json` are git-ignored too.

## Architecture

### Pipeline (Python) → derived CSVs → 4 web visualizations

```
data/raw/GEDEvent_v26_1.csv
  → 01_clean_events.py        → data/processed/events_clean.parquet   (1 row = 1 UCDP event)
  → 02_build_actor_events.py  → data/processed/actor_events.parquet   (1 row = actor × event)
                               → data/processed/actor_lookup.csv
  → 03_build_weekly_metrics.py → data/derived/weekly_metrics.csv      (Web 1: timeline)
  → 04_build_h3_metrics.py     → data/derived/h3_weekly_metrics.csv   (Web 2: H3 map)
  → 05_build_actor_profiles.py → data/derived/actor_profiles.csv      (Web 3: actor fingerprints)
  → 06_build_event_windows.py  → data/derived/event_windows.csv       (Web 4: before/after episodes)
  → 07_validate_outputs.py     → data/validation/validation_report.json + validation_failures.csv
```

`build_all.py` runs all stages in strict order and stops immediately on the first failure - never continues with stale downstream outputs. It also writes `data/derived/metadata.json` (frontend-facing config subset) and `data/derived/build_manifest.json` (provenance/checksums/row counts).

All filesystem paths are centralized in `project_paths.py` at the repo root - every script imports path constants from there rather than constructing paths locally. It only defines paths; it never creates directories or files.

All tunable parameters (country, date range, H3 resolution, episode-detection thresholds, actor eligibility threshold) live in `config/config.yaml`, never hard-coded in scripts.

### The `__ALL__` double-counting rule (critical, applies everywhere)

A combat event (`type_of_violence` 1 or 2) involves two armed actors and is expanded into two rows in `actor_events.parquet` - once per side. Any aggregate keyed by `actor_id = "__ALL__"` represents unique conflict-wide totals and **must always be computed directly from `events_clean.parquet`**, never by summing actor-level rows, or events get double-counted. This invariant is checked explicitly in `07_validate_outputs.py` and must hold in `weekly_metrics.csv` and `h3_weekly_metrics.csv`.

One-sided violence events (`type_of_violence == 3`) generate only one actor-event row (the perpetrator, `side_a`) - civilians are never added as a comparable "actor".

### Fatality field semantics (don't conflate these)

- `combatant_fatalities` = `deaths_a + deaths_b`, only for combat events (`type_of_violence ∈ {1,2}`)
- `civilian_fatalities` = `deaths_civilians`, for any violence type
- `one_sided_civilian_fatalities` = `deaths_civilians` only when `type_of_violence == 3`, else 0 - this is the metric used for episode/peak detection

### Spatial eligibility

Events with missing/invalid coordinates are **retained** (not dropped) through `events_clean.parquet`, flagged `spatial_eligible = False`. Only `04_build_h3_metrics.py` filters to `spatial_eligible == True`. Non-spatial views (timeline, actor profiles) still use these events.

### Episode/event-window detection (Web 4) is deterministic, not manual

Peaks in `one_sided_civilian_fatalities` per actor are found via local-maximum detection, plateau ties broken by earliest week, ranked by magnitude, and greedily filtered by `min_gap_weeks` separation, capped at `top_k_per_actor`. Weeks inside the analysis period with genuinely zero events get `0`; weeks outside the analysis period get `NA` + `is_observed_week = False` - these must not be conflated. Findings from this view describe temporal association only, never causation ("military pressure caused attacks on civilians" is an explicit non-claim - see PROJECT_SPEC.md §66).

### Frontend (`web/`, see `web/WEB.md` for the plan and `web/VIZ.md` for the four views)

Layout: `src/viz/{timeline,map,actors,event-windows}/` (one folder per view, with a `*Math.ts` for pure logic that `tests/*.test.mjs` cover), `src/data/{loaders,parsers,selectors,types}.ts` (CSV -> typed rows; views read through `selectors.ts`, never raw arrays), `src/app/{state,store}.ts`, `src/ui/`, `src/utils/`, `src/styles/`. No analytical logic in the browser - only filtering, scaling, layout. `data/derived/` is copied into `web/.generated/data/` by `npm run sync-data`.

Global state is deliberately tiny: `AppState = { selectedActorId, focusWeek }` (`src/app/state.ts`, defaults `"__ALL__"` / `null`). The earlier plan (PROJECT_SPEC.md §6-7, 59-61) listed six fields (`dateRange`, `violenceTypes`, `selectedHexId`, `selectedEpisodeId` too); those were **not** adopted and stay view-local. Rule of thumb: state that changes *another* visualization is global; state meaningful only within one view (hover, tooltip position, brush drag, 3D toggle) stays local to that view. `main.ts` builds the store and routes `store.subscribe` to each view's `update(state)`.

Styling: one token system in `src/styles/tokens.css`; `src/utils/colors.ts` (`violenceColors`, three hues) is the only place color encodes data.

### Social (`social/`)

Static 4:5 (Instagram) and 16:9 (X) posts rendered from the same derived CSVs as the web app, one folder per post under `social/instagram/` and `social/x/`, shared code in `social/shared/`, specs in `social/INSTA.md`. Not screenshots of the interactive views.

### Fail-loud convention

Preprocessing scripts must fail hard (not silently repair or drop rows) on: missing required columns, non-unique/null event IDs, unparseable dates, `date_start > date_end`, unsupported `type_of_violence` values, negative fatality counts, or `low > best > high` violations. Invalid coordinates are the one exception - those are flagged, not rejected.
