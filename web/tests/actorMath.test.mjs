import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleUrl } from "./tsModule.mjs";

const source = (path) => new URL(`../src/${path}.ts`, import.meta.url);
const { AXES, buildAxisScales, axisPositions, pointsForProfile } = await import(moduleUrl(source("viz/actors/actorMath")));

const BASE = {
  actor_id: "a",
  actor_name: "A",
  first_event_date: new Date(),
  last_event_date: new Date(),
  active_week_count: 0,
  total_event_count: 0,
  combat_event_count: 0,
  one_sided_event_count: 0,
  combatant_fatalities_in_involved_events: 0,
  actor_deaths_suffered: 0,
  civilian_fatalities_in_involved_events: 0,
  one_sided_civilian_fatalities: 0,
  one_sided_event_share: 0,
  active_location_count: 0,
  active_h3_cell_count: 0,
  events_per_active_week: 0,
  one_sided_events_per_active_week: 0,
  civilian_fatalities_per_active_week: 0,
  eligible_for_web3: true,
};

const profile = (overrides) => ({ ...BASE, ...overrides });

test("AXES: exactly the six WEB.md §25 metrics, in order", () => {
  assert.deepEqual(AXES.map((axis) => axis.key), [
    "combat_event_count",
    "actor_deaths_suffered",
    "one_sided_event_count",
    "one_sided_civilian_fatalities",
    "one_sided_event_share",
    "active_h3_cell_count",
  ]);
});

test("buildAxisScales: symlog axes span [0, observed max] -> [height, 0]", () => {
  const profiles = [profile({ combat_event_count: 0 }), profile({ combat_event_count: 40 }), profile({ combat_event_count: 10 })];
  const scales = buildAxisScales(profiles, 200);
  const scale = scales.get("combat_event_count");
  assert.equal(scale.domain()[0], 0);
  assert.equal(scale.domain()[1], 40);
  assert.equal(scale(0), 200); // range bottom (SVG y grows down)
  assert.equal(scale(40), 0); // range top
  assert.ok(scale(10) > 0 && scale(10) < 200);
});

test("buildAxisScales: all-zero data falls back to a non-degenerate domain instead of NaN", () => {
  const profiles = [profile(), profile()];
  const scale = buildAxisScales(profiles, 200).get("actor_deaths_suffered");
  assert.ok(Number.isFinite(scale(0)));
  assert.equal(scale(0), 200);
});

test("buildAxisScales: one_sided_event_share always uses a fixed [0, 1] domain, never rescaled to the data", () => {
  const profiles = [profile({ one_sided_event_share: 0.2 }), profile({ one_sided_event_share: 0.4 })];
  const scale = buildAxisScales(profiles, 200).get("one_sided_event_share");
  assert.deepEqual(scale.domain(), [0, 1]);
  assert.equal(scale(0), 200);
  assert.equal(scale(1), 0);
  assert.equal(scale(0.5), 100);
});

test("axisPositions: evenly spaced across the width, endpoints at 0 and width", () => {
  assert.deepEqual(axisPositions(0, 300), []);
  assert.deepEqual(axisPositions(1, 300), [0]);
  const positions = axisPositions(6, 300);
  assert.equal(positions.length, 6);
  assert.equal(positions[0], 0);
  assert.equal(positions[5], 300);
  assert.equal(positions[1], 60);
});

test("pointsForProfile: one {x, y} per axis, x from positions, y from that axis's scale", () => {
  const profiles = [profile({ combat_event_count: 40, one_sided_event_share: 1 })];
  const scales = buildAxisScales(profiles, 200);
  const positions = axisPositions(AXES.length, 300);
  const points = pointsForProfile(profiles[0], scales, positions);
  assert.equal(points.length, AXES.length);
  assert.deepEqual(points.map((p) => p.x), positions);
  assert.equal(points[0].y, 0); // combat_event_count at its own max -> range top
  assert.equal(points[4].y, 0); // one_sided_event_share = 1 -> range top
});
