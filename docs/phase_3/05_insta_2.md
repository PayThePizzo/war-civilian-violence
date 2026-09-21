# Instagram Post 2

**Title**: Sudan's armed actors leave very different civilian tolls

**Description**: Not all armed actors in Sudan show the same pattern of violence against civilians.

The visualization compares these shares alongside the number of recorded events and associated civilian fatalities, showing how differently civilian targeting appears across the main actors in the conflict.

Data: UCDP Georeferenced Event Dataset (GED), Apr 2023–Dec 2025.

![Instagram Post 2](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_3/images/Insta%202%20-%20screenshot.png?raw=TRUE)

---

## Context

This post addresses the actor-level question of the project:

> **Do the main armed actors in Sudan exhibit similar patterns of one-sided violence against civilians?**

The previous representations examine when violence changes and where different forms of violence occur. This visualization instead compares the **violence profiles of individual armed actors**.

The objective is not simply to determine which actor appears in the largest number of events. An actor with many recorded events may have only a small proportion classified as one-sided violence, while another actor with fewer total events may have a much larger one-sided share.

For this reason, the post combines three quantities:

- the actor's **total number of recorded events**;
- the **share of those events classified as one-sided violence**;
- the number of **one-sided civilian fatalities** associated with those events.

These are distinct measures. The actor-level dataset specifically keeps total activity, one-sided activity, one-sided share and civilian fatalities as separate variables rather than reducing them to a single measure. :contentReference[oaicite:0]{index=0}

For Instagram, the multidimensional parallel-coordinates plot used in Web Visualization 3 was simplified into a more direct **three-actor comparison**. The intention is to communicate one finding clearly in a static image rather than require the audience to interpret six axes simultaneously.

---

## Representation: Actor Comparison / Lollipop Chart

![Instagram Post 2](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_3/images/Insta%202.png?raw=TRUE)

The visualization is a **small-multiple actor comparison** centred on `one_sided_event_share`.

Each horizontal row represents one of the three principal actors shown:

1. **RSF**
2. **SFA**
3. **Government of Sudan**

The main red line-and-dot mark functions like a **lollipop chart**:

- horizontal position represents the actor's **one-sided event share**;
- the red dot marks the actor's value;
- the percentage is repeated numerically on the right for precise reading.

The principal values shown are:

| Actor | One-sided event share | Total recorded events | One-sided civilian fatalities |
|---|---:|---:|---:|
| **RSF** | **27%** | 1,139 | 4,515 |
| **SFA** | **25%** | 567 | 61,973 |
| **Government of Sudan** | **4%** | 1,307 | 907 |

The one-sided share corresponds to the proportion of each actor's own recorded events that were classified as one-sided violence. In the actor-profile data this is calculated from the actor's one-sided and total event counts. :contentReference[oaicite:1]{index=1}

### Main comparison

The most immediate pattern is the contrast between **RSF/SFA and the Government of Sudan**.

RSF and SFA have very similar shares:

> **RSF: 27%**  
> **SFA: 25%**

while the Government of Sudan is much lower:

> **Government of Sudan: 4%**

This is why the key-finding box states that roughly one quarter of RSF and SFA's recorded events were classified as one-sided violence, compared with only 4% for the Government of Sudan.

The post therefore compares **composition**, not just activity.

The Government of Sudan actually has the largest total number of recorded events among the three actors shown, with 1,307 events. Yet its one-sided share is substantially lower.

This demonstrates why total event count alone is not sufficient for comparing violence profiles.

### Civilian fatalities

Each actor row also reports the associated number of **one-sided civilian fatalities**.

This adds a second important dimension because similar one-sided shares do not imply similar civilian tolls.

RSF and SFA have close one-sided-event shares, at 27% and 25%, but the displayed fatality totals differ substantially:

> **RSF: 4,515 one-sided civilian fatalities**  
> **SFA: 61,973 one-sided civilian fatalities**

The visualization therefore separates:

> **how frequently one-sided violence appears in an actor's event profile**

from:

> **the civilian toll associated with those events.**

This distinction is consistent with the analytical dataset, which stores `one_sided_event_count`, `one_sided_event_share`, and `one_sided_civilian_fatalities` as separate actor-level measures. :contentReference[oaicite:2]{index=2}

### Background imagery

Each actor row contains faded contextual imagery behind the quantitative marks.

These photographs are **not data encodings**. Their brightness, dimensions and contents do not represent values from the UCDP dataset.

Their function is editorial: they provide visual context and make the social-media representation less abstract while keeping the quantitative red marks and percentages as the primary analytical layer.

### Adaptation for Instagram

Unlike Web Visualization 3, this post is static and deliberately selective.

The interactive web version compares actors across six dimensions simultaneously and allows users to hover, select actors and reveal minor actors. The Instagram representation instead selects one particularly interpretable variable — **one-sided event share** — and supplements it with exact activity and fatality totals.

This makes the image easier to read on a mobile feed while retaining the main actor-level finding.

---

## Pros and Cons

| **Pro** | **Con** |
|---------|---------|
| The aligned lollipop marks make differences in **one-sided event share** immediately comparable between actors. | Reducing the comparison primarily to one-sided share removes several dimensions available in the full Web 3 actor profile. |
| Showing total events and civilian fatalities alongside the percentage prevents the share from being interpreted without context. | Event share and civilian fatalities use different units, so they cannot be directly compared as if they measured the same aspect of violence. |
| The three-actor structure is simple enough to understand quickly in an Instagram feed. | Focusing on three major actors excludes smaller actors whose profiles may also be relevant. |
| Exact percentage labels and the key-finding box make the main observation understandable without interaction. | A static image cannot provide the hover details, filtering or linked exploration available in the web visualization. |

---

## Knowledge: What can we learn from it?

The main question is whether the principal armed actors in Sudan exhibit the **same relationship between overall conflict activity and one-sided violence**.

The visualization shows that they do not.

If the data were presented only as a table, we could read the individual numbers, but several comparisons would require more effort:

- which actors have similar one-sided shares;
- how large the difference between 25–27% and 4% actually is;
- whether the actor with the most events also has the largest one-sided share;
- whether similar shares correspond to similar civilian fatality totals;
- which dimensions of an actor's violence profile move together and which do not.

The aligned horizontal positions make the first pattern particularly clear:

> **RSF and SFA occupy a similar position in terms of the proportion of their recorded events classified as one-sided violence, while the Government of Sudan is substantially lower.**

At the same time, the supporting numbers reveal that **share, volume and toll are not interchangeable**.

For example, the Government of Sudan has **1,307 recorded events**, more than either RSF or SFA in the graphic, but only **4%** are represented as one-sided violence.

Conversely, SFA has only **567 total events**, yet its displayed one-sided share is **25%**.

The comparison between RSF and SFA provides a second insight. Their one-sided shares are very similar, but their displayed civilian-fatality totals are not:

\[
27\% \text{ vs. } 25\%
\]

does not imply:

\[
4{,}515 \approx 61{,}973
\]

A similar **composition of events** can therefore coexist with a very different **recorded civilian toll**.

This is precisely why the actor-profile pipeline retains separate variables for event frequency, share, fatalities and geographic activity rather than combining them into one score. :contentReference[oaicite:3]{index=3}

The representation consequently provides two main pieces of knowledge:

> **Different armed actors show substantially different proportions of one-sided violence within their recorded activity.**

and:

> **Similar one-sided-event shares do not necessarily correspond to similar civilian-fatality totals.**

The image does not explain *why* these differences exist. It does not establish strategic intent, causal mechanisms, or direct equivalence between actors. It provides a descriptive comparison of how the actors' recorded UCDP event profiles differ during the selected period.

Compared with the full parallel-coordinates visualization, the Instagram post sacrifices multidimensional exploration in exchange for a much clearer social-media message:

> **The actors participating in the same war can display markedly different patterns of violence against civilians.**

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
