# VIZ.md

Documents the four visualizations in `web/`. Each reads a single pre-aggregated CSV from
`data/derived/` (copied into `web/.generated/data/` by `npm run sync-data`, see `WEB.md`) - no
analytical logic runs in the browser, only display filtering, scaling, and layout. All four share
one global state object (`selectedActorId`, `focusWeek`, see `src/app/state.ts`) and cross-link
through it; everything else (hover, local toggles, zoom, stepper position) is view-local state.

Shared plumbing used by all four, not repeated per section below:

| File | Role |
|---|---|
| `src/app/state.ts`, `src/app/store.ts` | The two-field global state and its pub/sub store. |
| `src/data/types.ts` | TypeScript row shapes, one per CSV, matching `DATA_FILES.md` field names exactly. |
| `src/data/parsers.ts` | Per-column CSV → typed value conversion (dates, numbers, nullable numbers, booleans); fails loud on schema drift. |
| `src/data/loaders.ts` | Fetches and parses all five files (`weekly_metrics.csv`, `h3_weekly_metrics.csv`, `actor_profiles.csv`, `event_windows.csv`, `metadata.json`) once at startup. |
| `src/data/selectors.ts` | Pure read-only queries over the loaded data (filtering, the `__ALL__`-safe aggregations, episode ranking). Every view reads through here, never the raw arrays directly. |
| `src/ui/ActorSelector.ts` | The global actor dropdown + Reset button, in the `#scope-bar` nav; writes `selectedActorId` to the store. |
| `src/ui/Tooltip.ts` | Generic hover-tooltip positioning, reused by all four views' own `*Tooltip.ts`. |
| `src/utils/colors.ts` | `violenceColors` - the one semantic palette (state-based / non-state / one-sided) reused everywhere. |
| `src/utils/format.ts` | Shared number/date formatting so every tooltip and axis reads the same way. |
| `src/main.ts` | Loads data, creates the store, constructs all four views, and routes `store.subscribe` to each view's `update(state)`. |

---

## 1. Timeline ("01 / WHEN?")

### What it represents

How the conflict's composition changes week to week: the mix of state-based, non-state, and
one-sided violence, and the toll of one-sided violence against civilians specifically.

### What it shows

Three time-aligned panels sharing one x-axis (week):

1. **Event composition** - stacked area of `state_based_event_count` / `non_state_event_count` /
   `one_sided_event_count`, in either absolute or composition-percent mode.
2. **One-sided share** - `one_sided_event_share` as a thin area/line.
3. **One-sided civilian fatalities** - `one_sided_civilian_fatalities` as lollipops (stem + dot),
   only drawn for weeks with a non-zero value.

Below the chart, a drag-to-zoom brush strip and a "View as table" fallback (the same rows as a
plain HTML table, for screen readers and no-JS).

### Files and roles

| File | Role |
|---|---|
| `src/viz/timeline/Timeline.ts` | The view class: builds the SVG, all three panels, the zoom brush, hover/click/keyboard interaction, and the table fallback. |
| `src/viz/timeline/timelineMath.ts` | Pure, DOM-free helpers: `nearestRow` (hover/keyboard hit-testing), `buildEventLayers` (stacking math for panel 1), `clampZoomDomain` (brush-to-domain clamping). Unit-tested. |
| `src/viz/timeline/TimelineTooltip.ts` | Builds the hover tooltip's DOM content for one week's row. |
| `src/viz/timeline/timeline.css` | Panel layout, axis styling, the zoom-brush track, tooltip styling. |

### Functioning

- **Input:** `weekly_metrics.csv` via `getWeeklyForActor(data, selectedActorId)` - one row per
  week for the current actor (or `__ALL__`), including weeks with zero events. The `__ALL__` rows
  are read straight from the file, never summed from actor rows, per the double-counting rule in
  `CLAUDE.md`.
- **Actor scope:** re-renders whenever `selectedActorId` changes (global).
- **Hover:** a shared crosshair line across all three panels; tooltip shows the exact week's
  numbers. Local state only.
- **Click a week:** writes `focusWeek` to the global store - this is what drives the Map into Week
  mode and highlights T0 elsewhere.
- **Drag-to-zoom:** the brush strip below the axis rescales the x-domain of all three panels
  (clamped to the actor's full date range). Entirely local - never touches the shared store, and
  resets available via a "Reset zoom" button that appears only while zoomed.
- **Keyboard:** arrow keys move a virtual cursor over the chart, Enter/Space sets `focusWeek`,
  matching the mouse-click behavior.

---

## 2. Map ("02 / WHERE?")

### What it represents

Where violence concentrates geographically across Sudan, and how combat versus one-sided
intensity differs by location.

### What it shows

An H3-hexagon choropleth over an OpenStreetMap base layer. Two modes:

- **Overview** (default) - hexagons aggregated across the full analysis period.
- **Week** - hexagons for a single week, entered automatically when a week is clicked in Timeline
  (or advanced manually with a ◀ / Play / ▶ stepper).

Hexagon fill color interpolates from "combat" to "one-sided" (blue → green) on the chosen share
metric; opacity/elevation (2D/3D toggle) scales with the chosen intensity metric (events,
best-estimate fatalities, or one-sided civilian fatalities).

### Files and roles

| File | Role |
|---|---|
| `src/viz/map/ConflictMap.ts` | The view class: owns the MapLibre map instance, the deck.gl overlay, mode/week/actor state, and renders the H3 layer on every relevant change. |
| `src/viz/map/H3Layer.ts` | Pure factory: turns a list of cells + the chosen metrics into a configured deck.gl `H3HexagonLayer`. |
| `src/viz/map/MapControls.ts` | The local UI: Overview/Week toggle, ◀/Play/▶ stepper, intensity/colour metric selects, 2D/3D toggle. Emits callbacks; owns none of the shared state. |
| `src/viz/map/MapTooltip.ts` | Builds the hover tooltip's DOM content for one hexagon. |
| `src/viz/map/mapMath.ts` | Pure, DOM-free helpers: `computeBounds` (initial map fit), `colorForShare`/`elevationForIntensity`/`opacityForIntensity` (encoding scales), `observedWeeks`/`stepWeek` (stepper geometry). Unit-tested. |
| `src/viz/map/map.css` | Map shell sizing, legend, controls, tooltip styling. |

### Functioning

- **Input:** `h3_weekly_metrics.csv`. Overview mode uses `aggregateH3Overview(data, actorId)`
  (sums counts across weeks per cell, then recomputes shares as ratios of sums - never an average
  of weekly shares). Week mode uses `getH3ForActorAndWeek(data, actorId, week)` directly.
- **Basemap:** raw OpenStreetMap raster tiles, no API key (`optimizeDeps.exclude: ["maplibre-gl"]`
  in `vite.config.ts` works around a Vite/esbuild dep-optimizer incompatibility with maplibre-gl's
  worker bundle). Initial view fits the bounding box of all H3 cell centers, since the checked-in
  `sudan-boundary.geojson` asset is currently empty.
- **Cross-view wiring:** `ConflictMap.update(state)` only re-syncs its local mode/week from the
  store's `focusWeek` when that value actually changed since the last render (tracked via
  `lastSyncedFocusTime`). This matters: an unrelated store update - switching actor from the
  dropdown, or a Web3/Web4 click that only touches `selectedActorId` - must not clobber a user's
  manual ▶/Play stepping or their manual return to Overview mode, since mode/week/metric/2D-3D are
  all local-only state.
- **Hover:** deck.gl picking → tooltip with the cell's full metric breakdown.
- No write-back to the global store from this view - it is purely a consumer of `selectedActorId`
  and `focusWeek`.

---

## 3. Actors ("03 / WHO?")

### What it represents

How individual armed actors differ in their violence profile - combat involvement, losses
suffered, one-sided violence against civilians, and geographic reach.

### What it shows

A parallel-coordinates plot: one polyline per actor across six fixed axes (`combat_event_count`,
`actor_deaths_suffered`, `one_sided_event_count`, `one_sided_civilian_fatalities`,
`one_sided_event_share`, `active_h3_cell_count`), plus a side detail panel showing the full profile
of whichever actor is hovered or selected.

### Files and roles

| File | Role |
|---|---|
| `src/viz/actors/ActorParallelCoordinates.ts` | The view class: builds the axes/lines, the "Show minor actors" toggle, hover/click interaction, and hosts the detail panel. |
| `src/viz/actors/actorMath.ts` | Pure, DOM-free helpers: the fixed `AXES` definition, `buildAxisScales` (symlog for skewed count/fatality axes, fixed linear [0,1] for the share axis), `axisPositions`, `pointsForProfile`. Unit-tested. |
| `src/viz/actors/ActorDetails.ts` | Renders the side-panel card for one actor profile (or a placeholder). |
| `src/viz/actors/ActorTooltip.ts` | Small cursor tooltip (actor name + one-sided share) so a hovered line is identifiable before the detail panel catches up. |
| `src/viz/actors/actors.css` | 75/25 layout, axis/line styling (normal/faded/highlighted/selected), details card. |

### Functioning

- **Input:** `actor_profiles.csv` via `getActorProfiles(data, showMinorActors)` - one row per
  actor. Defaults to `eligible_for_web3 === true` only (the pipeline's own eligibility threshold,
  never re-derived in the browser); a local checkbox reveals every actor.
- **Hover:** highlights that actor's line, fades the rest, updates the detail panel + cursor
  tooltip. Local state only (`hoveredActorId`).
- **Click a line:** writes `selectedActorId` to the global store - this is the main cross-view
  trigger: Timeline switches to that actor's series, Map restricts to that actor's cells, and Web4
  shows that actor's episodes.
- The globally selected actor's line gets a persistent accent stroke, independent of hover.
- Each line is drawn twice: a thin visible stroke, and a wider invisible "hit" stroke layered on
  top for easier pointer targeting (hover/click both bind to the hit path).

---

## 4. Event windows ("04 / BEFORE & AFTER")

### What it represents

What combat activity and fatalities look like in the weeks immediately before and after an actor's
worst episodes of one-sided violence against civilians - a description of temporal association,
explicitly not a causal claim (see `PROJECT_SPEC.md` §66 and the footer disclaimer in `index.html`).

### What it shows

Two parts sharing one x-axis (relative week, -8..+8 by default, from `metadata.json`):

- **Summary (Part A):** median line + interquartile band of a chosen background metric across all
  currently displayed episodes.
- **Matrix (Part B):** one row per episode (`actor · T0 date`), one column per relative week. Cell
  fill = the same background metric; a green circle overlay, sized by
  `one_sided_civilian_fatalities`, marks the civilian toll at each point.

A background-metric selector (combat events / combatant fatalities / actor deaths suffered)
switches both parts at once. A legend distinguishes an observed-zero cell (white) from a
not-observed cell (diagonal hatch) - never rendered the same way.

### Files and roles

| File | Role |
|---|---|
| `src/viz/event-windows/EventWindowMatrix.ts` | The view class: owns the metric selector, builds the matrix SVG (header, per-episode rows, per-week cells), hosts the summary component, and handles row/cell click. |
| `src/viz/event-windows/EventWindowSummary.ts` | Renders Part A: the median line + IQR band chart. |
| `src/viz/event-windows/eventWindowMath.ts` | Pure, DOM-free helpers: `groupEpisodes` (rows → episodes, order-preserving), `relativeWeekRange`, `medianBand` (per-week median/Q1/Q3, excluding unobserved weeks from the statistic entirely rather than treating them as zero), `sequentialColor` (white→hex intensity, `null` stays `null` so the caller hatches instead of coloring), `circleRadius`. Unit-tested. |
| `src/viz/event-windows/EventWindowTooltip.ts` | Builds the per-cell hover tooltip (actor, episode rank, T0 date, current relative week, calendar week, all five metrics). |
| `src/viz/event-windows/event-windows.css` | Matrix/summary layout, the SVG hatch `<pattern>` for unobserved cells, legend, tooltip styling. |

### Functioning

- **Input:** `event_windows.csv` via `getEpisodesForActor(data, selectedActorId)` - for `__ALL__`
  this returns the top 20 episodes conflict-wide by peak magnitude (a display-only filter, not a
  redefinition of episodes); for a specific actor, all of that actor's episodes. Episodes and
  peaks are entirely pipeline-defined - the browser never detects new peaks.
- **Missing vs. zero:** every per-week metric is `number | null` in the row type. `null` means
  "outside the analysis period, not observed"; `0` means "observed, genuinely zero activity."
  `medianBand` excludes nulls from the statistic (so a mostly-unobserved week isn't dragged toward
  zero), the summary chart's line/area use d3's `.defined()` to visibly break at a fully-unobserved
  week instead of interpolating across the gap, and the matrix renders unobserved cells with a
  hatch pattern instead of a color.
- **Metric selector:** local state (`metric`), re-renders both Summary and Matrix.
- **Row/cell click:** writes both `selectedActorId` and `focusWeek: episode.t0Date` to the global
  store in one call - this is what makes Timeline jump its focus line to T0, Map jump straight into
  Week mode at T0, and Actors highlight that actor, all from one click.
- Row labels are clipped with an SVG `clipPath` (not just truncated by overflow) so a long
  actor-name-plus-date never bleeds into the adjacent week columns.
