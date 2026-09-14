import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { csvParseRows } from "d3";
import { moduleUrl } from "./tsModule.mjs";

const source = (path) => new URL(`../src/${path}.ts`, import.meta.url);
const { nearestRow, buildEventLayers, clampZoomDomain } = await import(moduleUrl(source("viz/timeline/timelineMath")));
const parsers = await import(moduleUrl(source("data/parsers")));

const day = (offset) => new Date(Date.UTC(2024, 0, 1 + offset * 7));

/** Minimal WeeklyMetric-shaped rows; only the fields the functions under test read. */
function rows(counts) {
  return counts.map(([weekOffset, stateBased, nonState, oneSided], index) => ({
    week_start: day(weekOffset ?? index),
    actor_id: "__ALL__",
    actor_name: "All actors",
    state_based_event_count: stateBased,
    non_state_event_count: nonState,
    one_sided_event_count: oneSided,
  }));
}

test("nearestRow: empty input returns null", () => {
  assert.equal(nearestRow([], new Date()), null);
});

test("nearestRow: picks the closer neighbor, and ties resolve to the earlier week", () => {
  const data = rows([[0, 1, 0, 0], [1, 1, 0, 0], [2, 1, 0, 0]]);
  assert.equal(nearestRow(data, day(0.2)), data[0]);
  assert.equal(nearestRow(data, day(0.9)), data[1]);
  assert.equal(nearestRow(data, day(0.5)), data[0]); // exact tie -> earlier week
  assert.equal(nearestRow(data, day(-5)), data[0]); // before range -> clamps to first
  assert.equal(nearestRow(data, day(50)), data[2]); // after range -> clamps to last
});

test("buildEventLayers: absolute mode stacks series cumulatively per week", () => {
  const data = rows([[0, 3, 2, 1]]);
  const [stateBased, nonState, oneSided] = buildEventLayers(data, "absolute", [
    "state_based_event_count",
    "non_state_event_count",
    "one_sided_event_count",
  ]);
  assert.deepEqual(stateBased[0], { date: day(0), y0: 0, y1: 3 });
  assert.deepEqual(nonState[0], { date: day(0), y0: 3, y1: 5 });
  assert.deepEqual(oneSided[0], { date: day(0), y0: 5, y1: 6 });
});

test("buildEventLayers: composition mode normalizes each week to a 0-1 fraction, zero weeks stay at 0", () => {
  const data = rows([[0, 3, 1, 0], [1, 0, 0, 0]]);
  const [stateBased, nonState, oneSided] = buildEventLayers(data, "composition", [
    "state_based_event_count",
    "non_state_event_count",
    "one_sided_event_count",
  ]);
  assert.equal(stateBased[0].y1 - stateBased[0].y0, 0.75);
  assert.equal(nonState[0].y1 - nonState[0].y0, 0.25);
  assert.equal(oneSided[0].y1, 1); // cumulative top of stack reaches exactly 1
  assert.deepEqual([stateBased[1], nonState[1], oneSided[1]].map((p) => p.y0), [0, 0, 0]);
  assert.deepEqual([stateBased[1], nonState[1], oneSided[1]].map((p) => p.y1), [0, 0, 0]); // no div-by-zero
});

test("clampZoomDomain: clamps to the full extent and normalizes reversed input", () => {
  const full = [day(0), day(10)];
  assert.deepEqual(clampZoomDomain([day(2), day(4)], full), [day(2), day(4)]);
  assert.deepEqual(clampZoomDomain([day(4), day(2)], full), [day(2), day(4)]); // reversed drag
  assert.deepEqual(clampZoomDomain([day(-5), day(3)], full), [full[0], day(3)]); // clamp left overrun
  assert.deepEqual(clampZoomDomain([day(7), day(50)], full), [day(7), full[1]]); // clamp right overrun
});

test("clampZoomDomain: falls back to the full extent for degenerate or invalid candidates", () => {
  const full = [day(0), day(10)];
  assert.deepEqual(clampZoomDomain([day(3), day(3)], full), full); // collapsed to an instant
  assert.deepEqual(clampZoomDomain([new Date(NaN), day(3)], full), full);
  assert.deepEqual(clampZoomDomain([day(-100), day(-50)], full), full); // wholly outside, clamps to a collapsed point
});

test("real weekly_metrics.csv: __ALL__ rows pass straight through without re-aggregation, stacks match event_count", async () => {
  const csv = readFileSync(new URL("../../data/derived/weekly_metrics.csv", import.meta.url), "utf8");
  const [columns, ...rawRows] = csvParseRows(csv);
  const data = rawRows.map((values) => parsers.parseWeeklyMetric(Object.fromEntries(values.map((v, i) => [columns[i], v]))));
  const allRows = data.filter((row) => row.actor_id === "__ALL__");
  assert.ok(allRows.length > 0);
  const seriesKeys = ["state_based_event_count", "non_state_event_count", "one_sided_event_count"];
  const layers = buildEventLayers(allRows, "absolute", seriesKeys);
  for (let i = 0; i < allRows.length; i++) {
    const top = layers[seriesKeys.length - 1][i].y1;
    assert.equal(top, allRows[i].state_based_event_count + allRows[i].non_state_event_count + allRows[i].one_sided_event_count);
    // CLAUDE.md: __ALL__ totals must come from events_clean.parquet directly, never a sum of actor rows -
    // this is a proxy check that the frontend at least doesn't itself re-derive or double the figure.
    assert.equal(nearestRow(allRows, allRows[i].week_start), allRows[i]);
  }
});
