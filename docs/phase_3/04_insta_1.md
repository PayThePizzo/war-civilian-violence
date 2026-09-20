# Instagram Post 1

**Title**: Beyond the Frontlines: The Rise of Targeted Civilian Killings in Sudan

**Description**: **One-sided violence** is the use of armed force by a government or formally organized group against civilians, resulting in at least 25 deaths.

In contemporary conflicts, violence is increasingly extending beyond the front lines: UCDP recorded a major rise in one-sided violence in 2025, largely driven by events in Sudan. Here, a civil war began in April 2023 and has not stopped.

The visualization shows the **weekly evolution of violence in Sudan from 2023 to 2025**. The upper chart compares state-based, non-state and one-sided violence, while the lower chart shows the **share of each week’s recorded events classified as one-sided violence**, highlighting several major spikes in attacks against civilians.

Data: UCDP Georeferenced Event Dataset (GED).

![Insta 1 Screenshot](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_3/images/insta1%20-%20screenshot.png?raw=TRUE)

---

## Context: Sudan Conflict and Civilian Killing Over Time

This representation places **one-sided violence against civilians within the broader evolution of Sudan’s civil war**. The conflict began in April 2023, when fighting broke out between the Sudanese Armed Forces (SAF) and the Rapid Support Forces (RSF), initially in Khartoum before spreading across the country, particularly into Darfur and Kordofan. Since then, civilians have faced both violence linked directly to fighting and deliberate attacks outside conventional battlefield confrontations. ([United Nations][1])

UCDP defines **one-sided violence** as the use of armed force by a government or formally organized group against civilians, resulting in at least 25 deaths in a year by that actor. ([UCDP][2]) This distinction is important because it separates civilian targeting from state-based battles between armed parties and non-state fighting between organized groups.

[1]: https://www.un.org/en/un-chronicle/united-nations-not-leaving-sudan?utm_source=chatgpt.com "The United Nations Is Not Leaving the Sudan | United Nations"
[2]: https://ucdp.uu.se/downloads/replication_data/2023_ucdp-onesided-231.pdf?utm_source=chatgpt.com "1. Introduction"

---

## Representations: Stacked Area Chart and Line Chart

![Insta 1 Screenshot](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_3/images/insta1.png?raw=TRUE)

The visualization is composed of **two vertically aligned time-series plots** covering the same period.

The **upper plot** is a stacked area chart showing the weekly number of violent events, divided into **state-based violence, non-state violence, and one-sided violence**. Because the categories are stacked, it shows both the total level of violence and how each type contributes to that total over time. Here there is also a clear legend that is color-based and we chose red as the color usually communicates negative impatcs.

The **lower plot** is a line chart showing the **percentage of weekly events classified as one-sided violence**. This makes it easier to see when violence against civilians represented a particularly large share of the conflict, even in weeks where the total number of events was not especially high.

Together, the two plots portray both the **intensity** and the **composition** of violence in Sudan over time. The first shows when the conflict became more or less violent overall, while the second highlights periods in which civilian targeting became relatively more prominent.

Then, for both of them we have selected three weeks and marked them with a number (sorted by date) to highlight the worst events for one-sided compositions. This contributes to connect visible changes in the data with specific moments in the conflict.

Finally, the description and the legend help the reader understand where the data comes from, and how it was prepared for plotting.

---

## Pros and Cons

| **Pro**                                                                                   | **Con**                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Makes temporal trends and sudden spikes immediately visible                               | Exact weekly values are harder to read than in a table                    |
| Allows comparison between state-based, non-state, and one-sided violence                  | The stacked area can make smaller categories less visible                 |
| The percentage chart shows how important one-sided violence is relative to total violence | High percentages can occur even in weeks with relatively few total events |
| Annotations connect major spikes with specific events                                     | Highlighted events may draw attention away from other relevant periods    |

---

## Knowledge: What can we learn from it?

With this visualization, we wanted to examine **whether violence against civilians became a more prominent component of the Sudanese conflict over time**, rather than simply measuring how violent the war was overall.

By comparing weekly **state-based, non-state, and one-sided violence**, the first chart shows when overall violence intensified and which type of violence contributed to those peaks. The second chart focuses on the **share of weekly events classified as one-sided violence**, allowing us to see whether attacks on civilians became more frequent relative to other forms of conflict.

The highlighted weeks were selected to identify particularly significant spikes and to connect changes in the data with major episodes of civilian targeting. In short, the visualization asks: **as the war evolved, did violence increasingly move beyond fighting between armed groups and toward civilians?**

If the data stayed in tabular format, we could still retrieve exact weekly values, but **several important patterns would be much harder to perceive** and we would lose the temporal shape of the conflict.

In fact, sudden spikes, quieter phases, and changes in the composition of violence would require manually comparing many rows. The visualization makes it much easier to see when one-sided violence rises together with overall violence, and when it becomes important even if total weekly violence is not especially high.

Finally, this **form makes outliers and historically significant weeks stand out immediately**. In tabular form, instead, these kind of episodes can be buried among hundreds of observations.

---

## Pipeline from raw information to the visualizations

The post reads **one** derived file, `weekly_metrics.csv`, plus `metadata.json`, which derive from the Python pipeline. In fact, every visualization in `social/` only filters, scales and lays out the data.

**What is inside the raw dataset.**

- The UCDP Georeferenced Event Dataset (GED, v26.1) has one row per event: date range (`date_start`, `date_end`), `type_of_violence` (1 state-based, 2 non-state, 3 one-sided), the two sides, fatality estimates (`deaths_a`, `deaths_b`, `deaths_civilians`, `best`/`low`/`high`) and coordinates. The project keeps Sudan events dated 2023-04-15 to 2025-12-31.

**What is inside `weekly_metrics.csv`.**

- One row per actor × Monday-starting week. This post uses only the synthetic conflict-wide rows (`actor_id = "__ALL__"`, 143 weeks).

The columns it plots are:

| Column | Used for |
|---|---|
| `week_start` | x axis and marker positions |
| `state_based_event_count`, `non_state_event_count`, `one_sided_event_count` | the three stacked bands (they sum to `event_count`) |
| `one_sided_event_share` | the 0-100% line in the second plot |
| `one_sided_civilian_fatalities`, `event_count` | picking and captioning the three numbered weeks |

### Steps

1. **Download the raw GED** into `data/raw/GEDEvent_v26_1.csv` (kept unmodified).
2. **`01_clean_events.py`** validates required columns, unique event ids, parseable dates and `date_start <= date_end`. It restricts the data to the configured country and period, derives `combatant_fatalities`, `civilian_fatalities` and `one_sided_civilian_fatalities`, and flags (does not drop) events with invalid coordinates. Output: `data/processed/events_clean.parquet`, one row per event.
3. **`02_build_actor_events.py`** expands each event into actor × event rows. The `__ALL__` series in this post does not use this table; only the per-actor rows in the same weekly file do.
4. **`03_build_weekly_metrics.py`** assigns each event to a Monday-starting week by `date_start` and builds a complete weekly calendar. Weeks with no events are stored as `0`, not omitted. It also derives `one_sided_event_share = one_sided_event_count / event_count` (0 for empty weeks). Output: `data/derived/weekly_metrics.csv`.
5. **`07_validate_outputs.py`** runs 146 checks (all pass), including the `__ALL__` no-double-counting rule. `build_all.py` also writes `metadata.json` (country, analysis period, week convention).
6. **`npm run sync-data`** (in `social/`) copies the derived CSVs and `metadata.json` unchanged into `social/.generated/data/`.
7. **`instagram/post-01-temporal/main.ts`** loads the CSV through `shared/data.ts`, which fails loudly on schema drift and keeps missing values distinct from zero. It then:
    - keeps the `__ALL__` rows and sorts them by week;
    - draws a stacked area of the three event types (`d3-area`, UTC time scale, colors from `shared/colors.ts`) with a count scale in a left gutter;
    - draws the one-sided share as a line and area from 0 to 100%, on the same x scale;
    - picks three annotated weeks with a fixed rule: keep weeks at or above the median `event_count`, rank them by `one_sided_civilian_fatalities`, keep a week only if it is at least 28 days from those already kept, then number the three chronologically. This is the same peak metric the pipeline uses for episode detection;
    - adds a display-only label from `shared/context.ts` for known real-world events (currently "El Fasher massacre", week of 2025-10-20). It is not a UCDP field and is never used in a computation.
8. **`npm run export:instagram`** builds the pages with Vite, renders each at 1080 × 1350 px with Playwright once fonts, data and render have finished, and writes `social/output/instagram-01-temporal.png`.

Note: the y scale of the first plot counts **events per week**, not deaths. The fatality figures appear only in the numbered captions below the plots.

### Sources and tools

**Data sources**

| Source | Role |
|---|---|
| UCDP Georeferenced Event Dataset (GED) v26.1, `data/raw/GEDEvent_v26_1.csv` (codebook: `data/raw/ged261.pdf`) | the only analytical source: events, violence types, fatality estimates |
| `config/config.yaml` | country, date range, weekly resolution, Monday week start |

**Pipeline tools (Python 3.12, Poetry)**

| Tool | Use |
|---|---|
| pandas, numpy | cleaning, joins, weekly aggregation |
| pyarrow | Parquet files for `events_clean` and `actor_events` |
| pyyaml, pydantic | reading and validating `config.yaml` (`config/config_parser.py`) |
| flake8, black | linting and formatting |

**Rendering tools (`social/`, Node, TypeScript)**

| Tool | Use |
|---|---|
| Vite | multi-page build and dev server |
| TypeScript | typed CSV parsing and view code |
| D3 (`d3`) | CSV parsing, scales (`scaleUtc`, `scaleLinear`), area and line generators |
| Playwright (Chromium) | headless rendering and PNG export |
| Source Serif 4 and Public Sans | headline and label typefaces, reused from the web app's font files |
