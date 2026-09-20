# Instagram Post 2

**Title**:

**Description**:

![](?raw=TRUE)

---

## Context: 

TODO: Describe the question we were trying to answer and how we planned for this kind of visualization

---

## Representation: 

TODO: Insert picture (FUTURE)
![](?raw=TRUE)

TODO: Describe the visualization first from definition, then explain what it portrays, interactive options if any etc...

---

## Pros and Cons

TODO: Discuss pros and cons

| **Pro** | **Con** |
|---------|---------|
|         |         |
|         |         |
|         |         |
|         |         |

---

## Knowledge: What can we learn from it?

TODO: Describe what we are trying to find out, what it was not possible to visualize in tabular format and what is gained from this representation

---

## Pipeline from raw information to the visualizations

The post reads one derived file, `actor_profiles.csv`. All analytical work happens upstream in the Python pipeline, while the `social/` only filters, scales and lays out.

The whole pipeline runs with `python scripts/build_all.py`.

**What is inside the raw dataset.**

- Each UCDP GED event names its two sides and a violence type;
- Combat events involve two armed actors;
- one-sided events have a single perpetrator, and civilians are never treated as an actor.

**What is inside `actor_profiles.csv`.**

- One row per canonical actor (22 actors, 11 flagged `eligible_for_web3`).

This post plots:

| Column | Used for |
|---|---|
| `eligible_for_web3` | which actors are eligible (the pipeline's own threshold, never redefined here) |
| `one_sided_event_share` | ranking and lollipop position |
| `total_event_count` | dot size and tie-break |
| `actor_name`, `actor_id` | labels and final tie-break |

### Steps

1. **Download the raw GED** (v26.1) into `data/raw/GEDEvent_v26_1.csv`, kept unmodified.
2. **`01_clean_events.py`** validates required columns, unique event ids, parseable dates and `date_start <= date_end`, restricts the data to Sudan and 2023-04-15 to 2025-12-31, derives `combatant_fatalities`, `civilian_fatalities` and `one_sided_civilian_fatalities`, and flags (does not drop) events with invalid coordinates. Output: `data/processed/events_clean.parquet`, one row per event.
3. **`02_build_actor_events.py`** expands each event into actor × event rows (a combat event becomes two rows, one per side; a one-sided event becomes one row, the perpetrator). Output: `data/processed/actor_events.parquet` and `actor_lookup.csv`.
4. **`05_build_actor_profiles.py`** groups the actor-event rows by `actor_id`, attaches the canonical name from `actor_lookup.csv`, computes the profile metrics and sets `eligible_for_web3` from `actors.min_events` (5). No actor is removed from the file. Output: `data/derived/actor_profiles.csv`.
5. **`07_validate_outputs.py`** runs 146 checks (all pass) over every processed and derived file. `build_all.py` runs all stages in order, stops at the first failure, and also writes `metadata.json` (country, analysis period, week convention, H3 resolution, window size).
6. **`npm run sync-data`** (in `social/`) copies the derived CSVs and `metadata.json` unchanged into `social/.generated/data/`.
7. **`instagram/post-02-actors/main.ts`** loads the CSV through `shared/data.ts` (fails loudly on schema drift) and applies a fixed, display-only rule: keep `eligible_for_web3` actors, sort by `one_sided_event_share` descending (ties by `total_event_count` descending, then `actor_id`), keep the top 6.

   It draws a ranked horizontal lollipop chart (position = one-sided share, dot diameter 14-26 px scaled by `total_event_count`, one-sided red from `shared/colors.ts`). Displayed actors with a 0% share are not drawn as bars and are listed in a single summary line under the chart instead.
8. **`npm run export:instagram`** builds the pages with Vite, renders each at 1080 × 1350 px with Playwright once fonts, data and render have finished, and writes `social/output/instagram-02-actors.png`.

This is not a screenshot of the web view: the parallel-coordinates geometry and the six-axis layout are not carried over, only the eligible-actor universe and the semantic color.

### Sources and tools

**Data sources**

| Source | Role |
|---|---|
| UCDP Georeferenced Event Dataset (GED) v26.1, `data/raw/GEDEvent_v26_1.csv` (codebook: `data/raw/ged261.pdf`) | the only analytical source |
| `config/config.yaml` | `actors.min_events` (eligibility threshold) |

**Pipeline tools (Python 3.12, Poetry)**

| Tool | Use |
|---|---|
| pandas, numpy | cleaning, joins, aggregation |
| pyarrow | Parquet files for `events_clean` and `actor_events` |
| pyyaml, pydantic | reading and validating `config.yaml` (`config/config_parser.py`) |
| flake8, black | linting and formatting |

**Rendering tools (`social/`, Node, TypeScript)**

| Tool | Use |
|---|---|
| Vite | multi-page build (one HTML page per post) |
| TypeScript | typed CSV parsing and view code |
| plain DOM and CSS | the lollipop rows are HTML elements, not a D3 chart |
| Playwright (Chromium) | headless rendering and PNG export at the exact post size |
| Source Serif 4 and Public Sans | headline and label typefaces, reused from the web app's font files |
