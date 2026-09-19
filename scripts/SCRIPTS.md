Yes. I would now establish a **precise contract for the Python pipeline**, so that each script has a single responsibility, deterministic inputs and outputs, and sufficient checks to support validation across the entire pipeline.

I assume the final set is:

```text
scripts/
├── 01_clean_events.py
├── 02_build_actor_events.py
├── 03_build_weekly_metrics.py
├── 04_build_h3_metrics.py
├── 05_build_actor_profiles.py
├── 06_build_event_windows.py
├── 07_validate_outputs.py
└── build_all.py
```

with this data structure:

```text
data/
├── raw/
│   └── ucdp_ged.csv
│
├── processed/
│   ├── events_clean.parquet
│   ├── actor_events.parquet
│   └── actor_lookup.csv
│
├── derived/
│   ├── weekly_metrics.csv
│   ├── h3_weekly_metrics.csv
│   ├── actor_profiles.csv
│   ├── event_windows.csv
│   ├── metadata.json
│   └── build_manifest.json
│
└── validation/
    ├── validation_report.json
    └── validation_failures.csv
```

This remains consistent with the established plan: Web 1 uses weekly metrics, Web 2 uses H3 metrics, Web 3 uses actor profiles, and Web 4 uses episode-centred windows.

---

# Shared conventions

Before addressing individual scripts, I would establish a few definitions that **must not change from one script to another**.

## Temporal definition

We use the following as the primary event date:

```python
event_date = date_start
```

and define the week as:

```python
week_start = event_date.to_period("W-SUN").start_time
```

so the week runs:

```text
Monday → Sunday
```

For example:

```text
2024-06-03 ... 2024-06-09
→ week_start = 2024-06-03
```

---

## Types of violence

We define:

```python
STATE_BASED = 1
NON_STATE = 2
ONE_SIDED = 3
```

and:

```python
is_combat = type_of_violence in {1, 2}
is_one_sided = type_of_violence == 3
```

This distinction is fundamental to all visualizations.

---

## Fatalities

We keep the following separate:

```text
deaths_a
deaths_b
deaths_civilians
deaths_unknown

low
best
high
```

and derive:

```python
combatant_fatalities = deaths_a + deaths_b
```

but **only for `type_of_violence ∈ {1,2}`**.

In addition:

```python
civilian_fatalities = deaths_civilians
```

and:

```python
one_sided_civilian_fatalities = (
    deaths_civilians if type_of_violence == 3 else 0
)
```

This avoids confusing:

```text
civilians killed during combat
```

with:

```text
civilians deliberately targeted in one-sided violence
```

---

# 01 - `01_clean_events.py`

## Responsibility

Transform the original GED into an event-level dataset that is:

```text
cleaned
filtered
typed
validated
```

without changing the unit of observation at this stage.

So:

> **1 input row = 1 UCDP event = 1 output row.**

---

## Expected input

```text
data/raw/GEDEvent_v26_1.csv
```

The actual path can be read from:

```text
config/config.yaml
```

but this is the expected canonical name.

### Required columns

At minimum:

```text
id

date_start
date_end
date_prec

type_of_violence

conflict_new_id
conflict_name
dyad_new_id
dyad_name

side_a_new_id
side_a
side_b_new_id
side_b

country
adm_1
adm_2
where_coordinates

latitude
longitude

deaths_a
deaths_b
deaths_civilians
deaths_unknown

low
best
high
```

If any of these is missing, the script must terminate with an error.

---

## Configuration used

From `config/config.yaml`:

```yaml
analysis:
  country: "Sudan"
  start_date: "2023-04-15"
  end_date: "2025-12-31"
```

---

## Transformations

### 1. Validate the schema

Pseudocode:

```python
required = {...}

missing = required - set(df.columns)

if missing:
    raise SchemaError(missing)
```

### Why

This prevents running the pipeline on an incompatible GED version or the wrong file.

---

### 2. Validate the event key

```python
assert id.notna().all()
assert id.is_unique
```

If `id` is not unique:

```text
FAIL
```

do not silently deduplicate.

### Why

All subsequent steps assume:

```text
event_id = primary key
```

---

### 3. Rename the key

```python
id → event_id
```

This makes its meaning clearer in the derived datasets.

---

### 4. Parse dates

```python
date_start = pd.to_datetime(date_start)
date_end   = pd.to_datetime(date_end)
```

Check:

```python
date_start.notna()
date_end.notna()

date_start <= date_end
```

Events with dates that cannot be parsed:

```text
FAIL
```

are not simply discarded.

---

### 5. Filter by country

Preliminary normalization:

```python
country_clean = country.str.strip()
```

Then:

```python
df = df[df.country_clean == config.country]
```

Check:

```python
len(df) > 0
```

---

### 6. Filter by period

We retain events where:

```python
start_date <= date_start <= end_date
```

For this project, I would use `date_start` as the date for temporal assignment.

Pseudocode:

```python
df = df[
    df["date_start"].between(
        config.start_date,
        config.end_date
    )
]
```

---

### 7. Check `type_of_violence`

```python
allowed = {1, 2, 3}
```

Check:

```python
set(df.type_of_violence.unique()) <= allowed
```

Values outside `{1,2,3}`:

```text
FAIL
```

---

### 8. Human-readable label

Create:

```python
violence_type_label
```

mapping:

```python
{
    1: "state_based",
    2: "non_state",
    3: "one_sided"
}
```

---

### 9. Boolean variables

Create:

```python
is_combat
is_one_sided
```

with:

```python
is_combat = type_of_violence.isin([1, 2])
is_one_sided = type_of_violence.eq(3)
```

---

### 10. Numeric fatality fields

Convert:

```text
deaths_a
deaths_b
deaths_civilians
deaths_unknown
low
best
high
```

to numeric values.

Check:

```python
value >= 0
```

No fatality count can be negative.

---

### 11. Check `low / best / high`

When all three are available:

```python
low <= best <= high
```

Violations:

```text
FAIL
```

or at least a very strong warning.

I would make this a `FAIL`, because it is a fundamental invariant of what these columns mean.

---

### 12. Derived fatality fields

```python
combatant_fatalities = np.where(
    is_combat,
    deaths_a + deaths_b,
    0
)
```

```python
civilian_fatalities = deaths_civilians
```

```python
one_sided_civilian_fatalities = np.where(
    is_one_sided,
    deaths_civilians,
    0
)
```

---

### 13. Check one-sided events

For events:

```python
type_of_violence == 3
```

we check that:

```python
side_a.notna()
```

I would not enforce:

```python
deaths_a == 0
deaths_b == 0
```

as a condition that rejects data without first checking the actual dataset.

I would record it as a:

```text
diagnostic check
```

possibly issuing a warning.

---

### 14. Coordinates

Convert:

```python
latitude
longitude
```

to floats.

A coordinate is valid if:

```python
-90 <= latitude <= 90
-180 <= longitude <= 180
```

Create:

```python
spatial_eligible
```

```python
spatial_eligible = (
    latitude.notna()
    & longitude.notna()
    & latitude.between(-90, 90)
    & longitude.between(-180, 180)
)
```

Do not remove events without coordinates.

### Why

Web 1, 3, and 4 can still use them.

Only Web 2 requires valid coordinates.

---

### 15. Text normalization

For:

```text
side_a
side_b
conflict_name
dyad_name
adm_1
adm_2
where_coordinates
```

only apply:

```python
.str.strip()
```

Do not aggressively normalize actor names here.

---

### 16. Sorting

```python
df.sort_values(
    ["date_start", "event_id"]
)
```

---

## Output

```text
data/processed/events_clean.parquet
```

### Contents

One row per event.

Canonical schema:

```text
event_id

date_start
date_end
date_prec

type_of_violence
violence_type_label
is_combat
is_one_sided

conflict_new_id
conflict_name

dyad_new_id
dyad_name

side_a_new_id
side_a

side_b_new_id
side_b

country
adm_1
adm_2
where_coordinates

latitude
longitude
spatial_eligible

deaths_a
deaths_b
deaths_civilians
deaths_unknown

combatant_fatalities
civilian_fatalities
one_sided_civilian_fatalities

low
best
high
```

---

## Module documentation

```python
"""
Clean and validate the raw UCDP Georeferenced Event Dataset used by the
project.

This module implements the first stage of the analytical pipeline. Its
responsibility is to transform the original UCDP GED file into a clean,
project-specific event-level dataset while preserving the original event as
the unit of observation.

The script does not perform actor expansion, weekly aggregation, spatial
aggregation, episode detection, or visualization-specific transformations.
Those operations are intentionally delegated to later stages of the pipeline.

Expected input
--------------
The script expects the raw UCDP GED CSV file at:

    data/raw/GEDEvent_v26_1.csv

or at the alternative path specified in the project configuration.

The input must contain, at minimum, the fields required to identify events,
dates, violence types, actors, fatalities, and geographic locations. These
include:

    id
    date_start
    date_end
    date_prec
    type_of_violence
    conflict_new_id
    conflict_name
    dyad_new_id
    dyad_name
    side_a_new_id
    side_a
    side_b_new_id
    side_b
    country
    adm_1
    adm_2
    where_coordinates
    latitude
    longitude
    deaths_a
    deaths_b
    deaths_civilians
    deaths_unknown
    low
    best
    high

Configuration
-------------
The country and temporal scope of the analysis are read from the project
configuration. For the current project the intended scope is Sudan during
the selected conflict period.

The configuration determines, at minimum:

    analysis.country
    analysis.start_date
    analysis.end_date

Processing
----------
The module performs the following operations:

1. Validate that all required columns are present.
2. Validate that the UCDP event identifier is non-null and unique.
3. Rename the raw `id` field to `event_id`.
4. Parse `date_start` and `date_end` as dates.
5. Validate that event start dates are not later than event end dates.
6. Restrict the dataset to the configured country.
7. Restrict the dataset to events whose `date_start` falls within the
   configured analysis period.
8. Validate `type_of_violence` against the supported UCDP categories
   {1, 2, 3}.
9. Create readable violence-type labels.
10. Derive boolean indicators for combat events and one-sided violence.
11. Convert fatality fields to numeric values.
12. Reject negative fatality counts.
13. Validate the expected ordering low <= best <= high where all three
    estimates are available.
14. Derive combatant, civilian, and one-sided civilian fatality variables.
15. Parse and validate geographic coordinates.
16. Create `spatial_eligible`, indicating whether an event can be used in
    geographic aggregation.
17. Apply conservative whitespace normalization to descriptive text fields.
18. Sort the output deterministically by event date and event identifier.

Important methodological definitions
------------------------------------
Events with `type_of_violence` equal to 1 or 2 are treated as direct combat
events for the purposes of this project.

Events with `type_of_violence` equal to 3 are treated as one-sided violence.

`combatant_fatalities` is defined as deaths_a + deaths_b for direct combat
events only.

`civilian_fatalities` preserves deaths_civilians for every violence type.

`one_sided_civilian_fatalities` contains deaths_civilians only for
one-sided violence events and is zero otherwise.

Events with missing or invalid coordinates are retained. They remain useful
for temporal and actor-based analyses but receive `spatial_eligible = False`
and are excluded from geographic aggregation in later stages.

Output
------
The script writes:

    data/processed/events_clean.parquet

The output contains exactly one row per retained UCDP event and forms the
canonical event-level input for all subsequent preprocessing stages.

Failure behaviour
-----------------
The script should fail loudly rather than silently repair data when any of
the following conditions occur:

- required columns are missing;
- event identifiers are null or duplicated;
- event dates cannot be parsed;
- event start dates occur after event end dates;
- unsupported violence-type values are present;
- fatality counts are negative;
- fatality estimate bounds violate low <= best <= high.

Invalid or missing geographic coordinates do not cause pipeline failure.
Instead, affected events are marked as spatially ineligible.

The script should print or log a concise processing summary including the
number of raw records, records retained after country filtering, records
retained after temporal filtering, records by violence type, and the number
and proportion of spatially eligible events.
"""
```

---

## Implementation decisions

Built in `01_clean_events.py` as a pure-function pipeline (`load_raw`,
`validate_schema`, `validate_event_key`, `parse_dates`, `filter_country`,
`filter_period`, `validate_violence_type`, `add_violence_labels`,
`clean_fatalities`, `derive_fatality_fields`, `check_one_sided_actor`,
`validate_coordinates`, `normalize_text_fields`, `finalize`,
`print_summary`, `main`), each step taking/returning a `DataFrame` so it can
be tested in isolation.

- The stub's `from project_paths import conf_path` line was extended to
  also import `raw_dataset_csv`, `events_clean`, `processed_data_dir` - the
  stub only imported `conf_path`.
- Violence-type codes and labels are read from
  `config.analysis.violence_types` (`state_based`/`non_state`/`one_sided`)
  instead of hardcoding `{1, 2, 3}`, so the script stays correct if the
  configured codes ever change.
- Added a custom `SchemaError(Exception)` for the missing-required-columns
  case (step 1), distinct from the `ValueError`s used for every other
  fail-loud condition.
- `normalize_text_fields` casts to `str` before `.str.strip()`, which turns
  genuine `NaN` into the string `"nan"`; that is mapped back to `np.nan`
  immediately after stripping so missingness isn't corrupted.
- Output columns are written in the exact order given in `## Output ->
  Contents` above, via an explicit `CANONICAL_COLUMN_ORDER` list, not
  insertion order.
- `main()` creates `processed_data_dir` with `os.makedirs(..., exist_ok=True)`
  before writing, since `project_paths.py` deliberately never creates
  directories itself.
- Built, not run - no raw GED file has been executed against it yet.

---

# 02 - `02_build_actor_events.py`

## Responsibility

Convert:

```text
1 row = event
```

into:

```text
1 row = actor × event
```

to allow the same actor to be analyzed across multiple types of violence.

---

## Expected input

```text
data/processed/events_clean.parquet
```

Expected invariants:

```text
event_id unique
type_of_violence ∈ {1,2,3}
date_start parsed
fatality fields numeric
```

---

## Transformations

### 1. Validate the input

Check at least:

```python
event_id.is_unique
event_id.notna().all()
```

and verify that the schema produced by script 01 is present.

---

### 2. Construct actor identities

Prefer:

```text
side_a_new_id
side_b_new_id
```

as identifiers.

Create:

```python
actor_id = f"ucdp:{side_new_id}"
```

Example:

```text
ucdp:1234
```

If `*_new_id` is missing but the name exists:

```python
actor_id = "name:" + normalized_name
```

but log a warning.

This fallback should not be the normal behavior.

---

### 3. Combat events

For:

```python
type_of_violence in {1, 2}
```

create two rows.

From:

```text
event E
side_a = SAF
side_b = RSF
```

to:

```text
E | SAF | side_a
E | RSF | side_b
```

---

### 4. One-sided events

For:

```python
type_of_violence == 3
```

create only the row for:

```text
side_a
```

which represents the armed actor.

Do not create:

```text
actor = civilians
```

---

### 5. Actor role

Create:

```text
actor_role
```

values:

```text
side_a
side_b
```

and:

```text
is_one_sided_perpetrator
```

which is `True` only for `side_a` in one-sided events.

---

### 6. Actor-specific fatalities

Create:

```python
actor_deaths_suffered
```

with:

```python
if actor_role == "side_a":
    deaths_a
elif actor_role == "side_b":
    deaths_b
```

For one-sided events:

```text
actor_deaths_suffered
```

should not be interpreted as a central measure and can still be derived from the corresponding UCDP value.

---

### 7. Replicated event metrics

Each actor-event row retains:

```text
combatant_fatalities
civilian_fatalities
one_sided_civilian_fatalities
best
low
high
```

These describe the event in which the actor is involved.

---

### 8. Check for duplicates

The pair:

```text
event_id + actor_id
```

must be unique.

If the same pair is generated twice:

```text
FAIL
```

---

### 9. Actor lookup

Build a separate table:

```text
actor_id
actor_name
```

Check:

an `actor_id` should map to a single canonical name.

If the same ID appears with multiple text variants:

* choose the most frequent name;
* preserve the mapping in memory or logs;
* issue a warning.

---

## Output 1

```text
data/processed/actor_events.parquet
```

Contains:

```text
event_id

actor_id
actor_name
actor_role
is_one_sided_perpetrator

date_start
type_of_violence
is_combat
is_one_sided

combatant_fatalities
actor_deaths_suffered
civilian_fatalities
one_sided_civilian_fatalities

best
low
high

latitude
longitude
spatial_eligible

adm_1
adm_2
where_coordinates
```

---

## Output 2

```text
data/processed/actor_lookup.csv
```

Contains:

```text
actor_id
actor_name
event_count
first_event_date
last_event_date
```

---

## Module documentation

```python
"""
Build the actor-event representation used by actor-specific analyses.

This module converts the cleaned event-level UCDP dataset into a long-form
representation in which each row describes the participation of one armed
actor in one event.

The transformation is required because the raw UCDP event table represents
actors in separate `side_a` and `side_b` columns. That format is appropriate
for describing individual conflict events but inconvenient for answering
questions such as:

- How frequently was a specific actor involved in direct combat?
- How frequently was the same actor associated with one-sided violence?
- How many fatalities occurred in events involving that actor?
- How did an actor's geographic or temporal violence profile change?

The actor-event table provides a consistent actor-centric representation
without changing the original event-level dataset.

Expected input
--------------
The script expects:

    data/processed/events_clean.parquet

The input must have been produced by `01_clean_events.py` and must therefore
contain unique event identifiers, parsed dates, validated violence types,
fatality fields, geographic fields, and the derived combat/one-sided flags.

Actor expansion rules
---------------------
For state-based and non-state conflict events (`type_of_violence` equal to
1 or 2), both armed sides are represented.

For example:

    event_id = E1
    side_a   = Actor A
    side_b   = Actor B

becomes:

    E1 | Actor A | side_a
    E1 | Actor B | side_b

For one-sided violence (`type_of_violence` equal to 3), only the armed actor
is represented. The civilian side is deliberately excluded from the actor
table because civilians are not an armed actor to be compared in the actor
profile visualization.

Actor identity
--------------
Stable UCDP actor identifiers should be preferred over actor names.

The canonical actor identifier should be constructed from the relevant
`side_*_new_id` value. Human-readable actor names are retained separately.

If a stable UCDP actor identifier is unexpectedly unavailable, a normalized
name-based fallback may be used, but the condition must be reported as a
warning because name-based identifiers are less robust.

Actor-specific fatalities
--------------------------
`actor_deaths_suffered` represents fatalities attributed to the selected
actor side:

    side_a -> deaths_a
    side_b -> deaths_b

Other event-level fatality variables are preserved because they describe
the context of the event in which the actor participated.

In particular:

    combatant_fatalities
    civilian_fatalities
    one_sided_civilian_fatalities
    best
    low
    high

are copied from the canonical event-level dataset.

Important counting rule
-----------------------
An event involving two armed actors appears twice in this actor-centric
dataset, once for each actor.

This is intentional.

The actor-event table must never be summed across all actors to reconstruct
the total number of unique conflict events. Dataset-wide totals must always
be computed from `events_clean.parquet`.

This distinction prevents double counting.

Validation
----------
The module verifies:

- the expected input schema;
- uniqueness of the cleaned event identifier;
- availability of an armed actor for each generated actor-event row;
- uniqueness of the `(event_id, actor_id)` pair;
- consistency between actor identifiers and actor names.

Multiple textual names associated with the same UCDP actor identifier should
be reported. A deterministic canonical name may be selected, preferably the
most frequently observed non-empty label.

Outputs
-------
The primary output is:

    data/processed/actor_events.parquet

It contains one row for each armed actor participating in each retained UCDP
event.

The secondary output is:

    data/processed/actor_lookup.csv

It contains one row per canonical actor and provides a stable mapping between
actor identifiers and display names, together with basic activity metadata.

The outputs serve as inputs for weekly actor metrics, spatial actor metrics,
actor profiles, and event-centred analyses.
"""
```

---

## Implementation decisions

Built in `02_build_actor_events.py`, structured as `load_events_clean`,
`validate_input`, `normalize_actor_name`, `build_actor_id_series`,
`expand_side`, `expand_actor_events`, `report_actor_id_fallback_usage`,
`validate_actor_event_pairs`, `build_actor_lookup`, `finalize_actor_events`,
`print_summary`, `main`.

- The stub's imports were broken (`from project_paths import conf_dir,
  conf_path, data_dir, log_dir, run_dir, calib_dir` - `log_dir`, `run_dir`,
  `calib_dir` don't exist in `project_paths.py`). Replaced with `conf_path,
  events_clean, actor_events, actor_lookup, processed_data_dir`; also
  dropped the unused `save_to_config` import.
- `expand_side(df, side)` builds one side's rows (`"a"` or `"b"`) at a
  time; `expand_actor_events` calls it on the combat subset for both sides
  and on the one-sided subset for side `"a"` only, then concatenates -
  matches the "two rows for combat / one row for one-sided" rule directly
  in the row-construction step rather than as a post-filter.
- `build_actor_id_series` prefers `ucdp:<int(side_new_id)>`; the
  name-based `name:<normalized>` fallback only fires per-row when
  `side_*_new_id` is null. `normalize_actor_name` lowercases, collapses
  whitespace to `_`, and strips any character outside `[a-z0-9_]`.
- Fallback usage is tracked via an internal `_used_id_fallback` boolean
  column, reported by `report_actor_id_fallback_usage` (warn, not fail),
  then dropped by `finalize_actor_events`'s explicit
  `ACTOR_EVENTS_COLUMN_ORDER` slice - never reaches the parquet output.
- `validate_actor_event_pairs` is the only hard fail in this script
  (duplicate `(event_id, actor_id)`), matching the "FAIL" call in
  SCRIPTS.md step 8. Missing `side_*_new_id` and actor-name ambiguity are
  both warn-only, per steps 2 and 9.
- `build_actor_lookup` picks the canonical name by highest occurrence
  count per `actor_id` (stable sort breaks ties), and separately reports
  (warns) every `actor_id` with more than one distinct observed name.
- `main()` creates `processed_data_dir` before writing both outputs.
- Built, not run.

---

# 03 - `03_build_weekly_metrics.py`

## Responsibility

Produce the dataset for Web 1:

> **WHEN?**

with one row per:

```text
week × actor
```

plus a special series:

```text
actor_id = "__ALL__"
```

that represents the entire conflict without double counting.

---

## Expected input

```text
data/processed/events_clean.parquet
data/processed/actor_events.parquet
```

---

## Transformations

### 1. Create `week_start`

For both datasets:

```python
week_start = Monday of event week
```

---

### 2. Create a complete weekly grid

From:

```text
analysis.start_date
```

to:

```text
analysis.end_date
```

create every week.

This also represents weeks with:

```text
zero events
```

instead of making them disappear from the chart.

---

### 3. Global aggregation

Use **`events_clean`**, not `actor_events`.

Group:

```python
groupby(week_start)
```

Calculate:

```text
event_count

state_based_event_count
non_state_event_count
one_sided_event_count

combat_event_count

combatant_fatalities
civilian_fatalities
one_sided_civilian_fatalities

best_fatalities
low_fatalities
high_fatalities

active_location_count
```

Add:

```text
actor_id   = "__ALL__"
actor_name = "All actors"
```

---

### 4. Aggregation by actor

Use:

```text
actor_events
```

Group:

```python
groupby(["actor_id", "actor_name", "week_start"])
```

The same metrics.

For events:

```text
event_count
```

use:

```python
nunique(event_id)
```

not `len(group)`.

---

### 5. Active locations

Initial definition:

```python
nunique(where_coordinates)
```

considering non-null values.

---

### 6. Share

Create:

```python
one_sided_event_share = (
    one_sided_event_count / event_count
)
```

If:

```text
event_count = 0
```

then:

```text
one_sided_event_share = 0
```

---

### 7. Complete zero weeks

For each active actor:

```text
actor × all weeks
```

fill missing additive metrics with:

```text
0
```

This makes the timeline continuous over time.

---

### 8. Check `__ALL__`

For each week:

```text
weekly_metrics(__ALL__).event_count
```

must equal:

```text
number of unique events_clean.event_id
in that week
```

---

## Output

```text
data/derived/weekly_metrics.csv
```

Schema:

```text
week_start

actor_id
actor_name

event_count
state_based_event_count
non_state_event_count
one_sided_event_count
combat_event_count

combatant_fatalities
civilian_fatalities
one_sided_civilian_fatalities

best_fatalities
low_fatalities
high_fatalities

active_location_count

one_sided_event_share
```

---

## Module documentation

```python
"""
Build weekly conflict metrics for the temporal visualization.

This module produces the canonical weekly dataset used by Web Visualization 1
and by later event-centred analyses.

The output contains both conflict-wide weekly observations and actor-specific
weekly observations.

The conflict-wide series is identified by:

    actor_id = "__ALL__"

and must be computed directly from the unique event-level dataset.

Actor-specific series are computed from the actor-event dataset.

This distinction is essential because a direct combat event can involve two
armed actors and therefore appears twice in the actor-event representation.
Summing actor-level observations would consequently double-count many events.

Expected inputs
---------------
The module expects:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet

Both files must satisfy the contracts defined by the preceding preprocessing
stages.

Temporal aggregation
--------------------
Each event is assigned to a Monday-starting week using its `date_start`.

The module constructs a complete weekly calendar spanning the configured
analysis period.

Missing actor-week combinations within the observation period are explicitly
represented with zero-valued additive metrics. This is required so that the
frontend can distinguish a week with no recorded activity from a missing row.

Metrics
-------
For each week, the module computes:

    event_count
    state_based_event_count
    non_state_event_count
    one_sided_event_count
    combat_event_count
    combatant_fatalities
    civilian_fatalities
    one_sided_civilian_fatalities
    best_fatalities
    low_fatalities
    high_fatalities
    active_location_count
    one_sided_event_share

`event_count` is always based on unique UCDP event identifiers.

`one_sided_event_share` is defined as:

    one_sided_event_count / event_count

and is set to zero for weeks with zero events.

Global and actor-specific series
--------------------------------
Global metrics are computed from `events_clean.parquet`.

Actor-specific metrics are computed from `actor_events.parquet`.

The global series receives:

    actor_id   = "__ALL__"
    actor_name = "All actors"

The global series must never be reconstructed by summing actor-level rows.

Validation
----------
The module checks that:

- input schemas are valid;
- weekly dates fall within the configured analysis period;
- event counts are non-negative;
- fatality metrics are non-negative;
- one-sided shares lie in [0, 1];
- the three violence-type event counts sum to the total event count;
- the combat event count equals the sum of state-based and non-state events;
- global weekly event counts match direct aggregation from unique cleaned
  events.

Output
------
The script writes:

    data/derived/weekly_metrics.csv

The output contains one row for each actor-week combination, including zero
weeks, plus the special `__ALL__` series representing the conflict as a
whole.

The dataset is the primary input of the interactive temporal visualization
and is also used as the base time series for event-window construction.
"""
```

---

## Implementation decisions

Built in `03_build_weekly_metrics.py`, structured as `load_events_clean`,
`load_actor_events`, `validate_inputs`, `compute_week_start`,
`build_full_week_grid`, `aggregate_global`, `build_canonical_actor_names`,
`aggregate_actors`, `validate_weekly_metrics`, `finalize`, `print_summary`,
`main`.

- The stub only imported `conf_path`; extended to also import
  `events_clean`, `actor_events`, `weekly_metrics`, `derived_data_dir`.
- **Schema deviation from this script's own docstring, resolved in favor
  of `data/DATA_FILES.md`** (repo-wide authority order: DATA_FILES.md >
  SCRIPTS.md, per `CLAUDE.md`): the output includes `actor_deaths_suffered`,
  `NA` for `actor_id = "__ALL__"`. This section's original "Metrics" list
  above omits it, but DATA_FILES.md §5 requires it, and this same file's
  closing "One change I would make to the previous plan" note (bottom of
  this document) explicitly calls for adding it here. The module docstring
  in the script itself documents this.
- Actor display names are **not** read from `actor_lookup.csv` (not a
  declared input of this stage). Instead `build_canonical_actor_names`
  re-derives a stable `actor_id -> actor_name` mapping in-script, by the
  same most-frequent-non-null-name technique used in
  `02_build_actor_events.py`'s `build_actor_lookup`. Grouping directly by
  the raw per-event `actor_name` would otherwise fragment one actor's
  weekly series whenever its recorded name varies by event; documented in
  the module docstring as an explicit deviation.
- `compute_week_start` implements the shared `W-SUN period -> start_time`
  convention exactly as specified at the top of this document, independent
  of `config.temporal.week_start` (that config value is descriptive only;
  the Monday-anchoring is structural, not configurable).
- Violence-type membership (`state_based_event_count` etc.) is computed
  from `config.analysis.violence_types` codes, not hardcoded `1/2/3`,
  matching the convention established in `01_clean_events.py`.
- Zero-week completion in `aggregate_actors` reindexes only over actors
  that actually appear in `actor_events` (`actor_ids = df["actor_id"].unique()`)
  crossed with the full week grid - not the full theoretical actor
  universe, since an actor with zero recorded activity never appears in
  `actor_events` at all.
- `validate_weekly_metrics` re-derives the `__ALL__` series independently
  from `events_clean` and cross-checks it against the assembled output -
  duplicates part of what `07_validate_outputs.py` will do at the
  pipeline-integrity-gate level, kept here as an in-script fail-fast check
  (defense in depth, not a replacement for step 07).
- `main()` creates `derived_data_dir` before writing.
- Built, not run.

---

# 04 - `04_build_h3_metrics.py`

## Responsibility

Produce the data for Web 2:

> **WHERE?**

by aggregating events into H3 cells.

---

## Expected input

```text
data/processed/events_clean.parquet
data/processed/actor_events.parquet
```

Config:

```yaml
spatial:
  h3_resolution: 5
```

---

## Transformations

### 1. Filter spatially valid events

```python
df = df[df.spatial_eligible]
```

Only in this script.

---

### 2. Generate H3 indices

```python
h3_id = h3.latlng_to_cell(
    latitude,
    longitude,
    resolution
)
```

---

### 3. Validate H3 indices

Check:

```python
h3.is_valid_cell(h3_id)
```

and:

```python
h3.get_resolution(h3_id) == config_resolution
```

---

### 4. Calculate cell centres

```python
h3_center_lat
h3_center_lon
```

useful for debugging and other outputs.

---

### 5. Global aggregation

Use `events_clean`.

Group:

```text
week_start × h3_id
```

with:

```text
actor_id = "__ALL__"
```

---

### 6. Actor aggregation

Use actor_events.

Group:

```text
actor_id × week_start × h3_id
```

---

### 7. Metrics

```text
event_count

state_based_event_count
non_state_event_count
one_sided_event_count
combat_event_count

combatant_fatalities
civilian_fatalities
one_sided_civilian_fatalities

best_fatalities

one_sided_event_share
civilian_fatality_share
one_sided_civilian_fatality_share
```

---

### 8. Fatality shares

```python
civilian_fatality_share = (
    civilian_fatalities / best_fatalities
)
```

if `best_fatalities > 0`; otherwise, `0`.

And:

```python
one_sided_civilian_fatality_share = (
    one_sided_civilian_fatalities
    / best_fatalities
)
```

---

### 9. Check event conservation

For `__ALL__`:

```text
sum event_count across H3 cells
```

must equal the number of events where:

```text
spatial_eligible == True
```

for the same week.

---

## Output

```text
data/derived/h3_weekly_metrics.csv
```

Schema:

```text
week_start

actor_id
actor_name

h3_id
h3_resolution
h3_center_lat
h3_center_lon

event_count

state_based_event_count
non_state_event_count
one_sided_event_count
combat_event_count

combatant_fatalities
civilian_fatalities
one_sided_civilian_fatalities

best_fatalities

one_sided_event_share
civilian_fatality_share
one_sided_civilian_fatality_share
```

---

## Module documentation

```python
"""
Build weekly H3 spatial aggregations for the conflict map.

This module produces the spatial dataset used by Web Visualization 2.

Only events with valid geographic coordinates are included. Events excluded
from this stage remain available to non-spatial analyses.

The module assigns each eligible event to an H3 cell at the resolution
configured for the project and aggregates conflict metrics by week, H3 cell,
and actor.

Expected inputs
---------------
The script expects:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet

The project configuration must define:

    spatial.h3_resolution

Only rows with `spatial_eligible = True` are considered.

H3 assignment
--------------
Each valid latitude/longitude pair is converted to an H3 cell using the
configured resolution.

The generated cell identifier is validated and its resolution must match the
configured resolution.

The geographic centre of each H3 cell is also stored to simplify debugging,
inspection, and potential downstream uses.

Aggregation levels
------------------
Two classes of records are generated.

Conflict-wide records are computed directly from the unique event table and
receive:

    actor_id = "__ALL__"

Actor-specific records are computed from the actor-event table.

As in the weekly temporal dataset, global values must never be reconstructed
by summing actor-specific rows because combat events may appear once for each
participating actor.

Metrics
-------
For each week/H3/actor combination the module computes:

    event_count
    state_based_event_count
    non_state_event_count
    one_sided_event_count
    combat_event_count
    combatant_fatalities
    civilian_fatalities
    one_sided_civilian_fatalities
    best_fatalities
    one_sided_event_share
    civilian_fatality_share
    one_sided_civilian_fatality_share

Shares with a zero denominator are defined as zero.

Validation
----------
The module verifies:

- all included rows have valid coordinates;
- every generated H3 identifier is valid;
- every H3 cell uses the configured resolution;
- event and fatality counts are non-negative;
- all shares lie between zero and one;
- violence-type event counts sum correctly;
- global H3 event counts for each week equal the number of spatially eligible
  unique events for that week.

Output
------
The script writes:

    data/derived/h3_weekly_metrics.csv

Each row represents one actor-week-H3 combination or one conflict-wide
week-H3 combination.

This file is the canonical input for the interactive spatio-temporal H3 map.
"""
```

---

## Implementation decisions

Built in `04_build_h3_metrics.py`, structured as `load_events_clean`,
`load_actor_events`, `validate_inputs`, `filter_spatially_eligible`,
`compute_week_start`, `assign_h3_cells`, `build_h3_centers`,
`build_canonical_actor_names`, `add_shares`, `aggregate_global`,
`aggregate_actors`, `validate_h3_metrics`, `finalize`, `print_summary`,
`main`.

- The stub only imported `conf_path`; extended to also import
  `events_clean`, `actor_events`, `h3_weekly_metrics`, `derived_data_dir`.
  Added the `h3` package import (already a `pyproject.toml` dependency,
  `h3 = "^4.5.0"`) - v4 API: `h3.latlng_to_cell`, `h3.is_valid_cell`,
  `h3.get_resolution`, `h3.cell_to_latlng`.
- `filter_spatially_eligible` is applied independently to both
  `events_clean` and `actor_events` before H3 assignment - this is the
  only script in the pipeline that drops rows on `spatial_eligible`; every
  other stage retains spatially ineligible rows.
- `assign_h3_cells` computes `h3_id` row-by-row via `DataFrame.apply`
  (the `h3` package has no native vectorized/batch API), then hard-fails
  (`ValueError`) if any generated cell is invalid or resolves to a
  different resolution than configured - matches steps 2-3's "Check" call
  exactly as a post-generation assertion rather than a pre-condition.
- `build_h3_centers` computes `h3.cell_to_latlng` once per **distinct**
  `h3_id` (via `.unique()` before mapping), not once per row, then joins
  the result back onto both aggregated frames in `finalize` - avoids
  redundant per-row center computation for cells that recur across many
  weeks/actors.
- **No complete week x H3-cell grid is built** here, unlike
  `03_build_weekly_metrics.py`'s full weekly calendar. Documented
  explicitly in the module docstring as a deliberate deviation from that
  script's zero-fill pattern: a dense grid over all cells x all weeks
  would be dominated by (week, cell) pairs with no conflict activity,
  which doesn't help the map and would bloat the output. Only (week,
  h3_id) combinations with at least one event appear.
- Actor display names are re-derived in-script
  (`build_canonical_actor_names`), same technique and same rationale as
  `03_build_weekly_metrics.py` - `actor_lookup.csv` is not a declared
  input of this stage.
- Violence-type membership counts use `config.analysis.violence_types`
  codes, not hardcoded `1/2/3`, matching every earlier script.
- `add_shares` is shared by both `aggregate_global` and `aggregate_actors`
  to guarantee the zero-denominator-to-zero rule (step 8) is applied
  identically to both series, rather than duplicating the `np.where` logic
  twice.
- `validate_h3_metrics` re-derives the spatial-conservation check (step 9
  / DATA_FILES.md invariant) independently from the spatially eligible
  subset of `events_clean` - same defense-in-depth relationship to
  `07_validate_outputs.py` as `03_build_weekly_metrics.py`'s analogous
  check.
- `main()` creates `derived_data_dir` before writing.
- Built, not run.

---

# 05 - `05_build_actor_profiles.py`

## Responsibility

Produce the data for Web 3:

> **WHO?**

One row per actor, containing its multidimensional profile.

---

## Expected input

```text
data/processed/actor_events.parquet
data/processed/actor_lookup.csv
```

Config:

```yaml
actors:
  min_events: 5
```

---

## Transformations

### 1. Group actor

```python
groupby(["actor_id", "actor_name"])
```

---

### 2. Activity period

Calculate:

```text
first_event_date
last_event_date
```

---

### 3. Active weeks

Create `week_start` and count:

```python
active_week_count = nunique(week_start)
```

---

### 4. Total events

```python
total_event_count = nunique(event_id)
```

---

### 5. Combat events

```python
combat_event_count
```

unique events where:

```text
is_combat == True
```

---

### 6. One-sided events

```python
one_sided_event_count
```

unique events where:

```text
is_one_sided == True
```

---

### 7. Fatalities in events involving the actor

```text
combatant_fatalities_in_involved_events
```

Sum of `combatant_fatalities` from combat events involving the actor.

This **does not mean fatalities suffered by the actor**.

---

### 8. Actor deaths suffered

Separately:

```text
actor_deaths_suffered
```

Sum of the variable with the same name.

---

### 9. Civilian fatalities

```text
civilian_fatalities_in_involved_events
```

and:

```text
one_sided_civilian_fatalities
```

---

### 10. Share

```python
one_sided_event_share = (
    one_sided_event_count
    / total_event_count
)
```

---

### 11. Geographic spread

Valid coordinates only.

Calculate H3 indices using the same resolution as Web 2.

```python
active_h3_cell_count = nunique(h3_id)
```

And:

```python
active_location_count = nunique(where_coordinates)
```

---

### 12. Activity rates

```python
events_per_active_week
```

and:

```python
one_sided_events_per_active_week
```

and:

```python
civilian_fatalities_per_active_week
```

---

### 13. Web 3 eligibility

Do not remove actors with few events.

Create:

```python
eligible_for_web3 = (
    total_event_count >= min_events
)
```

This preserves all information while allowing the frontend to filter.

---

### 14. Check

For each actor:

```text
combat_event_count + one_sided_event_count
```

must be:

```text
<= total_event_count
```

and, since 1/2 are combat and 3 is one-sided:

```text
==
```

should hold in our schema.

---

## Output

```text
data/derived/actor_profiles.csv
```

Schema:

```text
actor_id
actor_name

first_event_date
last_event_date
active_week_count

total_event_count
combat_event_count
one_sided_event_count

combatant_fatalities_in_involved_events
actor_deaths_suffered

civilian_fatalities_in_involved_events
one_sided_civilian_fatalities

one_sided_event_share

active_location_count
active_h3_cell_count

events_per_active_week
one_sided_events_per_active_week
civilian_fatalities_per_active_week

eligible_for_web3
```

---

## Module documentation

```python
"""
Build multidimensional violence profiles for armed actors.

This module produces the actor-level dataset used by Web Visualization 3.

The purpose of the actor profile table is to represent each armed actor with
a consistent set of temporal, behavioral, fatality, and geographic metrics.
The resulting table contains exactly one row per canonical actor.

Expected inputs
---------------
The module expects:

    data/processed/actor_events.parquet
    data/processed/actor_lookup.csv

The actor-event dataset must contain unique `(event_id, actor_id)` pairs and
the canonical actor identifier produced by `02_build_actor_events.py`.

The project configuration may define a minimum event threshold used by the
frontend to determine whether an actor should be displayed by default.

Actor-level metrics
-------------------
For each actor the module calculates:

    first_event_date
    last_event_date
    active_week_count
    total_event_count
    combat_event_count
    one_sided_event_count
    combatant_fatalities_in_involved_events
    actor_deaths_suffered
    civilian_fatalities_in_involved_events
    one_sided_civilian_fatalities
    one_sided_event_share
    active_location_count
    active_h3_cell_count
    events_per_active_week
    one_sided_events_per_active_week
    civilian_fatalities_per_active_week

`combatant_fatalities_in_involved_events` represents the total combatant
fatalities recorded in combat events involving the actor. It must not be
interpreted as fatalities suffered by the actor itself.

`actor_deaths_suffered` is kept separately for that purpose.

Geographic spread
-----------------
Geographic spread is measured using both named locations and H3 cells.

Only spatially eligible events contribute to geographic spread metrics.

The H3 resolution must be identical to the one used by
`04_build_h3_metrics.py`.

Visualization eligibility
-------------------------
Actors are not removed because they have few events.

Instead the module creates:

    eligible_for_web3

based on the configured minimum number of events.

This allows the raw analytical table to remain complete while preventing the
parallel-coordinates visualization from becoming unreadable by default.

Validation
----------
The module verifies:

- exactly one profile is produced per actor;
- event counts are based on unique event identifiers;
- combat and one-sided event counts are mutually exhaustive under the current
  three-category violence definition;
- all derived counts and fatality values are non-negative;
- proportions lie in [0, 1];
- active-week counts are positive for every actor in the output;
- actor names are consistent with the canonical actor lookup table.

Output
------
The script writes:

    data/derived/actor_profiles.csv

Each row describes one armed actor and provides the canonical input for the
actor parallel-coordinates visualization and actor-selection controls used
throughout the web application.
"""
```

---

## Implementation decisions

Built in `05_build_actor_profiles.py`, structured as `load_actor_events`,
`load_actor_lookup`, `validate_inputs`, `compute_week_start`,
`assign_h3_cells`, `build_activity_metrics`, `build_geographic_metrics`,
`finalize`, `validate_actor_profiles`, `print_summary`, `main`.

- The stub only imported `conf_path`; extended to also import
  `actor_events`, `actor_lookup`, `actor_profiles`, `derived_data_dir`, and
  the `h3` package (same v4 API as `04_build_h3_metrics.py`).
- **Grouping deviation, documented in the module docstring**: actors are
  grouped by `actor_id` alone in `build_activity_metrics`; the canonical
  `actor_name` is attached afterward in `finalize` from `actor_lookup.csv`
  (`Expected inputs` for this script explicitly names `actor_lookup.csv`,
  unlike scripts 03/04). This is the same fragmentation concern as those
  two scripts, but resolved differently here because the canonical-name
  file is actually an available input - no need to re-derive a mode-name
  in-script.
- `build_geographic_metrics` filters to `spatial_eligible` rows and
  assigns H3 cells at `config.spatial.h3_resolution` independently of
  `04_build_h3_metrics.py`'s output (this script does not read
  `h3_weekly_metrics.csv`); it reuses the same `h3.latlng_to_cell` /
  `h3.is_valid_cell` validate-after-generate pattern, without repeating
  the resolution-match check (already implied by passing `resolution`
  directly into `latlng_to_cell`, so there's nothing to mismatch here the
  way an externally-supplied cell id could).
- `finalize` left-joins `geo_df` onto `activity_df`, so actors with zero
  spatially eligible events get `active_location_count = active_h3_cell_count
  = 0` via an explicit `fillna(0).astype(int)` rather than silently
  dropping out of the profile table.
- **Metric-definition judgment call**: `civilian_fatalities_per_active_week`
  is computed from `civilian_fatalities_in_involved_events` (all civilian
  fatalities in events the actor participated in), not from
  `one_sided_civilian_fatalities`. DATA_FILES.md §7 lists the field name
  without specifying which civilian-fatality column it divides; the
  broader one was chosen because `one_sided_events_per_active_week` already
  covers the one-sided-specific angle as a separate column - flagging this
  as a decision worth a second look, not a settled fact.
- `combatant_fatalities_in_involved_events` is computed as a plain
  `sum(combatant_fatalities)` over all of an actor's rows, not filtered to
  combat rows first - safe because `combatant_fatalities` is already `0`
  on one-sided rows (set in `01_clean_events.py`), so the unfiltered sum
  equals the combat-only sum without an extra boolean mask.
- `eligible_for_web3` reads `config.actors.min_events` (matches
  `config/config.yaml`; see the resolved `min_events` vs. `min_events_web3`
  mismatch noted in `CLAUDE.md`).
- `validate_actor_profiles` re-derives `total_event_count` per actor
  directly from `actor_events` and cross-checks - same defense-in-depth
  relationship to `07_validate_outputs.py` as the checks in scripts 03/04.
- `main()` creates `derived_data_dir` before writing.
- Built, not run.

---

# 06 - `06_build_event_windows.py`

## Responsibility

Produce the data for Web 4:

> **BEFORE / AFTER?**

by deterministically identifying peaks in one-sided violence and constructing aligned temporal windows.

---

## Expected input

```text
data/derived/weekly_metrics.csv
data/derived/actor_profiles.csv
```

Config:

```yaml
episodes:
  metric: "one_sided_civilian_fatalities"
  before_weeks: 8
  after_weeks: 8
  min_gap_weeks: 6
  top_k_per_actor: 10
```

---

## Transformations

### 1. Exclude `__ALL__`

Episodes are detected separately for each actor.

```python
actor_id != "__ALL__"
```

---

### 2. Optionally use only eligible actors

Default:

```python
eligible_for_web3 == True
```

but I would make this choice configurable.

---

### 3. Complete time series

For each actor:

```text
week_start
one_sided_civilian_fatalities
```

must already contain zero-event weeks thanks to script 03.

---

### 4. Candidate peak detection

For each week `t`:

```python
value[t] > 0
```

and:

```python
value[t] >= value[t - 1]
value[t] >= value[t + 1]
```

identifies a candidate.

For consecutive weeks forming a plateau with the same maximum:

```text
10, 10, 10
```

deterministically select:

```text
the middle week
```

or the earliest one.

I would choose:

> **the first week of the plateau**

for simplicity and reproducibility.

---

### 5. Sort candidates

```python
sort(
    metric descending,
    date ascending
)
```

---

### 6. Minimum gap

Greedy selection:

```python
selected = []

for candidate in candidates:
    if all(
        abs(candidate.week - s.week)
        >= min_gap_weeks
        for s in selected
    ):
        selected.append(candidate)
```

---

### 7. Top K

Stop when:

```python
len(selected) == top_k_per_actor
```

---

### 8. Episode ID

Generate:

```text
<actor_id>__<YYYY-MM-DD>
```

with sanitization.

For example:

```text
ucdp-1234__2024-06-03
```

---

### 9. Rank

```text
peak_rank = 1
```

for the actor's largest peak.

---

### 10. Construct the window

For each episode:

```text
relative_week =
-8, -7, ..., -1, 0, +1, ..., +8
```

and:

```python
calendar_week = (
    t0_date
    + relative_week * 7 days
)
```

---

### 11. Values outside the observation period

If `calendar_week` falls outside:

```text
analysis.start_date
analysis.end_date
```

do not assign zero.

Assign:

```text
NA
```

and:

```python
is_observed_week = False
```

### Why

Zero would mean:

> “we observed that week and there were no events.”

NA means:

> “this week is outside the analysis period.”

---

### 12. Window metrics

For each row:

```text
combat_event_count
combatant_fatalities
actor_deaths_suffered    # if available
one_sided_event_count
one_sided_civilian_fatalities
civilian_fatalities
active_location_count
```

For `actor_deaths_suffered`, since it is not currently in `weekly_metrics`, we have two options:

1. add it to script 03;
2. omit it from the initial version of Web 4.

For consistency, I would **add it to Web 1/weekly_metrics now** as an actor-specific column, with `NA` for `__ALL__`.

---

### 13. Check T0

At `relative_week == 0`:

```text
one_sided_civilian_fatalities
```

must equal the value used to select the episode.

---

## Output

```text
data/derived/event_windows.csv
```

Schema:

```text
episode_id

actor_id
actor_name

peak_rank
t0_date
peak_metric_value

relative_week
calendar_week
is_observed_week

combat_event_count
combatant_fatalities
actor_deaths_suffered

one_sided_event_count
one_sided_civilian_fatalities
civilian_fatalities

active_location_count
```

---

## Module documentation

```python
"""
Detect major one-sided-violence episodes and construct aligned temporal
windows around them.

This module produces the analytical dataset used by Web Visualization 4.

The purpose of the transformation is to replace ordinary calendar time with
time relative to a selected one-sided-violence episode.

Instead of comparing events occurring on unrelated calendar dates, the
resulting dataset aligns episodes around:

    T0 = the week of a selected one-sided-violence peak

and represents surrounding activity as:

    T-8 ... T-1 | T0 | T+1 ... T+8

or using the alternative window size defined by configuration.

Expected inputs
---------------
The script expects:

    data/derived/weekly_metrics.csv
    data/derived/actor_profiles.csv

The weekly dataset must contain complete zero-filled actor time series over
the analysis period.

Episode detection
-----------------
Episodes are identified separately for each armed actor.

The default peak metric is:

    one_sided_civilian_fatalities

A week becomes a peak candidate when:

1. the selected metric is greater than zero;
2. its value is at least as large as the immediately preceding week;
3. its value is at least as large as the immediately following week.

Consecutive tied maxima are collapsed deterministically into a single peak.
The first week of the plateau is selected.

Candidate peaks are then ordered by:

1. descending peak magnitude;
2. ascending calendar date as a deterministic tie-breaker.

A greedy separation rule is applied so that selected episodes are at least
the configured number of weeks apart.

The procedure stops when the configured maximum number of episodes for the
actor has been selected.

This algorithm is intentionally explicit and deterministic. Episodes must
not be manually selected because manual selection would make the resulting
visual analysis difficult to reproduce.

Window construction
-------------------
For every selected episode the module creates one row for each relative week
within the configured temporal window.

For example, with eight weeks before and after T0:

    -8, -7, ..., -1, 0, +1, ..., +8

The corresponding actual calendar week is stored separately.

Weeks inside the analysis period with no observed events are represented by
zero values because they represent genuine observed inactivity.

Weeks falling outside the configured analysis period are not assigned zero.
Their metric values are left missing and:

    is_observed_week = False

This distinction prevents the visualization from confusing unavailable data
with an observed absence of violence.

Metrics
-------
Each episode-window row contains temporal conflict measures such as:

    combat_event_count
    combatant_fatalities
    actor_deaths_suffered
    one_sided_event_count
    one_sided_civilian_fatalities
    civilian_fatalities
    active_location_count

Episode metadata includes:

    episode_id
    actor_id
    actor_name
    peak_rank
    t0_date
    peak_metric_value

Validation
----------
The module verifies:

- the special `__ALL__` actor is excluded from actor episode detection;
- selected peaks have positive peak values;
- selected peaks satisfy the configured minimum temporal separation;
- no actor has more than the configured number of episodes;
- every relative week lies inside the configured window;
- relative week zero corresponds exactly to `t0_date`;
- the T0 metric equals the metric value used for peak detection;
- weeks outside the observation period are marked unobserved rather than
  filled with zero.

Output
------
The script writes:

    data/derived/event_windows.csv

The file contains one row per episode-relative-week combination and is the
canonical input for the event-centred matrix and summary visualization.

The resulting dataset supports descriptive analysis of temporal patterns
around one-sided-violence episodes. It does not establish causal effects or
demonstrate that preceding military activity caused subsequent violence
against civilians.
"""
```

---

## Implementation decisions

Built in `06_build_event_windows.py`, structured as `load_weekly_metrics`,
`load_actor_profiles`, `validate_inputs`, `select_actor_weekly`,
`detect_peak_candidates`, `collapse_plateaus`, `select_episodes`,
`sanitize_actor_id_for_episode`, `detect_episodes_for_actor`,
`build_window_rows`, `build_all_episode_windows`,
`validate_event_windows`, `print_summary`, `main`.

- The stub only imported `conf_path`; extended to also import
  `weekly_metrics`, `actor_profiles`, `event_windows`, `derived_data_dir`.
- **Unresolved config surface, flagged rather than guessed**: step 2 says
  "Optionally use only eligible actors... I would make this choice
  configurable", but `config/config.yaml` has no such key. Added a
  module-level constant `ONLY_ELIGIBLE_ACTORS = False` (default: detect
  episodes for every actor in `weekly_metrics.csv`, not just
  `eligible_for_web3` ones) instead of inventing an unrequested config
  key. `actor_profiles.csv` is still loaded and schema-validated (it's a
  declared input) so the toggle can be flipped without further wiring.
  Documented in the module docstring; worth a decision before this is
  relied on for the final Web 4 dataset.
- Peak-candidate detection (`detect_peak_candidates`) uses `shift(1)` /
  `shift(-1)` with boundary weeks' missing neighbour filled as `-1` (not
  `NaN` or `0`) - since all metric values are `>= 0`, `-1` guarantees a
  real boundary value of `0` still fails the `> 0` gate rather than
  artificially becoming a candidate, while any positive boundary value
  correctly passes the neighbour comparison.
- `collapse_plateaus` only merges candidate weeks that are both (a)
  calendar-adjacent (`+7 days`, i.e. no gap) and (b) equal-valued - two
  separate candidate weeks with the same value but a gap between them are
  treated as two distinct peaks, not one plateau, matching "consecutive
  weeks forming a plateau" literally.
- `select_episodes` sorts by `(-value, week)` (descending magnitude,
  ascending date) before the greedy min-gap pass, exactly as step 5/6
  specify; gap comparison uses `abs(week - s_week) >= min_gap_weeks`
  weeks, checked against every already-selected episode (not just the
  most recent one), so a later low-ranked candidate can't slot into a
  narrow gap between two already-selected higher-ranked ones.
- `episode_id` sanitizes only `:` -> `-` in the actor_id portion
  (`sanitize_actor_id_for_episode`); the actor_id field itself in the
  output row is left unmodified. Documented in the module docstring.
- `build_window_rows` looks up each relative week's metrics via
  `actor_weekly.loc[calendar_week, col]` on a `week_start`-indexed frame;
  a week could in principle be `is_observed_week=True` (inside the
  analysis period) yet absent from `actor_weekly.index` only if
  `03_build_weekly_metrics.py`'s zero-fill grid were incomplete - the
  `calendar_week in actor_weekly.index` guard falls back to `NaN` in that
  case rather than raising, since that would be a script-03 contract
  violation, not something this script should paper over or hard-fail on
  mid-loop.
- `validate_event_windows` is skipped entirely (`if len(result) > 0`) when
  zero episodes are detected across all actors - an empty output is valid
  (e.g. on a small/test dataset with no qualifying peaks), not a failure.
- `main()` creates `derived_data_dir` before writing.
- Built, not run.

---

# 07 - `07_validate_outputs.py`

This script is very important. It must not generate analytical data.

It must verify that **the entire pipeline is internally consistent**.

---

## Expected input

All files:

```text
data/processed/events_clean.parquet
data/processed/actor_events.parquet
data/processed/actor_lookup.csv

data/derived/weekly_metrics.csv
data/derived/h3_weekly_metrics.csv
data/derived/actor_profiles.csv
data/derived/event_windows.csv
```

---

# Checks to perform

## A. File existence

```python
for path in expected_paths:
    assert path.exists()
```

---

## B. Schema

Each output must contain the exact required columns.

Extra columns may be allowed, but required columns must not be missing.

---

## C. Events

```text
event_id non-null
event_id unique
dates valid
fatalities >= 0
violence_type ∈ {1,2,3}
```

---

## D. Actor events

```text
(event_id, actor_id) unique
```

and:

```text
event_id exists in events_clean
```

foreign-key check.

---

## E. Actor lookup

```text
actor_id unique
```

and all actors present in `actor_events` must appear in the lookup.

---

## F. Weekly global consistency

For each week:

```text
weekly.__ALL__.event_count
==
unique events_clean events
```

---

## G. Weekly decomposition

```python
event_count == (
    state_based_event_count
    + non_state_event_count
    + one_sided_event_count
)
```

and:

```python
combat_event_count == (
    state_based_event_count
    + non_state_event_count
)
```

---

## H. H3 conservation

For each week:

```text
sum __ALL__ H3 event_count
==
number of spatially eligible events
```

---

## I. Actor profile consistency

For each actor:

```text
actor_profiles.total_event_count
==
nunique(actor_events.event_id)
```

---

## J. Event windows

Check:

```text
relative_week unique within episode
```

and:

```text
0 exists exactly once
```

and:

```text
calendar_week(T0) == t0_date
```

---

## K. Share

Every share:

```text
0 <= value <= 1
```

---

## L. NA policy

No NA values in:

```text
IDs
counts
week_start
```

except for metrics in Web 4 weeks where:

```text
is_observed_week == False
```

---

# Output 1

```text
data/validation/validation_report.json
```

Conceptual example:

```json
{
  "status": "PASS",
  "checks_run": 47,
  "checks_passed": 47,
  "checks_failed": 0
}
```

---

# Output 2

```text
data/validation/validation_failures.csv
```

Always created.

If everything passes:

```text
check_id,message
```

header only.

---

# Exit code

```text
0 → all checks passed
1 → at least one check failed
```

---

## Module documentation

```python
"""
Validate the complete processed and derived data pipeline.

This module is the final integrity gate between data preprocessing and the
visualization layer.

It does not generate analytical metrics and must not silently modify any
input dataset.

Its sole responsibility is to verify that the outputs produced by the
preceding preprocessing stages satisfy their declared schemas, value
constraints, relational constraints, and cross-dataset invariants.

Expected inputs
---------------
The validator expects:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet
    data/processed/actor_lookup.csv
    data/derived/weekly_metrics.csv
    data/derived/h3_weekly_metrics.csv
    data/derived/actor_profiles.csv
    data/derived/event_windows.csv

Validation categories
---------------------
The script validates the pipeline at several levels.

1. File-level validation

   Confirm that every required output file exists and can be loaded.

2. Schema validation

   Confirm that each file contains all mandatory fields with compatible
   data types.

3. Event-level validation

   Verify uniqueness and non-nullness of event identifiers, valid dates,
   supported violence types, valid fatality values, and geographic flags.

4. Actor-event validation

   Verify uniqueness of `(event_id, actor_id)` and referential integrity back
   to the canonical event table.

5. Actor lookup validation

   Verify uniqueness of actor identifiers and complete coverage of actor IDs
   referenced by actor-event records.

6. Weekly aggregation validation

   Recompute selected conflict-wide weekly counts from the canonical event
   table and compare them against `weekly_metrics.csv`.

7. Violence decomposition validation

   Verify that state-based, non-state, and one-sided event counts sum to the
   total event count and that combat counts equal the sum of state-based and
   non-state events.

8. Spatial conservation validation

   Verify that conflict-wide H3 counts correspond exactly to the set of
   spatially eligible unique events.

9. Actor-profile validation

   Recompute selected actor-level counts from `actor_events.parquet` and
   compare them with `actor_profiles.csv`.

10. Event-window validation

    Verify relative-week ranges, unique T0 rows, episode separation,
    calendar-date alignment, and the correct handling of unobserved boundary
    weeks.

11. Range validation

    Verify that proportions lie in [0, 1], counts are non-negative, and
    required identifiers and dates are non-null.

Outputs
-------
The script always writes:

    data/validation/validation_report.json
    data/validation/validation_failures.csv

The JSON report provides a machine-readable and human-readable summary of
the validation run.

The CSV file contains one row for every failed check and is created even
when no failures occur.

Failure behaviour
-----------------
The validator must return process exit code 0 only when all required checks
pass.

If one or more checks fail, the validator writes the complete failure report
and exits with a non-zero status.

No validation failure should be automatically repaired by this module.
Corrections belong in the upstream transformation responsible for producing
the invalid output.
"""
```

---

# `build_all.py`

This is not an analytical script.

It is the **orchestrator**.

---

## Expected input

```text
config/config.yaml
data/raw/GEDEvent_v26_1.csv
```

and all modules:

```text
01...
02...
...
07...
```

---

# Procedure

Conceptually:

```python
load_config()

run_clean_events()

run_build_actor_events()

run_build_weekly_metrics()

run_build_h3_metrics()

run_build_actor_profiles()

run_build_event_windows()

run_validation()
```

---

## Fundamental rule

If a step fails:

```text
STOP
```

Do not run subsequent steps.

---

## Before the build

Verify:

```text
raw file exists
config exists
output directories can be created
configuration is internally valid
```

For example:

```python
start_date < end_date
h3_resolution in valid range
before_weeks >= 0
after_weeks >= 0
top_k_per_actor > 0
min_gap_weeks > 0
```

---

# Additional output 1 - metadata

```text
data/derived/metadata.json
```

Contains only information useful to the frontend:

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

---

# Additional output 2 - manifest

```text
data/derived/build_manifest.json
```

Contains technical information:

```text
raw_input_path
raw_input_sha256
config_sha256

rows_events_clean
rows_actor_events
rows_weekly_metrics
rows_h3_metrics
rows_actor_profiles
rows_event_windows

validation_status
```

optionally:

```text
build_timestamp
```

---

## Module documentation

```python
"""
Run the complete project data-preparation pipeline.

This module is the orchestration entry point for all preprocessing and
validation stages required by the visualization project.

It does not contain analytical transformation logic itself. Each
transformation remains implemented in the dedicated stage module so that
individual stages can be executed, tested, and debugged independently.

Pipeline order
--------------
The build executes the following stages in strict sequence:

    01_clean_events
        ->
    02_build_actor_events
        ->
    03_build_weekly_metrics
        ->
    04_build_h3_metrics
        ->
    05_build_actor_profiles
        ->
    06_build_event_windows
        ->
    07_validate_outputs

A downstream stage is executed only if every preceding stage has completed
successfully.

Expected inputs
---------------
The build requires:

    config/config.yaml
    data/raw/GEDEvent_v26_1.csv

The exact raw input path may be overridden by the project configuration.

Pre-flight validation
---------------------
Before starting the transformation pipeline, the orchestrator verifies:

- the configuration file exists and can be parsed;
- the raw GED input exists;
- required output directories can be created;
- the analysis start date precedes the end date;
- the configured H3 resolution is valid;
- event-window lengths are non-negative;
- the minimum episode separation is positive;
- the maximum number of episodes per actor is positive.

Execution behaviour
-------------------
Each processing module should expose a callable `main()` or build function so
that the orchestrator can invoke the stage directly.

If any stage raises an exception or returns a failure status, execution stops
immediately.

The pipeline must never continue using potentially stale downstream outputs
after an upstream failure.

Metadata
--------
After successful analytical processing the orchestrator writes:

    data/derived/metadata.json

This file contains the subset of methodological configuration required by
the frontend, such as country, temporal range, temporal resolution, H3
resolution, and event-window size.

The frontend should read this generated metadata rather than parsing the
Python YAML configuration directly.

Build manifest
--------------
After a successful build and validation, the orchestrator writes:

    data/derived/build_manifest.json

The manifest records technical provenance information such as:

- raw input path;
- raw input file checksum;
- configuration checksum;
- output row counts;
- validation result;
- optional build timestamp.

The manifest is intended for reproducibility and debugging rather than for
visualization.

Outputs
-------
The orchestrator indirectly produces all processed and derived datasets:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet
    data/processed/actor_lookup.csv

    data/derived/weekly_metrics.csv
    data/derived/h3_weekly_metrics.csv
    data/derived/actor_profiles.csv
    data/derived/event_windows.csv
    data/derived/metadata.json
    data/derived/build_manifest.json

    data/validation/validation_report.json
    data/validation/validation_failures.csv

A build is considered successful only when `07_validate_outputs.py` completes
with a successful validation status.
"""
```

## One change I would make to the previous plan

I would add the following to `weekly_metrics.csv` now:

```text
actor_deaths_suffered
```

for actor-specific rows.

For:

```text
actor_id = "__ALL__"
```

I would assign:

```text
NA
```

because there is no meaningful concept of “deaths suffered by all actors” without risking a change in interpretation.

This gives us three clearly distinct measures in Web 4:

```text
combat_event_count
        ↓
how much combat there is

combatant_fatalities
        ↓
how lethal the clashes are

actor_deaths_suffered
        ↓
how many fatalities are attributed
specifically to the actor
```

The third measure is particularly useful for the original question about the possible relationship between **observable military pressure** and subsequent violence against civilians, without improperly turning it into a measure of “defeat.”

The natural next step would be to turn this specification into a **concrete `project.yml` schema + shared functions (`paths.py`, `config.py`, `schemas.py`, `validation.py`)**, because many of the checks described here should not be duplicated seven times.
