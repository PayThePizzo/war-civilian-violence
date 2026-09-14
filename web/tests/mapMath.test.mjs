import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleUrl } from "./tsModule.mjs";

const source = (path) => new URL(`../src/${path}.ts`, import.meta.url);
const {
  computeBounds,
  colorForShare,
  elevationForIntensity,
  opacityForIntensity,
  observedWeeks,
  stepWeek,
  MAX_ELEVATION,
} = await import(moduleUrl(source("viz/map/mapMath")));

test("computeBounds: null for empty input, tight bbox over cell centers otherwise", () => {
  assert.equal(computeBounds([]), null);
  const cells = [
    { h3_center_lat: 10, h3_center_lon: 20 },
    { h3_center_lat: 15, h3_center_lon: 18 },
    { h3_center_lat: 12, h3_center_lon: 25 },
  ];
  assert.deepEqual(computeBounds(cells), [[18, 10], [25, 15]]);
});

test("colorForShare: interpolates endpoints exactly and clamps out-of-range/NaN input", () => {
  assert.deepEqual(colorForShare(0, "#2a78d6", "#1baf7a"), [42, 120, 214, 255]);
  assert.deepEqual(colorForShare(1, "#2a78d6", "#1baf7a"), [27, 175, 122, 255]);
  assert.deepEqual(colorForShare(-5, "#2a78d6", "#1baf7a"), colorForShare(0, "#2a78d6", "#1baf7a"));
  assert.deepEqual(colorForShare(5, "#2a78d6", "#1baf7a"), colorForShare(1, "#2a78d6", "#1baf7a"));
  assert.deepEqual(colorForShare(NaN, "#2a78d6", "#1baf7a"), colorForShare(0, "#2a78d6", "#1baf7a"));
});

test("elevationForIntensity/opacityForIntensity: zero at zero value or zero max, capped at the max", () => {
  assert.equal(elevationForIntensity(0, 100), 0);
  assert.equal(elevationForIntensity(50, 0), 0);
  assert.equal(elevationForIntensity(100, 100), MAX_ELEVATION);
  assert.equal(elevationForIntensity(200, 100), MAX_ELEVATION); // over-max input clamps, never exceeds
  assert.ok(elevationForIntensity(25, 100) < elevationForIntensity(100, 100));

  assert.equal(opacityForIntensity(0, 100), 0.15);
  assert.equal(opacityForIntensity(100, 100), 1);
  assert.ok(opacityForIntensity(25, 100) > 0.15 && opacityForIntensity(25, 100) < 1);
});

test("observedWeeks: dedupes and sorts ascending", () => {
  const d = (n) => new Date(Date.UTC(2024, 0, 1 + n));
  const rows = [{ week_start: d(14) }, { week_start: d(0) }, { week_start: d(7) }, { week_start: d(0) }];
  assert.deepEqual(observedWeeks(rows), [d(0), d(7), d(14)]);
});

test("stepWeek: null current starts at an end, steps clamp instead of wrapping", () => {
  const d = (n) => new Date(Date.UTC(2024, 0, 1 + n));
  const weeks = [d(0), d(7), d(14)];
  assert.equal(stepWeek([], null, 1), null);
  assert.deepEqual(stepWeek(weeks, null, 1), d(0));
  assert.deepEqual(stepWeek(weeks, null, -1), d(14));
  assert.deepEqual(stepWeek(weeks, d(0), 1), d(7));
  assert.deepEqual(stepWeek(weeks, d(14), 1), d(14)); // clamps at the last week
  assert.deepEqual(stepWeek(weeks, d(0), -1), d(0)); // clamps at the first week
});
