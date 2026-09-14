import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleUrl } from "./tsModule.mjs";

const source = (path) => new URL(`../src/${path}.ts`, import.meta.url);
const { groupEpisodes, relativeWeekRange, medianBand, sequentialColor, circleRadius } =
  await import(moduleUrl(source("viz/event-windows/eventWindowMath")));

const d = (n) => new Date(Date.UTC(2024, 0, 1 + n * 7));

/** Minimal EventWindow-shaped row; only the fields the functions under test read. */
function row(episodeId, actorId, relativeWeek, combatEventCount) {
  return {
    episode_id: episodeId,
    actor_id: actorId,
    actor_name: actorId,
    peak_rank: 1,
    t0_date: d(0),
    peak_metric_value: 10,
    relative_week: relativeWeek,
    calendar_week: d(relativeWeek),
    is_observed_week: combatEventCount !== null,
    combat_event_count: combatEventCount,
    combatant_fatalities: null,
    actor_deaths_suffered: null,
    one_sided_event_count: null,
    one_sided_civilian_fatalities: null,
    civilian_fatalities: null,
    active_location_count: null,
  };
}

test("relativeWeekRange: inclusive integer range spanning T0", () => {
  assert.deepEqual(relativeWeekRange(2, 3), [-2, -1, 0, 1, 2, 3]);
  assert.deepEqual(relativeWeekRange(0, 0), [0]);
});

test("groupEpisodes: groups by episode_id preserving first-seen order, sorts each episode's rows by relative_week", () => {
  const rows = [
    row("e1", "a", 1, 5),
    row("e2", "b", 0, 1),
    row("e1", "a", -1, 3),
    row("e1", "a", 0, 4),
  ];
  const episodes = groupEpisodes(rows);
  assert.deepEqual(episodes.map((e) => e.episodeId), ["e1", "e2"]); // e1 seen first
  assert.deepEqual(episodes[0].rows.map((r) => r.relative_week), [-1, 0, 1]); // sorted
  assert.equal(episodes[0].actorId, "a");
});

test("medianBand: computes median/IQR per week across episodes, excluding null (unobserved) rather than treating it as zero", () => {
  const rows = [
    row("e1", "a", 0, 10),
    row("e2", "b", 0, 20),
    row("e3", "c", 0, 30),
    row("e1", "a", 1, null), // unobserved at week 1
    row("e2", "b", 1, 6),
  ];
  const episodes = groupEpisodes(rows);
  const band = medianBand(episodes, "combat_event_count", [0, 1]);
  assert.equal(band[0].median, 20);
  assert.equal(band[0].q1, 15);
  assert.equal(band[0].q3, 25);
  // week 1: only one observed value (6) among two episodes -> median is that value, not pulled toward 0
  assert.equal(band[1].median, 6);
});

test("medianBand: a week with zero observed episodes yields nulls, never a false zero", () => {
  const rows = [row("e1", "a", 0, null)];
  const episodes = groupEpisodes(rows);
  const band = medianBand(episodes, "combat_event_count", [0]);
  assert.deepEqual(band[0], { relativeWeek: 0, median: null, q1: null, q3: null });
});

test("sequentialColor: null stays null (renders as a hatch, never a false zero-color); clamps and interpolates otherwise", () => {
  assert.equal(sequentialColor(null, 10, "#2a78d6"), null);
  assert.equal(sequentialColor(0, 10, "#2a78d6"), "#ffffff");
  assert.equal(sequentialColor(10, 10, "#2a78d6"), "#2a78d6");
  assert.equal(sequentialColor(0, 0, "#2a78d6"), "#ffffff"); // zero max never divides by zero
});

test("circleRadius: zero for null/non-positive/zero-max input, grows with value up to maxRadius", () => {
  assert.equal(circleRadius(null, 10, 9), 0);
  assert.equal(circleRadius(0, 10, 9), 0);
  assert.equal(circleRadius(5, 0, 9), 0);
  assert.equal(circleRadius(10, 10, 9), 9);
  assert.ok(circleRadius(2, 10, 9) > 0 && circleRadius(2, 10, 9) < 9);
});
