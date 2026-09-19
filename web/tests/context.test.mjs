import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleUrl } from "./tsModule.mjs";

const { contextForWeek, contextAnnotations } = await import(
  moduleUrl(new URL("../src/data/context.ts", import.meta.url))
);

test("contextForWeek: the 2025-10-20 week coincides with the El Fasher massacre", () => {
  assert.equal(contextForWeek(new Date("2025-10-20T00:00:00.000Z"))?.label, "El Fasher massacre");
});

test("contextForWeek: neighbouring weeks have no context", () => {
  assert.equal(contextForWeek(new Date("2025-10-13T00:00:00.000Z")), null);
  assert.equal(contextForWeek(new Date("2025-10-27T00:00:00.000Z")), null);
});

test("contextAnnotations: one UTC-midnight marker per entry", () => {
  const [marker] = contextAnnotations();
  assert.equal(marker.week.toISOString(), "2025-10-20T00:00:00.000Z");
  assert.equal(marker.label, "El Fasher massacre");
});
