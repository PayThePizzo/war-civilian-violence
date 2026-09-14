Yes. From this point onward, I will treat the following as a constraint:

> **no further changes will be made to `scripts/`, `config/`, `data/processed/`, or `data/derived/`.**

The frontend only consumes existing outputs. The four canonical datasets are already mapped to the four visualizations: `weekly_metrics.csv`, `h3_weekly_metrics.csv`, `actor_profiles.csv`, and `event_windows.csv`; `metadata.json` provides the frontend with the time period, weekly granularity, H3 resolution, and window sizes.

Below is a **concrete implementation plan**, in the order I would build it.

---

# 1. Final frontend

The stack remains:

```text
Vite
TypeScript
D3
MapLibre GL JS
deck.gl
```

D3 is used for Web 1, 3, and 4. MapLibre + deck.gl's `H3HexagonLayer` are used for Web 2. `H3HexagonLayer` is particularly suitable because your dataset already contains `h3_id`: we do not need to repeat the binning in the browser. ([deck.gl][1])

The complete flow will be:

```text
data/derived/
│
├── weekly_metrics.csv
├── h3_weekly_metrics.csv
├── actor_profiles.csv
├── event_windows.csv
└── metadata.json
        │
        │ sync-data
        ▼
web/.generated/data/
        │
        ▼
TypeScript data layer
        │
        ▼
shared state
 actor + week
        │
        ├── Web 1 — WHEN
        ├── Web 2 — WHERE
        ├── Web 3 — WHO
        └── Web 4 — BEFORE / AFTER
```

The frontend does not load `events_clean.parquet` or `actor_events.parquet`: all analytical logic remains in the Python pipeline. This is consistent with the contracts already established.

---

# 2. First step — create the Vite project

From the repository root:

```bash
npm create vite@latest web -- --template vanilla-ts
```

Then:

```bash
cd web
npm install
```

The current Vite documentation directly supports the `vanilla-ts` template; Vite currently requires Node.js 20.19+ or 22.12+. ([vitejs][2])

Then I would install the libraries:

```bash
npm install \
  d3 \
  maplibre-gl \
  h3-js \
  @deck.gl/core \
  @deck.gl/layers \
  @deck.gl/geo-layers \
  @deck.gl/maplibre
```

and the D3 types:

```bash
npm install -D @types/d3
```

D3 can be imported directly with `import * as d3 from "d3"`. ([D3.js][3]) MapLibre is installed with `npm install maplibre-gl`, while the recommended deck.gl integration is `MapLibreOverlay` from `@deck.gl/maplibre`. ([MapLibre][4])

---

# 3. Directories to create

After scaffolding with Vite, I would organize `web/` as follows:

```text
web/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
│
├── scripts/
│   └── sync-data.mjs
│
├── .generated/
│   └── data/
│
├── src/
│   ├── main.ts
│   │
│   ├── app/
│   │   ├── state.ts
│   │   └── store.ts
│   │
│   ├── data/
│   │   ├── types.ts
│   │   ├── parsers.ts
│   │   ├── loaders.ts
│   │   └── selectors.ts
│   │
│   ├── ui/
│   │   ├── ActorSelector.ts
│   │   ├── Tooltip.ts
│   │   ├── Legend.ts
│   │   └── EmptyState.ts
│   │
│   ├── viz/
│   │   ├── timeline/
│   │   │   ├── Timeline.ts
│   │   │   ├── TimelineTooltip.ts
│   │   │   └── timeline.css
│   │   │
│   │   ├── map/
│   │   │   ├── ConflictMap.ts
│   │   │   ├── H3Layer.ts
│   │   │   ├── MapControls.ts
│   │   │   ├── MapTooltip.ts
│   │   │   └── map.css
│   │   │
│   │   ├── actors/
│   │   │   ├── ActorParallelCoordinates.ts
│   │   │   ├── ActorDetails.ts
│   │   │   ├── ActorTooltip.ts
│   │   │   └── actors.css
│   │   │
│   │   └── event-windows/
│   │       ├── EventWindowMatrix.ts
│   │       ├── EventWindowSummary.ts
│   │       ├── EventWindowTooltip.ts
│   │       └── event-windows.css
│   │
│   ├── assets/
│   │   └── geo/
│   │       └── sudan-boundary.geojson
│   │
│   ├── utils/
│   │   ├── colors.ts
│   │   ├── dates.ts
│   │   └── format.ts
│   │
│   └── styles/
│       ├── tokens.css
│       ├── global.css
│       └── layout.css
│
└── dist/
```

`dist/` will be created by Vite.

`.generated/` must be excluded from Git.

---

# 4. `sync-data.mjs`

This file **does not transform the data**.

It only copies:

```text
../data/derived/weekly_metrics.csv
../data/derived/h3_weekly_metrics.csv
../data/derived/actor_profiles.csv
../data/derived/event_windows.csv
../data/derived/metadata.json
```

to:

```text
web/.generated/data/
```

The authoritative data therefore continues to reside only under `data/derived/`, as defined by `project_paths.py`.

Conceptually:

```js
copyFile(
  "../data/derived/weekly_metrics.csv",
  ".generated/data/weekly_metrics.csv"
);
```

repeated for all five files.

I would not copy:

```text
events_clean.parquet
actor_events.parquet
actor_lookup.csv
```

because the browser does not need them.

---

# 5. Vite config

I would configure:

```ts
export default defineConfig({
  publicDir: ".generated",
  base: "./"
});
```

This makes:

```text
.generated/data/weekly_metrics.csv
```

accessible to the frontend as:

```text
/data/weekly_metrics.csv
```

and during `npm run build`, it is automatically included in `dist/data/`.

---

# 6. NPM scripts

In `package.json`:

```json
{
  "scripts": {
    "sync-data": "node scripts/sync-data.mjs",
    "dev": "npm run sync-data && vite",
    "build": "npm run sync-data && tsc && vite build",
    "preview": "vite preview"
  }
}
```

Flow:

```text
npm run dev
    ↓
copy derived datasets
    ↓
start frontend

npm run build
    ↓
copy derived datasets
    ↓
TypeScript check
    ↓
build static site
```

---

# 7. TypeScript types

`src/data/types.ts` must match the existing CSV files **exactly**.

For example, Web 1:

```ts
export interface WeeklyMetric {
  week_start: Date;

  actor_id: string;
  actor_name: string;

  event_count: number;

  state_based_event_count: number;
  non_state_event_count: number;
  one_sided_event_count: number;
  combat_event_count: number;

  combatant_fatalities: number;
  actor_deaths_suffered: number | null;

  civilian_fatalities: number;
  one_sided_civilian_fatalities: number;

  best_fatalities: number;
  low_fatalities: number;
  high_fatalities: number;

  active_location_count: number;
  one_sided_event_share: number;
}
```

These are exactly the metrics produced by `03_build_weekly_metrics.py`.

Similarly, define:

```ts
H3Metric
ActorProfile
EventWindow
ProjectMetadata
```

without renaming the columns.

---

# 8. Global state

I would keep only:

```ts
export interface AppState {
  selectedActorId: string;
  focusWeek: Date | null;
}
```

Default:

```ts
export const initialState: AppState = {
  selectedActorId: "__ALL__",
  focusWeek: null
};
```

This is sufficient.

I would not make the following global:

```text
map metric
3D
timeline zoom
episode selection
parallel-coordinate hover
selected hex
```

These are all local states.

---

# 9. Page layout

`index.html` must contain four sections:

```html
<header id="hero"></header>

<nav id="scope-bar"></nav>

<main>
  <section id="when"></section>
  <section id="where"></section>
  <section id="who"></section>
  <section id="before-after"></section>
</main>

<footer id="methodology"></footer>
```

Concept:

```text
FROM BATTLEFIELD TO CIVILIANS

Research question
short introduction

────────────────────────────────

Actor: [ All actors ▼ ]    Reset

────────────────────────────────

01 / WHEN?
How does violence change over time?

[ TIMELINE ]

────────────────────────────────

02 / WHERE?
Where does violence concentrate?

[ MAP ]

────────────────────────────────

03 / WHO?
How do actors differ?

[ PARALLEL COORDINATES ]

────────────────────────────────

04 / BEFORE & AFTER
What surrounds peaks of civilian violence?

[ SUMMARY ]
[ EVENT MATRIX ]

────────────────────────────────

Conclusion
Methods
Source
```

---

# WEB 1 — WHEN

## 10. Input

Only:

```text
data/derived/weekly_metrics.csv
```

plus:

```text
metadata.json
```

to determine the overall time period.

The dataset contains one row per actor/week, including weeks with zero values, and the aggregate series:

```text
actor_id = "__ALL__"
```

which correctly represents the entire conflict.

---

# 11. Frontend files

```text
src/viz/timeline/
├── Timeline.ts
├── TimelineTooltip.ts
└── timeline.css
```

I would initially use a single `Timeline.ts`: I would not split out axes, brushes, etc. until the file becomes too large.

---

# 12. Expected output

The visualization will have **three panels aligned in time**.

```text
01 / WHEN?
HOW DOES THE COMPOSITION OF VIOLENCE CHANGE?

Actor: RSF

EVENTS
     state-based
 60 ┤       ████
    │   ██████████
 30 ┤ █████████████      ████
    │ ████████████████████████
  0 └──────────────────────────────
      2023          2024       2025

ONE-SIDED SHARE
100% ┤
 50% ┤           ╭────╮
  0% └───────────╯    ╰───────────

ONE-SIDED CIVILIAN FATALITIES
     │       ●
     │              ●●
     │  ·  ·                   ●
     └──────────────────────────────
```

The first panel is a **stacked area chart**:

```text
state_based_event_count
non_state_event_count
one_sided_event_count
```

The second:

```text
one_sided_event_share
```

as a thin line/area chart.

The third:

```text
one_sided_civilian_fatalities
```

as spikes or lollipops.

---

# 13. Web 1 interactions

Hover over a week → a shared vertical line across all three panels.

Tooltip:

```text
Week of 03 Jun 2024

State-based events       18
Non-state events          2
One-sided events          7

One-sided share         25.9%

One-sided civilian
fatalities               42
```

Click a week:

```ts
store.setState({
  focusWeek: datum.week_start
});
```

This updates Web 2.

Time zooming/brushing remains local:

```text
drag → zoom timeline
```

but **does not change Web 3 or Web 4**.

---

# 14. Web 1 controls

Only:

```text
Display:
[ Absolute events ] [ Composition % ]
```

I would not initially add:

```text
metric selector
fatality selector
violence checkbox
```

The view is already sufficiently complex.

---

# 15. Main Web 1 functions

In `Timeline.ts`:

```ts
export class Timeline {
  constructor(container, data, store) {}

  render(): void {}

  updateActor(actorId: string): void {}

  updateFocusWeek(week: Date | null): void {}

  resize(): void {}
}
```

Flow:

```text
data
 ↓
filter actor
 ↓
create scales
 ↓
stack data
 ↓
draw 3 tracks
 ↓
bind hover/click
```

D3 directly provides UTC time scales, area/stack functions, and SVG rendering. ([D3.js][3])

---

# WEB 2 — WHERE

## 16. Input

Only:

```text
data/derived/h3_weekly_metrics.csv
```

plus:

```text
metadata.json
```

The file has one row per:

```text
actor
× week
× H3 cell
```

and already contains `h3_id`, `h3_resolution`, cell centers, counts, fatalities, and shares.

H3 is not computed in the frontend.

---

# 17. Frontend files

```text
src/viz/map/
├── ConflictMap.ts
├── H3Layer.ts
├── MapControls.ts
├── MapTooltip.ts
└── map.css
```

Responsibilities:

```text
ConflictMap.ts
→ MapLibre instance + orchestration

H3Layer.ts
→ create/update H3HexagonLayer

MapControls.ts
→ time + metric + 2D/3D

MapTooltip.ts
→ hover content
```

---

# 18. Initial expected output

The map must start in:

```text
OVERVIEW
```

mode, rather than on an arbitrary week.

```text
02 / WHERE?
WHERE DOES VIOLENCE CONCENTRATE?

               [ Overview ● ] [ Week ○ ]

                 ┌───────────────────┐
                 │        Sudan      │
                 │                   │
                 │   ⬡⬡              │
                 │  ⬡⬡⬡⬡            │
                 │        ⬡⬡         │
                 │         ⬡⬡⬡       │
                 │                   │
                 └───────────────────┘

Intensity: Events
Colour: One-sided event share

combat ─────────────── one-sided
```

Overview aggregates H3 rows across the entire period **for display only**.

For each H3 cell:

```text
event_count =
sum(event_count)
```

and:

```text
one_sided_event_share =
sum(one_sided_event_count)
/
sum(event_count)
```

Do not average the weekly shares.

---

# 19. Week mode

When the user clicks a week in Web 1:

```text
03 Jun 2024
```

the map changes to:

```text
Week of 03 Jun 2024

[ ◀ ] [ Play ] [ ▶ ]
```

and shows only:

```text
actor_id == selectedActorId
week_start == focusWeek
```

---

# 20. Web 2 encoding

Default 2D:

```text
fill colour
→ one_sided_event_share

opacity
→ event_count
```

Toggle:

```text
[ 2D ] [ 3D ]
```

In 3D:

```text
height → event_count
colour → one_sided_event_share
```

Other permitted controls:

```text
Intensity:
Events
Best fatalities
One-sided civilian fatalities

Colour:
One-sided event share
One-sided civilian fatality share
```

All these metrics already exist in the dataset.

---

# 21. Web 2 tooltip

```text
Week of 03 Jun 2024

Events                         17
Combat events                  11
One-sided events                6

One-sided event share         35%

Best-estimate fatalities       94
One-sided civilian fatalities  31
```

I would not display `adm_1` or a region name unless you have a frontend resource that supports it.

---

# 22. H3 rendering

`H3Layer.ts` simply needs to construct:

```ts
new H3HexagonLayer({
  id: "conflict-h3",
  data,
  getHexagon: d => d.h3_id,
  getFillColor: ...,
  getElevation: ...,
  extruded: state.extruded,
  pickable: true
});
```

This is exactly the contract expected by the official layer. ([deck.gl][1])

`ConflictMap.ts` creates `MapLibreOverlay`, currently the recommended deck.gl/MapLibre integration. ([deck.gl][5])

---

# WEB 3 — WHO

## 23. Input

Only:

```text
data/derived/actor_profiles.csv
```

This file contains a single row per actor and already includes:

```text
eligible_for_web3
```

so the frontend does not need to invent a threshold.

---

# 24. Frontend files

```text
src/viz/actors/
├── ActorParallelCoordinates.ts
├── ActorDetails.ts
├── ActorTooltip.ts
└── actors.css
```

---

# 25. Metrics

I would use six axes:

```text
combat_event_count
actor_deaths_suffered
one_sided_event_count
one_sided_civilian_fatalities
one_sided_event_share
active_h3_cell_count
```

These actor-specific metrics are more appropriate than the generic total number of fatalities recorded in events.

---

# 26. Expected output

```text
03 / WHO?
HOW DO ARMED ACTORS DIFFER?

      Combat     Actor      One-sided  Civilian    One-sided  Geographic
      events     deaths     events     fatalities  share      spread
        │          │           │           │          │          │
        │╲         │          ╱│          ╱│         ╱│         ╱│
        │ ╲________│_________╱ │_________╱ │________╱ │________╱ │  RSF
        │      ╲   │       ╱    │           │     ╱    │        │
        │       ╲__│______╱     │___________│____╱     │        │  SAF
        │          │            │           │          │        │

                                            ┌─────────────────────┐
                                            │ RSF                 │
                                            │                     │
                                            │ Total events    ... │
                                            │ Combat events   ... │
                                            │ One-sided       ... │
                                            │ One-sided share ... │
                                            │ Active weeks    ... │
                                            │ H3 cells        ... │
                                            └─────────────────────┘
```

Desktop:

```text
75% parallel coordinates
25% actor details
```

---

# 27. Default filtering

Default:

```ts
profiles.filter(d => d.eligible_for_web3)
```

Local control:

```text
☐ Show minor actors
```

When enabled:

```text
all actor_profiles rows
```

No other eligibility logic in the browser.

---

# 28. Scales

Counts and fatalities can be highly skewed.

For these axes, I would use:

```ts
d3.scaleSymlog()
```

whereas for:

```text
one_sided_event_share
```

I would use:

```text
0 → 1
```

on a linear scale.

The tooltip always continues to show the original values.

---

# 29. Web 3 interaction

Hover:

```text
highlight actor line
fade remaining lines
update actor detail preview
```

Click:

```ts
store.setState({
  selectedActorId: actor.actor_id
});
```

From that point onward:

```text
Web 1 → actor timeline
Web 2 → actor map
Web 3 → selected actor
Web 4 → actor episodes
```

This is the site's main interaction across views.

---

# WEB 4 — BEFORE / AFTER

## 30. Input

Primary:

```text
data/derived/event_windows.csv
```

Supporting:

```text
actor_profiles.csv
metadata.json
```

`event_windows.csv` already contains episodes identified by the pipeline: the browser **does not detect new peaks**. Each episode is already aligned to `T0`, with `relative_week`, `peak_rank`, `peak_metric_value`, and `is_observed_week`.

---

# 31. Frontend files

```text
src/viz/event-windows/
├── EventWindowMatrix.ts
├── EventWindowSummary.ts
├── EventWindowTooltip.ts
└── event-windows.css
```

---

# 32. Expected output

Two components.

### Part A — Summary

```text
04 / BEFORE & AFTER?
WHAT HAPPENS AROUND MAJOR EPISODES?

Median combat activity across displayed episodes

                  T0
                   │
       ╭───────────╮
   ╭───╯           ╰─────
───╯
-8 -7 -6 ... -1    0    +1 ... +8

──── median
░░░░ interquartile range
```

### Part B — Matrix

```text
                                    T0
                                     │
                 -8 -7 -6 -5 ... -1  0 +1 +2 ... +8

RSF · 03 Jun 24   ░  ░  ▒  █      █  ●  █  ▒      ░
SAF · 12 Aug 24   ░  ▒  █  █      ▒  ●  █  █      ▒
Actor · ...       ▒  █  ▒  ░      ░  ●  ▒  ░      ░
```

Encoding:

```text
cell colour
→ combat metric

circle size
→ one_sided_civilian_fatalities
```

---

# 33. Web 4 metric selector

I would allow the background metric to switch between:

```text
Combat events
Combatant fatalities
Actor deaths suffered
```

that is:

```text
combat_event_count
combatant_fatalities
actor_deaths_suffered
```

These metrics already exist in the file.

The circle overlay remains:

```text
one_sided_civilian_fatalities
```

because this is the metric that defines the episode's meaning.

---

# 34. Displayed episodes

With:

```text
selectedActorId = "__ALL__"
```

I would show:

```text
Top 20 episodes
```

sorted by:

```text
peak_metric_value descending
```

This is only a display filter.

It does not change the definition of the episodes.

With an actor selected:

```text
show all episodes for that actor
```

---

# 35. Missing vs zero

This is important.

The script distinguishes:

```text
week inside analysis period, no violence
→ zero
```

from:

```text
week outside analysis period
→ NA
→ is_observed_week = False
```



Visually:

```text
0:
white/light cell

not observed:
//// hatched gray
```

A blank cell therefore never ambiguously represents both cases.

---

# 36. Web 4 interaction

Hover:

```text
RSF
Episode rank 2

T0: 03 Jun 2024
Current: T−3
Calendar week: 13 May 2024

Combat events             18
Combatant fatalities      62
Actor deaths suffered     12
One-sided events           1
Civilian fatalities        3
```

Click a row:

```ts
store.setState({
  selectedActorId: row.actor_id,
  focusWeek: row.t0_date
});
```

Web 1 highlights T0.

Web 2 shows T0.

Web 3 highlights the actor.

---

# 37. Single loader

`src/data/loaders.ts`:

```ts
export async function loadAppData(): Promise<AppData> {
  const [weekly, h3, actors, windows, metadata] =
    await Promise.all([
      loadWeeklyMetrics(),
      loadH3Metrics(),
      loadActorProfiles(),
      loadEventWindows(),
      loadMetadata()
    ]);

  return {
    weeklyMetrics: weekly,
    h3Metrics: h3,
    actorProfiles: actors,
    eventWindows: windows,
    metadata
  };
}
```

No visualization should call `fetch()` directly.

---

# 38. `selectors.ts`

I would put all selection logic here:

```ts
getWeeklyForActor(data, actorId)

getH3ForActorAndWeek(data, actorId, week)

getActorProfiles(data, showMinorActors)

getEpisodesForActor(data, actorId)

getTopEpisodes(data, limit)

aggregateH3Overview(data, actorId)
```

This means `Timeline.ts` does not need to know how the complete data is stored.

It only receives:

```text
the rows it needs to draw
```

---

# 39. `colors.ts`

A single palette:

```ts
export const violenceColors = {
  stateBased: "...",
  nonState: "...",
  oneSided: "..."
};
```

The key rule is:

```text
one-sided violence
=
same semantic colour everywhere
```

The timeline, map legend, actor card, and Web 4 must look like parts of the same project.

---

# 40. `main.ts`

`main.ts` should only handle orchestration:

```ts
async function main() {
  const data = await loadAppData();

  const store = createStore(initialState);

  createActorSelector(...);

  const timeline = new Timeline(...);
  const map = new ConflictMap(...);
  const actors = new ActorParallelCoordinates(...);
  const windows = new EventWindowMatrix(...);

  store.subscribe(state => {
    timeline.update(state);
    map.update(state);
    actors.update(state);
    windows.update(state);
  });
}
```

No direct D3 code in `main.ts`.

---

# 41. Practical implementation order

I would follow this exact order:

```text
1. Create Vite project
2. Install packages
3. Create directory tree
4. Implement sync-data.mjs
5. Configure Vite publicDir
6. Implement types.ts
7. Implement parsers.ts
8. Implement loaders.ts
9. Implement selectors.ts
10. Implement AppState + store
11. Create HTML page skeleton
12. Create common CSS/tokens
13. Implement actor selector
14. Implement Web 1
15. Connect Web 1 → focusWeek
16. Implement Web 2
17. Connect Timeline ↔ Map
18. Implement Web 3
19. Connect actor selection globally
20. Implement Web 4
21. Connect episode → actor/week
22. Add tooltips + empty states
23. Add responsive behavior
24. Add narrative text/findings
25. npm run build
26. Test dist/
```

---

# 42. First milestone

The **first milestone should not include charts yet**.

It should support running:

```text
npm run dev
```

and display:

```text
FROM BATTLEFIELD TO CIVILIANS

Actor: [All actors]

01 WHEN
[data loaded: 3289 rows]

02 WHERE
[data loaded: ...]

03 WHO
[data loaded: ...]

04 BEFORE / AFTER
[data loaded: ...]

Sudan
2023–2025
```

If this foundation works, it means that:

```text
Vite
sync-data
CSV parsing
metadata
TypeScript types
shared state
layout
```

are working correctly.

Only then would I start using D3.

---

# 43. Second milestone

Fully implement Web 1 and Web 2:

```text
Timeline click
       ↓
focusWeek
       ↓
Map changes week
```

This verifies the entire main interaction model.

---

# 44. Third milestone

Web 3:

```text
click actor
       ↓
selectedActorId
       │
       ├─ Timeline
       ├─ Map
       └─ Web 4
```

At that point, the site's views become fully coordinated.

---

# 45. Fourth milestone

Web 4 + narrative refinement.

The final user flow should be:

```text
WHEN?
I see when violence changed.

↓ choose week

WHERE?
I see where that phase occurred.

↓ inspect actors

WHO?
I identify actors with different violence profiles.

↓ choose actor

BEFORE / AFTER?
I compare recurring patterns around
major episodes of one-sided violence.
```

This preserves the current scripts and datasets exactly, while turning them into four visualizations that feel like more than four separate charts: they become **four steps in the same visual analysis**.

[1]: https://deck.gl/docs/api-reference/geo-layers/h3-hexagon-layer?utm_source=chatgpt.com "H3HexagonLayer | deck.gl"
[2]: https://vite.dev/guide/?utm_source=chatgpt.com "Getting Started | Vite"
[3]: https://d3js.org/getting-started?utm_source=chatgpt.com "Getting started | D3 by Observable"
[4]: https://maplibre.org/maplibre-gl-js/docs/?utm_source=chatgpt.com "Introduction - MapLibre GL JS"
[5]: https://deck.gl/docs/api-reference/maplibre/overview?utm_source=chatgpt.com "MapLibreOverlay | deck.gl"
