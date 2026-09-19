# VIZ.md

Documents the four visualizations in `web/`. Each reads a single pre-aggregated CSV from
`data/derived/` (copied into `web/.generated/data/` by `npm run sync-data`, see `WEB.md`) - no
analytical logic runs in the browser, only display filtering, scaling, and layout. All four share
one global state object (`selectedActorId`, `focusWeek`, see `src/app/state.ts`) and cross-link
through it; everything else (hover, local toggles, zoom, stepper position) is view-local state.

`index.html` presents the four as numbered chapters of one running analysis (`01 / WHEN?` ...
`04 / BEFORE & AFTER`), each `<h2>` split into a `chapter-no` + `chapter-name` span so the numeral
can sit in a folio rail in the section's left gutter (`src/styles/layout.css`) rather than reading
as four repeated dashboard cards. That page-shell layout, plus the shared type/color system, is
what makes the four sections below read as one report instead of four unrelated widgets.

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
| `src/utils/colors.ts` | `violenceColors` - the one semantic palette (state-based / non-state / one-sided) reused everywhere. It is the *only* color that ever encodes data. |
| `src/utils/format.ts` | Shared number/date formatting so every tooltip and axis reads the same way. |
| `src/styles/tokens.css`, `src/styles/fonts.css`, `src/styles/global.css` | The shared design system: chrome/text/background color tokens (`--ink`, `--body-text`, `--muted`, `--border`, `--axis`, `--paper`, `--surface`), two self-hosted variable type families (Source Serif 4 for narrative headings, Public Sans for controls/axes/tooltips/body copy), and base typography. Every per-view `.css` file styles chrome through these tokens rather than its own hardcoded hex, so the four views read as one system; only `utils/colors.ts`'s three hues are ever used for data itself. |
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

Hexagon fill color interpolates from "combat" to "one-sided" (orange → red) on the chosen share
metric; opacity/elevation (2D/3D toggle) scales with the chosen intensity metric (events,
best-estimate fatalities, or one-sided civilian fatalities).

A dynamic context label inside the map (e.g. "All actors · Full analysis period" or
"RSF · Week of 19 Aug 2024") always states the current actor scope and whether the map shows the
full period or one week, so that is never ambiguous at a glance. A two-line legend states both what
color means (the selected share metric) and what opacity/height means (the selected intensity
metric, worded "Opacity = ..." in 2D or "Height = ... (3D)" in 3D) - both lines update live as the
selectors change. A bottom status line ("All actors · Full period · 274 active H3 cells") gives the
same scope plus the number of cells actually drawn.

### Files and roles

| File | Role |
|---|---|
| `src/viz/map/ConflictMap.ts` | The view class: owns the MapLibre map instance, the deck.gl overlay, mode/week/actor state, the context label/legend captions/status line, and renders the H3 (+ optional boundary) layer on every relevant change. |
| `src/viz/map/H3Layer.ts` | Pure factory: turns a list of cells + the chosen metrics into a configured deck.gl `H3HexagonLayer`. Fill opacity is scaled into `[0.22, 0.88]` (never fully transparent, never fully opaque) and cell borders are drawn at higher contrast, so adjoining high-intensity cells stay visually separable instead of blending into one mass. |
| `src/viz/map/BoundaryLayer.ts` | Pure factory: builds a restrained, unfilled `GeoJsonLayer` outline from a loaded boundary FeatureCollection, or returns `null` if it has zero features. The checked-in `src/assets/geo/sudan-boundary.geojson` currently ships as an empty placeholder, so this is a no-op today; dropping a real boundary into that file is the only change needed to turn it on - no `ConflictMap` architecture change required. |
| `src/viz/map/MapControls.ts` | The local UI: Overview/Week toggle, ◀/Play/▶ stepper, intensity/colour metric selects, 2D/3D toggle. Emits callbacks; owns none of the shared state. Its metric option labels come from `mapMath.ts`'s `INTENSITY_METRIC_LABELS`/`COLOR_METRIC_LABELS`, the same source the legend captions and context label read, so wording can't drift between them. |
| `src/viz/map/MapTooltip.ts` | Builds the hover tooltip's DOM content for one hexagon, grouped into Activity (events / combat events / one-sided events), Composition (one-sided event share), and Fatalities (best-estimate / one-sided civilian). |
| `src/viz/map/mapMath.ts` | Pure, DOM-free helpers: `computeBounds` (initial map fit), `colorForShare`/`elevationForIntensity`/`opacityForIntensity` (encoding scales), `observedWeeks`/`stepWeek` (stepper geometry), and the shared `INTENSITY_METRIC_LABELS`/`COLOR_METRIC_LABELS` maps. Unit-tested. |
| `src/viz/map/map.css` | Map shell sizing, context label, legend (gradient + two caption lines), controls, tooltip styling. |

### Functioning

- **Input:** `h3_weekly_metrics.csv`. Overview mode uses `aggregateH3Overview(data, actorId)`
  (sums counts across weeks per cell, then recomputes shares as ratios of sums - never an average
  of weekly shares). Week mode uses `getH3ForActorAndWeek(data, actorId, week)` directly.
- **Basemap:** raw OpenStreetMap raster tiles, no API key (`optimizeDeps.exclude: ["maplibre-gl"]`
  in `vite.config.ts` works around a Vite/esbuild dep-optimizer incompatibility with maplibre-gl's
  worker bundle). Initial view fits the bounding box of all H3 cell centers, since the checked-in
  `sudan-boundary.geojson` asset is currently empty.
- **Boundary overlay:** fetched lazily once via a Vite `?url` asset import (so it never blocks
  first paint) and drawn *above* the H3 layer as an unfilled outline - geographic context without
  ever obscuring the analytical fill or intensity encoding beneath it. Stays off entirely while the
  checked-in file has no features.
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
of whichever actor is hovered or selected. A one-line legend above the chart states the reading
convention ("Each line represents one armed actor. Higher positions indicate larger values on each
dimension."), and a second line discloses that the skewed count/fatality axes use a symlog scale.

### Files and roles

| File | Role |
|---|---|
| `src/viz/actors/ActorParallelCoordinates.ts` | The view class: builds the axes/lines, the intro/scale-note copy, the "Show minor actors" toggle, hover/click interaction, and hosts the detail panel. |
| `src/viz/actors/actorMath.ts` | Pure, DOM-free helpers: the fixed `AXES` definition, `buildAxisScales` (symlog for skewed count/fatality axes, fixed linear [0,1] for the share axis), `axisPositions`, `pointsForProfile`, and `METRIC_LABELS` - the human-friendly names (e.g. `active_h3_cell_count` → "Geographic spread") shared by the axis titles and the detail card so no raw CSV field name ever reaches the UI. Unit-tested. |
| `src/viz/actors/ActorDetails.ts` | Renders the side-panel card for one actor profile (or a placeholder), grouped into Activity, One-sided violence, Losses / geography, and Active period sections. |
| `src/viz/actors/ActorTooltip.ts` | Small cursor tooltip (actor name + one-sided share) so a hovered line is identifiable before the detail panel catches up. |
| `src/viz/actors/actors.css` | 75/25 layout, axis/line styling (normal/faded/highlighted/selected), grouped details card. |

### Functioning

- **Input:** `actor_profiles.csv` via `getActorProfiles(data, showMinorActors)` - one row per
  actor. Defaults to `eligible_for_web3 === true` only (the pipeline's own eligibility threshold,
  never re-derived in the browser); a local checkbox reveals every actor.
- **Hover:** highlights that actor's line, fades the rest, updates the detail panel + cursor
  tooltip. Local state only (`hoveredActorId`).
- **Click a line:** writes `selectedActorId` to the global store - this is the main cross-view
  trigger: Timeline switches to that actor's series, Map restricts to that actor's cells, and Web4
  shows that actor's episodes.
- **Line states:** three visually distinct states - normal (thin, muted), hovered (thicker, accent
  purple), selected (thickest of the three, dark ink + a subtle drop-shadow, and always raised
  above the other lines). Selection and hover are independent: hovering a different actor never
  fades or thins the globally selected actor's line, so the selection reads exactly the same after
  mouseout as it did before the hover started.
- **Axis labels:** horizontal, not rotated, with edge-aware anchoring (the first axis's label hangs
  right, the last hangs left, interior axes center) so all six names stay fully inside the plot and
  never get painted over by a neighboring axis's own vertical line.
- Each line is drawn twice: a thin visible stroke, and a wider invisible "hit" stroke layered on
  top for easier pointer targeting (hover/click both bind to the hit path).

---

## 4. Event windows ("04 / BEFORE & AFTER")

### What it represents

What combat activity and fatalities look like in the weeks immediately before and after an actor's
worst episodes of one-sided violence against civilians - a description of temporal association,
explicitly not a causal claim (see `PROJECT_SPEC.md` §66 and the footer disclaimer in `index.html`).

### What it shows

A two-column desktop layout: the left column (~72%) holds the metric selector, summary, and
matrix; the right column (~28%) holds a persistent **Episode Details** panel. On narrow screens the
details panel drops below the matrix instead of sitting beside it.

The left column has two parts sharing one x-axis (relative week, -8..+8 by default, from
`metadata.json`):

- **Summary (Part A):** median line + interquartile band of a chosen background metric across all
  currently displayed episodes, with a caption ("Median and interquartile range of combat events
  across the episodes currently displayed.") that names the current metric. T0 is marked with a
  dashed vertical reference line.
- **Matrix (Part B):** one row per episode (`actor · T0 date`, on alternating faint row stripes for
  easier tracking across 17 week columns), one column per relative week. Cell fill = the same
  background metric; a red circle overlay, sized by `one_sided_civilian_fatalities` with a floor
  radius so small non-zero values stay visible and a cap so large ones never fully cover the cell,
  marks the civilian toll at each point. The T0 column gets both the header's dashed line and a
  subtle background band running the full height of the matrix, so it reads as a column, not just a
  line, even when scrolled.

A background-metric selector (combat events / combatant fatalities / actor deaths suffered)
switches the summary caption, the matrix cell colors, and the details panel's "Background metric"
line all at once. A legend distinguishes an observed-zero cell ("0 (observed)") from a not-observed
cell ("Not observed", diagonal hatch) from the circle overlay ("One-sided civilian fatalities") -
`null` (not observed) is never rendered the same way as `0` (observed zero).

The **Episode Details** panel shows whichever episode is currently hovered, or failing that, the
one matching the global selection (`selectedActorId` + `focusWeek === t0_date`); when neither
applies it shows a placeholder ("Hover an episode to inspect its temporal profile.", naming the
globally selected actor if one is set but has no matching episode row). Its content - actor, T0
date, episode rank, peak metric value, the five metrics at T0, the episode's observed-week count,
and the active background metric - is read directly from the pipeline's own `EventWindow` rows; no
statistic is computed for this panel beyond a plain count of `is_observed_week` rows.

### Files and roles

| File | Role |
|---|---|
| `src/viz/event-windows/EventWindowMatrix.ts` | The view class: owns the metric selector, the two-column layout, the matrix SVG (header, T0 band, per-episode rows, per-week cells), hosts the summary component, tracks hovered/selected episode, and handles row/cell click. |
| `src/viz/event-windows/EventWindowSummary.ts` | Renders Part A: the caption line plus the median line + IQR band chart. |
| `src/viz/event-windows/EventWindowDetails.ts` | Renders the persistent Episode Details panel for one episode (or the placeholder). |
| `src/viz/event-windows/eventWindowMath.ts` | Pure, DOM-free helpers: `groupEpisodes` (rows → episodes, order-preserving), `relativeWeekRange`, `medianBand` (per-week median/Q1/Q3, excluding unobserved weeks from the statistic entirely rather than treating them as zero), `sequentialColor` (white→hex intensity, `null` stays `null` so the caller hatches instead of coloring), `circleRadius` (sqrt-scaled, with a min-radius floor and a max-radius cap), and `BACKGROUND_METRIC_LABELS` - the human-friendly names shared by the selector, the summary caption, and the details panel. Unit-tested. |
| `src/viz/event-windows/EventWindowTooltip.ts` | Builds the per-cell hover tooltip, grouped into Actor / Episode, Current position (relative week, calendar week, and an explicit Observed / Not observed status), Combat context, and Civilian violence (including `one_sided_civilian_fatalities`, not just the generic `civilian_fatalities`). Also exports `metricValue`, reused by the details panel so "not observed" reads identically in both places. |
| `src/viz/event-windows/event-windows.css` | Two-column layout (stacking below ~56rem), matrix/summary layout, T0 band, row stripes, the SVG hatch `<pattern>` for unobserved cells, legend, details panel, tooltip styling. |

### Functioning

- **Input:** `event_windows.csv` via `getEpisodesForActor(data, selectedActorId)` - for `__ALL__`
  this returns the top 20 episodes conflict-wide by peak magnitude (a display-only filter, not a
  redefinition of episodes); for a specific actor, all of that actor's episodes. Episodes and
  peaks are entirely pipeline-defined - the browser never detects new peaks, and the details panel
  reads only pipeline-computed fields (`episode_id`, `peak_rank`, `peak_metric_value`, `t0_date`,
  `relative_week`, `is_observed_week`).
- **Missing vs. zero:** every per-week metric is `number | null` in the row type. `null` means
  "outside the analysis period, not observed"; `0` means "observed, genuinely zero activity."
  `medianBand` excludes nulls from the statistic (so a mostly-unobserved week isn't dragged toward
  zero), the summary chart's line/area use d3's `.defined()` to visibly break at a fully-unobserved
  week instead of interpolating across the gap, and the matrix renders unobserved cells with a
  hatch pattern instead of a color.
- **Metric selector:** local state (`metric`), re-renders the summary caption, the matrix, and the
  details panel's "Background metric" line.
- **Hover:** setting `hoveredEpisodeId` (row or cell) re-renders only the details panel, not the
  whole matrix - no full re-render/flicker on every pointer move.
- **Row/cell click:** writes both `selectedActorId` and `focusWeek: episode.t0Date` to the global
  store in one call - this is what makes Timeline jump its focus line to T0, Map jump straight into
  Week mode at T0, and Actors highlight that actor, all from one click.
- Row labels are clipped with an SVG `clipPath` (not just truncated by overflow) so a long
  actor-name-plus-date never bleeds into the adjacent week columns.
- Wording throughout stays descriptive, never causal ("before" / "after" / "surrounds" /
  "associated with", never "caused" / "resulted in") - see `PROJECT_SPEC.md` §66.
