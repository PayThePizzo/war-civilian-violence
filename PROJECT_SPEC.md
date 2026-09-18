# 1. Overall architecture

I would use this stack:

```text
UCDP GED raw
    │
    ▼
Python preprocessing
    │
    ├── events_clean.parquet
    ├── weekly_metrics.csv
    ├── h3_weekly_metrics.csv
    ├── actor_profiles.csv
    └── event_windows.csv
    │
    ▼
Web application
Vite + TypeScript
    │
    ├── D3.js
    │     ├── Web 1 Timeline
    │     ├── Web 3 Actor Profiles
    │     └── Web 4 Event Windows
    │
    ├── MapLibre GL JS
    │     └── basemap
    │
    └── deck.gl
          └── Web 2 H3 map
```

I would not use React: for four custom visualizations, it adds unnecessary complexity. **TypeScript + DOM + D3** is sufficient.

For the map, I would use H3 precomputed in Python and deck.gl's `H3HexagonLayer`. The layer accepts H3 IDs directly and supports extrusion, color, elevation, and picking. ([deck.gl][1])

As an initial resolution, I would use **H3 resolution 5**, which corresponds to an average of approximately **253 km² per cell**; this is fine enough to show geographic structure without excessively fragmenting a country as large as Sudan. It should still be checked visually against resolution 6. ([H3Geo][2])

---

# 2. An important decision: no heavy computation in the browser

The browser should primarily:

```text
load → filter → render → interact
```

It should not load the entire GED and rebuild complex aggregations every time.

Python should handle:

```text
cleaning
actor normalization
weekly aggregation
H3 assignment
episode detection
profile construction
```

This makes the project:

* fast;
* reproducible;
* easier to verify;
* easier to deliver.

---

# 3. Raw dataset: what we take from the GED

From the original dataset, we need at least the fields corresponding to:

```text
event id
date_start
date_end
type_of_violence

side_a
side_b

deaths_a
deaths_b
deaths_civilians

best
low
high

latitude
longitude

country
adm_1
adm_2
where_coordinates
```

Preprocessing must verify the actual column names in the GED version you downloaded.

The analysis period is set in the configuration, for example:

```yaml
country: Sudan
start_date: 2023-04-15
end_date: 2025-12-31

week_anchor: MON

h3_resolution: 5

event_window:
  before_weeks: 8
  after_weeks: 8

episodes:
  min_gap_weeks: 6
  top_k: 10
```

So no important numerical parameters should be hard-coded directly into the charts.

---

# 4. First essential transformation: the actor-event table

This is necessary to track **the same actor** across combat and one-sided violence.

I would create:

```text
events_clean.parquet
```

with one row per original event, and then:

```text
actor_events.parquet
```

with one row for each relationship:

```text
actor ↔ event
```

For a state-based event:

```text
SAF vs RSF
```

we create:

```text
event 123 | SAF
event 123 | RSF
```

For a one-sided event:

```text
RSF → civilians
```

we create only:

```text
event 456 | RSF
```

and **not**:

```text
event 456 | civilians
```

because `civilians` must not become an actor comparable to armed actors.

This table can contain:

```text
event_id
actor_id
actor_name
actor_role
week_start
type_of_violence

actor_combat_deaths
civilian_deaths
total_best

latitude
longitude
h3_id
```

---

# 5. The double-counting problem

This must be handled explicitly.

A combat event:

```text
SAF vs RSF
```

appears in both the SAF and RSF profiles.

This is correct when we are asking:

> “Which events involve SAF?”

But it would be wrong to aggregate the actor-event table to answer:

> “How many events occurred in Sudan overall?”

because the same event would be counted twice.

For this reason, each derived dataset will have a pseudo-entity:

```text
actor_id = "__ALL__"
```

The `__ALL__` rows are calculated **directly from the original events**, not by summing across actors.

So:

```text
actor = __ALL__
```

means:

> unique conflict events

whereas:

```text
actor = SAF
```

means:

> events involving SAF.

This rule must apply throughout the project.

---

# 6. Global application state

The four visualizations must not be four independent iframes.

We will have a small shared TypeScript store.

```ts
export interface AppState {
  selectedActorId: string | null;

  dateRange: {
    start: Date;
    end: Date;
  };

  focusWeek: Date | null;

  violenceTypes: Set<1 | 2 | 3>;

  selectedHexId: string | null;

  selectedEpisodeId: string | null;
}
```

Default:

```ts
const initialState: AppState = {
  selectedActorId: null,

  dateRange: {
    start: new Date("2023-04-15"),
    end: new Date("2025-12-31")
  },

  focusWeek: null,

  violenceTypes: new Set([1, 2, 3]),

  selectedHexId: null,
  selectedEpisodeId: null
};
```

`null` for `selectedActorId` means:

```text
ALL ACTORS
```

The store can be extremely simple:

```ts
subscribe(listener)
getState()
setState(partialState)
```

Redux is not needed.

---

# 7. Synchronization

The main synchronization will be:

```text
                    selectedActor
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
    Timeline            Map              Actors
       │                 │
       └────────────┬────┘
                    ▼
               Event Windows
```

And:

```text
Timeline click week
        │
        ▼
    focusWeek
        │
        ▼
Map moves to that week
```

Conversely:

```text
Map slider
   │
   ▼
focusWeek
   │
   ▼
Timeline highlights week
```

---

# WEB 1 — CONFLICT TIMELINE

# 8. Question

> **WHEN does the composition of violence change?**

The timeline must show the following simultaneously:

* event intensity;
* composition by type of violence;
* fatalities;
* actor;
* change over time.

---

# 9. Web 1 input

File:

```text
public/data/weekly_metrics.csv
```

One row:

```text
week_start
actor_id
actor_name

state_based_events
non_state_events
one_sided_events

combat_events

combat_fatalities
one_sided_civilian_fatalities

total_fatalities
low_fatalities
high_fatalities

active_locations
```

Example:

```csv
week_start,actor_id,actor_name,state_based_events,non_state_events,one_sided_events,combat_fatalities,one_sided_civilian_fatalities,total_fatalities
2024-06-03,rsf,RSF,15,2,7,81,42,123
```

There will also be rows with:

```text
actor_id = __ALL__
```

---

# 10. Web 1 preprocessing

Python:

```text
03_build_weekly_metrics.py
```

Steps:

```text
events_clean
      ↓
floor date → week
      ↓
group unique events by week
      ↓
count type_of_violence
      ↓
sum fatalities
      ↓
write __ALL__
```

Then:

```text
actor_events
      ↓
group actor + week
      ↓
same metrics
```

The final output combines both sets of rows.

---

# 11. Visualization layout

I would organize it into three vertically aligned sections.

```text
┌────────────────────────────────────────────┐
│ FILTERS                                    │
├────────────────────────────────────────────┤
│                                            │
│ STACKED TEMPORAL AREA                      │
│                                            │
│ state / non-state / one-sided              │
│                                            │
├────────────────────────────────────────────┤
│ CIVILIAN FATALITIES                        │
│ thin line / spikes                         │
├────────────────────────────────────────────┤
│ 2023 ─────────── BRUSH ─────────── 2025    │
└────────────────────────────────────────────┘
```

Main chart:

```text
X = week
Y = events
stack = type_of_violence
```

Second strip:

```text
X = same week
Y = one_sided_civilian_fatalities
```

This way, we do not confuse:

```text
number of events
```

with:

```text
number of deaths
```

by using the same axis.

---

# 12. Web 1 local state

```ts
interface TimelineState {
  metric: "events" | "fatalities";
  mode: "absolute" | "share";

  hoveredWeek: Date | null;

  brushRange: [Date, Date] | null;
}
```

`metric` allows the measure being displayed to be changed if needed.

`mode = share` converts the three categories to:

```text
0-100%
```

and makes it possible to see **changes in composition**, regardless of absolute intensity.

---

# 13. Web 1 controls

Header:

```text
Actor:
[ All actors ▼ ]

Metric:
[ Events ] [ Fatalities ]

Display:
[ Absolute ] [ Composition % ]

Violence:
☑ State-based
☑ Non-state
☑ One-sided
```

---

# 14. Web 1 code

File:

```text
src/viz/timeline/
├── Timeline.ts
├── TimelineAxes.ts
├── TimelineTooltip.ts
├── TimelineBrush.ts
└── timeline.css
```

Core:

```ts
import * as d3 from "d3";
```

X scale:

```ts
const x = d3.scaleUtc()
  .domain(dateExtent)
  .range([0, innerWidth]);
```

Stack:

```ts
const stack = d3.stack<WeeklyDatum>()
  .keys([
    "state_based_events",
    "non_state_events",
    "one_sided_events"
  ]);
```

Area:

```ts
const area = d3.area()
  .x(d => x(d.data.week))
  .y0(d => y(d[0]))
  .y1(d => y(d[1]));
```

Brush:

```ts
const brush = d3.brushX()
  .extent([[0, 0], [innerWidth, brushHeight]])
  .on("end", brushed);
```

D3 natively supports brushing as a two-dimensional or one-dimensional selection and can use it to select continuous ranges or perform cross-filtering. ([D3.js][3])

---

# 15. Web 1 interactions

### Hover

Updates only:

```text
hoveredWeek
```

and shows:

```text
Week of 3 Jun 2024

State-based events        18
Non-state events           2
One-sided events           7

Civilian fatalities       42
Total fatalities         123
```

### Click on a week

```ts
store.setState({
  focusWeek: datum.week
});
```

Effect:

> Web 2 automatically switches to the same week.

### Brush

```ts
store.setState({
  dateRange: {
    start,
    end
  }
});
```

Web 2 and Web 4 can respond to the new period.

---

# 16. Web 1 empty state

If the filter returns zero events:

```text
No recorded UCDP events match the selected filters.
```

Do not simply leave the chart empty.

---

# WEB 2 — SPATIO-TEMPORAL H3 MAP

# 17. Question

> **WHERE does violence concentrate, and does civilian targeting occupy the same geography as direct combat?**

---

# 18. Web 2 input

File:

```text
public/data/h3_weekly_metrics.csv
```

Schema:

```text
week_start

actor_id
actor_name

h3_id

event_count
state_based_events
non_state_events
one_sided_events

combat_events

combat_fatalities
one_sided_civilian_fatalities
total_fatalities

one_sided_share
civilian_fatality_share
```

Example:

```csv
2024-06-03,rsf,RSF,85532...,12,8,0,4,67,23,90,0.333,0.256
```

---

# 19. How it is generated

Python:

```text
04_build_h3_metrics.py
```

For each event:

```python
h3_id = h3.latlng_to_cell(
    latitude,
    longitude,
    resolution
)
```

Then:

```text
week
+ actor
+ h3
```

is aggregated.

Default:

```text
resolution = 5
```

but the value must be stored in `config.yml`.

---

# 20. Why precompute H3

I would not perform geographic binning in the browser.

Precomputing H3 gives us:

* consistently identical cells;
* reproducible aggregations;
* consistent comparisons between weeks;
* a much smaller dataset;
* the ability to export exactly the cells used in the report.

deck.gl provides `H3HexagonLayer` specifically for this purpose: it takes the H3 index through `getHexagon()` and allows elevation and color to be mapped separately. ([deck.gl][1])

---

# 21. Basemap

MapLibre GL JS.

It provides:

* zoom;
* pan;
* coordinates;
* a basemap;
* boundaries;
* labels.

The analytical H3 data is then drawn on top using deck.gl.

MapLibre supports GeoJSON sources and data updates through `GeoJSONSource.setData()`, which is useful for any boundary layers or dynamic annotations. ([MapLibre][4])

---

# 22. Web 2 visual encoding

I would use:

```text
HEXAGON HEIGHT
    =
selected intensity metric
```

Default:

```text
total event count
```

Color:

```text
one_sided_share
```

So, conceptually:

```text
0% ------------------------------------ 100%
mostly combat                   mostly one-sided
```

This is much better than simply assigning:

```text
red = civilians
blue = military
```

because it makes **transition zones** visible.

---

# 23. Web 2 local state

```ts
interface MapState {
  currentWeek: Date;

  autoplay: boolean;

  extruded: boolean;

  heightMetric:
    | "event_count"
    | "total_fatalities"
    | "civilian_fatalities";

  colorMetric:
    | "one_sided_share"
    | "civilian_fatality_share";

  hoveredHexId: string | null;

  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
}
```

---

# 24. Shared state used by the map

Web 2 listens to:

```text
selectedActorId
focusWeek
dateRange
violenceTypes
selectedHexId
```

If Web 1 changes:

```text
focusWeek = 2024-06-03
```

the map filters by:

```ts
datum.week === focusWeek
```

---

# 25. Web 2 controls

```text
◀ Week ▶

[ Play ]

Height:
[ Events ▼ ]

Colour:
[ Violence composition ▼ ]

[✓] 3D extrusion

Actor:
[ All actors ▼ ]
```

Plus the time slider:

```text
2023 ━━━━━━━━━●━━━━━━━━━━ 2025
```

---

# 26. Web 2 rendering

File:

```text
src/viz/map/
├── ConflictMap.ts
├── H3Layer.ts
├── MapTooltip.ts
├── TimeController.ts
└── map.css
```

Core:

```ts
import maplibregl from "maplibre-gl";

import { H3HexagonLayer } from "@deck.gl/geo-layers";
```

Layer:

```ts
const layer = new H3HexagonLayer({
  id: "violence-h3",

  data: filteredData,

  getHexagon: d => d.h3_id,

  getElevation: d => getHeight(d),

  getFillColor: d => colorScale(
    d.one_sided_share
  ),

  extruded: state.extruded,

  elevationScale: 200,

  pickable: true
});
```

---

# 27. Web 2 hover

Tooltip:

```text
North Darfur
Week of 03 Jun 2024

Events                  17
Combat events           11
One-sided events         6

Total fatalities        94
Civilian fatalities     31

One-sided share        35%
```

If available:

```text
Dominant actors
RSF, SAF
```

---

# 28. Web 2 click

Click on a hexagon:

```ts
store.setState({
  selectedHexId: datum.h3_id
});
```

The hexagon remains highlighted.

We could then show the following below the map:

```text
history of selected cell
```

as a small sparkline, but this is an enhancement, not part of the MVP.

---

# 29. Autoplay

It must not simply call:

```text
setInterval(renderEverything)
```

On each tick:

```ts
nextWeek();
updateMapLayer();
store.setState({ focusWeek: next });
```

Interval:

```text
500-800 ms
```

per week, adjustable.

When the user interacts manually:

```text
autoplay = false
```

---

# WEB 3 — ACTOR VIOLENCE FINGERPRINTS

# 30. Question

> **WHO exhibits different combinations of combat participation and civilian targeting?**

---

# 31. Web 3 input

File:

```text
public/data/actor_profiles.csv
```

One row per actor.

Schema:

```text
actor_id
actor_name

first_event
last_event
active_weeks

total_events
combat_events
one_sided_events

combat_fatalities
civilian_fatalities

one_sided_event_share
civilian_fatality_share

active_h3_cells
active_locations

events_per_active_week
civilian_fatalities_per_active_week
```

---

# 32. Displayed metrics

I would not display every column.

Default Parallel Coordinates:

```text
Combat
events
   │
   │       Combat
   │       fatalities
   │          │
   │          │       One-sided
   │          │       events
   │          │          │
   │          │          │       Civilian
   │          │          │       fatalities
   │          │          │          │
   │          │          │          │      One-sided
   │          │          │          │      share
   │          │          │          │        │
   │          │          │          │        │ Geographic
   │          │          │          │        │ spread
```

I would use 6 axes:

1. `combat_events`
2. `combat_fatalities`
3. `one_sided_events`
4. `civilian_fatalities`
5. `one_sided_event_share`
6. `active_h3_cells`

Not 10.

Otherwise, it becomes unreadable.

---

# 33. Normalization

Parallel coordinates require different scales.

Each axis has its own scale.

For highly skewed variables:

```text
combat_fatalities
civilian_fatalities
```

I would use:

```text
log1p
```

that is:

```python
log(1 + x)
```

The UI must state this:

```text
Fatality axes use a log-scaled display.
```

Tooltips still show the original value.

---

# 34. Web 3 state

```ts
interface ActorViewState {
  hoveredActorId: string | null;

  selectedActorIds: Set<string>;

  activeBrushes: Record<
    string,
    [number, number] | null
  >;

  scaleMode: "raw" | "normalized";
}
```

---

# 35. Web 3 global state

Clicking to select an actor updates:

```ts
store.setState({
  selectedActorId: actor.id
});
```

Effect:

```text
Actor profile
    ↓
Timeline filters to actor
    ↓
Map filters to actor
    ↓
Event windows filters to actor
```

This is probably the most important connection among the four visualizations.

---

# 36. Web 3 rendering

File:

```text
src/viz/actors/
├── ActorParallelCoordinates.ts
├── ActorAxis.ts
├── ActorBrush.ts
├── ActorTooltip.ts
├── ActorDetails.ts
└── actors.css
```

D3.

Each actor becomes a path:

```ts
const line = d3.line();

function path(actor: ActorProfile) {
  return line(
    dimensions.map(dim => [
      x(dim),
      y[dim](actor[dim])
    ])
  );
}
```

---

# 37. Brushing on each axis

Each axis can have:

```text
brushY
```

Example:

the user selects:

```text
one_sided_share > 30%
```

and:

```text
combat_events > 100
```

Only actors that meet both conditions remain highlighted.

Formally:

```ts
const visibleActors = actors.filter(actor =>
  everyActiveBrushMatches(actor)
);
```

---

# 38. Web 3 hover

Hover over a line:

```text
RSF

Combat events                 523
Combat fatalities           2,104

One-sided events              117
Civilian fatalities           698

One-sided share             18.3%
Geographic cells              132
Active weeks                   97
```

The line becomes prominent, while the others are desaturated.

---

# 39. Web 3 click

Click:

```text
RSF
```

leads to:

```text
selectedActorId = RSF
```

and opens a side panel:

```text
┌─────────────────────────────┐
│ RSF                         │
│                             │
│ Violence profile            │
│                             │
│ Combat        █████████      │
│ One-sided     ████           │
│                             │
│ First event ...             │
│ Last event  ...             │
│                             │
│ [Focus across views]        │
└─────────────────────────────┘
```

That mini chart can be simple: the main analytical value remains in the parallel coordinates.

---

# WEB 4 — EVENT-CENTRED BEFORE / AFTER

# 40. Question

This is the central part:

> **What tends to happen around major episodes of one-sided violence?**

Not:

> “Does military defeat cause retaliation?”

but:

> **“What patterns surround these episodes?”**

---

# 41. First, we need to define an episode

This definition must be reproducible.

For each actor:

```text
weekly one-sided civilian fatalities
```

We identify candidate weeks.

One possible final rule:

```text
metric:
one_sided_civilian_fatalities

candidate:
local maximum

minimum separation:
6 weeks

retain:
top K episodes
```

For example:

```yaml
episodes:
  metric: one_sided_civilian_fatalities
  top_k: 10
  min_gap_weeks: 6
```

We do not manually select “interesting episodes.”

---

# 42. Event window

For each episode:

```text
T0 = peak week
```

we build:

```text
T-8
T-7
...
T-1
T0
T+1
...
T+8
```

17 weeks.

---

# 43. Web 4 input

File:

```text
public/data/event_windows.csv
```

Schema:

```text
episode_id

actor_id
actor_name

t0_date
relative_week
calendar_week

combat_events
combat_fatalities

one_sided_events
one_sided_civilian_fatalities

active_locations
active_h3_cells

peak_rank
```

Example:

```csv
RSF_2024_06_03,rsf,RSF,2024-06-03,-3,2024-05-13,18,62,1,3,15,8,2
RSF_2024_06_03,rsf,RSF,2024-06-03,-2,2024-05-20,24,91,2,8,19,11,2
...
RSF_2024_06_03,rsf,RSF,2024-06-03,0,2024-06-03,12,50,9,58,24,15,2
```

---

# 44. Web 4 visualization

I would not use a simple line chart.

I would use an **event-centred matrix**.

```text
                 weeks relative to T0

             -8 -7 -6 -5 ... -1  0 +1 +2 ... +8

Episode A    ░  ░  ▒  ▒      █  ●  █  ▒
Episode B    ░  ▒  █  █      ▒  ●  █  █
Episode C    ▒  █  █  ▒      ░  ●  ▒  ░
Episode D    ░  ░  ▒  █      █  ●  █  ▒
```

Background cell:

```text
combat intensity
```

Circle overlay:

```text
civilian fatalities
```

So:

```text
cell intensity → direct combat
circle size    → civilian targeting
```

T0 is always vertically aligned.

---

# 45. Why this format matters

The original table contains:

```text
event A
event B
event C
event D
```

with different dates.

Realignment transforms:

```text
calendar time
```

into:

```text
time relative to civilian violence peak
```

This is exactly the kind of transformation that can produce **new visual insights**.

---

# 46. Summary above the matrix

I would place a summary above the matrix.

```text
Median combat intensity across selected episodes

          ╭──────╮
    ╭─────╯      ╰────
────╯              ──────
 -8 ... -1   T0   +1 ... +8
```

With:

```text
median
+ interquartile range
```

Not a mean if the data is highly skewed.

---

# 47. Web 4 state

```ts
interface EventWindowState {
  metric:
    | "combat_events"
    | "combat_fatalities";

  overlayMetric:
    | "civilian_fatalities"
    | "one_sided_events";

  sortMode:
    | "peak_severity"
    | "actor"
    | "date";

  hoveredEpisodeId: string | null;

  normalizeRows: boolean;
}
```

---

# 48. Web 4 normalization

I would add:

```text
[ Absolute ] [ Normalize per episode ]
```

Absolute:

```text
actual combat fatalities
```

Normalized:

```text
0 → low relative to this episode
1 → high relative to this episode
```

The second option helps compare the **temporal shape** of episodes with very different intensities.

But the default is:

```text
Absolute
```

to avoid hiding the magnitude.

---

# 49. Clicking an episode

Click on a row:

```ts
store.setState({
  selectedEpisodeId: episode.id,
  selectedActorId: episode.actor_id,
  focusWeek: episode.t0_date
});
```

As a result:

* Web 1 highlights T0;
* Web 2 shows that week;
* Web 3 highlights the actor.

This completes the connections among the four views.

---

# 50. Web 4 tooltip

```text
RSF — Episode 2

T0:
3 Jun 2024

Current cell:
T−3 weeks
13 May 2024

Combat events              18
Combat fatalities          62
One-sided events            1
Civilian fatalities         3
Active locations           15
```

---

# 51. Web 4 code

File:

```text
src/viz/event-windows/
├── EventWindowMatrix.ts
├── EventWindowSummary.ts
├── EventWindowTooltip.ts
├── EpisodeSelector.ts
└── event-windows.css
```

D3:

```ts
const x = d3.scaleBand<number>()
  .domain(d3.range(-8, 9))
  .range([0, width])
  .padding(0.05);

const y = d3.scaleBand<string>()
  .domain(episodeIds)
  .range([0, height])
  .padding(0.08);
```

Combat intensity:

```ts
const intensity = d3.scaleSequential(...)
```

Circle size:

```ts
const radius = d3.scaleSqrt()
  .domain([0, maxCivilianDeaths])
  .range([0, maxRadius]);
```

---

# 52. Exact frontend structure

I would propose:

```text
web/
├── index.html
│
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── public/
│   ├── data/
│   │   ├── weekly_metrics.csv
│   │   ├── h3_weekly_metrics.csv
│   │   ├── actor_profiles.csv
│   │   ├── event_windows.csv
│   │   └── metadata.json
│   │
│   └── geo/
│       └── sudan_boundary.geojson
│
└── src/
    ├── main.ts
    │
    ├── state/
    │   ├── AppState.ts
    │   └── store.ts
    │
    ├── data/
    │   ├── loadData.ts
    │   ├── types.ts
    │   └── parsers.ts
    │
    ├── controls/
    │   ├── ActorSelector.ts
    │   ├── DateSelector.ts
    │   └── ViolenceSelector.ts
    │
    ├── viz/
    │   ├── timeline/
    │   │   ├── Timeline.ts
    │   │   ├── TimelineBrush.ts
    │   │   └── TimelineTooltip.ts
    │   │
    │   ├── map/
    │   │   ├── ConflictMap.ts
    │   │   ├── H3Layer.ts
    │   │   └── TimeController.ts
    │   │
    │   ├── actors/
    │   │   ├── ActorParallelCoordinates.ts
    │   │   ├── ActorBrush.ts
    │   │   └── ActorDetails.ts
    │   │
    │   └── event-windows/
    │       ├── EventWindowMatrix.ts
    │       ├── EventWindowSummary.ts
    │       └── EventWindowTooltip.ts
    │
    ├── utils/
    │   ├── colors.ts
    │   ├── format.ts
    │   └── dates.ts
    │
    └── styles/
        ├── global.css
        ├── layout.css
        └── controls.css
```

---

# 53. Preprocessing structure

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

And:

```text
config/
└── project.yml
```

---

# 54. What each script does

### `01_clean_events.py`

Input:

```text
raw GED
```

Output:

```text
events_clean.parquet
```

Performs:

```text
country filtering
date parsing
coordinate validation
type normalization
fatality normalization
```

### `02_build_actor_events.py`

```text
events_clean
    ↓
actor-event long format
```

### `03_build_weekly_metrics.py`

Produces the data for Web 1.

### `04_build_h3_metrics.py`

Produces the data for Web 2.

### `05_build_actor_profiles.py`

Produces the data for Web 3.

### `06_build_event_windows.py`

Produces the data for Web 4.

### `07_validate_outputs.py`

Automated checks.

---

# 55. Important automated validations

For example:

```python
assert all(df["one_sided_share"].between(0, 1))
assert all(df["civilian_fatality_share"].between(0, 1))
assert all(df["event_count"] >= 0)
```

And above all:

```text
sum of __ALL__ events
```

must be compared with:

```text
unique GED event IDs
```

to ensure there is no double counting.

For Web 4:

```text
relative_week ∈ [-8,+8]
```

and each episode must have at most:

```text
17 records
```

---

# 56. Shared metadata

I would create:

```text
metadata.json
```

with:

```json
{
  "country": "Sudan",
  "period": {
    "start": "2023-04-15",
    "end": "2025-12-31"
  },
  "week_definition": "Monday-starting ISO week",
  "h3_resolution": 5,
  "episode_window": {
    "before": 8,
    "after": 8
  }
}
```

The frontend must not duplicate these parameters.

---

# 57. Frontend dependencies

As a guide:

```bash
npm install d3
npm install maplibre-gl

npm install \
  @deck.gl/core \
  @deck.gl/geo-layers \
  @deck.gl/maplibre

npm install h3-js
```

deck.gl explicitly documents MapLibre integration and the dedicated modular packages. ([deck.gl][5])

Dev:

```bash
npm install -D vite typescript
```

---

# 58. Python dependencies

```text
pandas
numpy
pyarrow

geopandas
shapely

h3

pyyaml
```

There is no need to use Python to generate the web visualizations.

---

# 59. Visualization lifecycle

All four should conceptually implement the same API:

```ts
interface Visualization {
  init(container: HTMLElement): void;

  setData(data: unknown): void;

  update(state: AppState): void;

  resize(): void;

  destroy(): void;
}
```

So:

```text
init
 ↓
data load
 ↓
initial render
 ↓
state change
 ↓
update only what changed
```

Not:

```text
state change
 ↓
delete whole SVG
 ↓
draw everything again
```

if this can be avoided.

---

# 60. Complete interaction flow

A concrete example.

The user opens the project.

State:

```text
Actor = All
Date = Apr 2023-Dec 2025
Week = latest/initial
```

Then they select:

```text
RSF
```

in Web 3.

The store becomes:

```ts
selectedActorId = "rsf"
```

Immediately:

```text
WEB 1
timeline → RSF only

WEB 2
map → RSF events

WEB 3
RSF highlighted

WEB 4
RSF episodes only
```

Then they click on the timeline:

```text
3 June 2024
```

The store:

```ts
focusWeek = "2024-06-03"
```

Web 2 updates the map.

Then they click an episode in Web 4.

The store:

```text
selectedEpisode = RSF_2024_06_03
focusWeek       = 2024-06-03
selectedActor   = RSF
```

All visualizations are therefore connected to the same analysis.

---

# 61. What I would NOT make global

Not everything should go into the store.

For example:

```text
hovered timeline week
hovered hexagon
parallel-coordinate brush
tooltip position
map pitch
3D on/off
```

are local state.

The distinction is:

```text
GLOBAL STATE
=
something that changes another visualization

LOCAL STATE
=
something meaningful only inside that visualization
```

This is a useful architectural rule.

---

# 62. The final page

The site structure could be:

```text
────────────────────────────────────────────

FROM BATTLEFIELD TO CIVILIANS

Intro
Research question
How to read the data

────────────────────────────────────────────

01 / WHEN

Conflict Timeline

[visualization]

Finding / annotation

────────────────────────────────────────────

02 / WHERE

Geography of Violence

[map]

Finding / annotation

────────────────────────────────────────────

03 / WHO

Actor Violence Fingerprints

[parallel coordinates]

Finding / annotation

────────────────────────────────────────────

04 / BEFORE & AFTER

What Surrounds Civilian Violence?

[event matrix]

Finding / annotation

────────────────────────────────────────────

WHAT DID THE VISUALIZATIONS REVEAL?

Conclusion

Methodology
Data source
Limitations

────────────────────────────────────────────
```

I would therefore not use a 2×2 dashboard.

The assignment calls for **visualizations that communicate effectively**; vertical storytelling is more suitable.

---

# 63. Responsive design

Desktop is the primary target for the web visualizations.

Breakpoint:

```text
>= 1200 px
full visualization

768-1199 px
reduced controls / reduced labels

< 768 px
simplified read-only version
```

The parallel coordinates view cannot have the same complexity on a smartphone.

So I would not try to force exactly the same layout.

---

# 64. SVG vs Canvas/WebGL rendering

I would use:

| Visualization        | Renderer                   |
| -------------------- | -------------------------- |
| Timeline             | SVG / D3                   |
| Map                  | WebGL / deck.gl + MapLibre |
| Parallel Coordinates | SVG initially              |
| Event Matrix         | SVG / D3                   |

If the number of actors in Web 3 becomes very large, we can switch to Canvas.

But for Sudan, with filtering to retain significant actors, SVG is probably sufficient.

D3 `zoom` works with both SVG and Canvas and can be combined with scales and brushes. ([D3.js][6])

---

# 65. Rule for including actors in Web 3

I would not automatically display every single actor with one or two events.

Otherwise, the parallel coordinates become noise.

I would define, for example:

```yaml
actors:
  min_events: 5
```

or:

```text
Top N by event count
+
any actor with ≥ threshold one-sided events
```

Better still: an explicit configuration parameter.

---

# 66. Web 4 and the methodological issue

Web 4 is where we need to be most rigorous.

The finding could be:

```text
Combat activity frequently rose before
major one-sided violence episodes.
```

only if that pattern actually emerges.

Not:

```text
Military defeats caused attacks
against civilians.
```

The visualization can show:

```text
temporal ordering
association
recurrence
```

not:

```text
intent
causation
territorial defeat
```

This remains consistent with the established plan.

---

# 67. MVP versus enhancements

To prevent the project from becoming too large, I would define the MVP as follows:

**Web 1**
stacked timeline + brush + actor filter.

**Web 2**
H3 map + weekly slider + actor filter.

**Web 3**
parallel coordinates + hover + actor selection.

**Web 4**
aligned event matrix + T0 + actor filter.

Only afterward would I add:

```text
animation
3D map
URL state
cross-view animations
advanced annotations
sparklines
comparison mode
```

3D, in particular, is an **enhancement**, not a requirement.

---

# 68. Correct implementation order

I would not start with D3.

The order should be:

```text
1. clean raw GED
        ↓
2. actor-event model
        ↓
3. weekly aggregates
        ↓
4. H3 aggregates
        ↓
5. actor profiles
        ↓
6. episode detection
        ↓
7. validate all derived data
        ↓
8. build shared state
        ↓
9. Web 1
        ↓
10. Web 2
        ↓
11. Web 3
        ↓
12. Web 4
        ↓
13. cross-view linking
        ↓
14. annotation/storytelling
        ↓
15. social exports
```

So the next concrete technical step is not yet “building the timeline”: it is defining **the exact schema of the derived datasets and the Python preprocessing**. Once that is done, the four visualizations become reasonably self-contained implementations and, above all, all social media outputs can be derived from the same data without creating a second parallel pipeline.

[1]: https://deck.gl/docs/api-reference/geo-layers/h3-hexagon-layer?utm_source=chatgpt.com "H3HexagonLayer | deck.gl"
[2]: https://h3geo.org/docs/core-library/restable/?utm_source=chatgpt.com "Tables of Cell Statistics Across Resolutions | H3"
[3]: https://d3js.org/d3-brush?utm_source=chatgpt.com "d3-brush | D3 by Observable"
[4]: https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/?utm_source=chatgpt.com "GeoJSONSource - MapLibre GL JS"
[5]: https://deck.gl/docs/get-started/getting-started?utm_source=chatgpt.com "Installing and Running Examples | deck.gl"
[6]: https://d3js.org/d3-zoom?utm_source=chatgpt.com "d3-zoom | D3 by Observable"
