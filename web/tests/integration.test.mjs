import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { csvParseRows, csvFormatRows } from "d3";

// Use the installed TypeScript compiler to exercise the same source modules in
// Node, replacing only Vite's base URL and module-resolution conventions.
const modules = new Map();
function moduleUrl(file, base = "./") {
  const key = `${file.href}:${base}`;
  if (modules.has(key)) return modules.get(key);
  let code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  code = code.replaceAll("import.meta.env.BASE_URL", JSON.stringify(base));
  code = code.replace(/from "([^"]+)"/g, (_, specifier) => {
    const dependency = specifier.startsWith(".")
      ? moduleUrl(new URL(`${specifier}.ts`, file), base)
      : import.meta.resolve(specifier);
    return `from ${JSON.stringify(dependency)}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  modules.set(key, url);
  return url;
}

const source = (path) => new URL(`../src/${path}.ts`, import.meta.url);
const parsers = await import(moduleUrl(source("data/parsers")));
const selectors = await import(moduleUrl(source("data/selectors")));
const { createStore } = await import(moduleUrl(source("app/store")));
const loadersFor = (base) => import(moduleUrl(source("data/loaders"), base));
const contracts = [
  ["weekly_metrics.csv", "weeklyMetrics", "loadWeeklyMetrics", parsers.parseWeeklyMetric],
  ["h3_weekly_metrics.csv", "h3Metrics", "loadH3Metrics", parsers.parseH3Metric],
  ["actor_profiles.csv", "actorProfiles", "loadActorProfiles", parsers.parseActorProfile],
  ["event_windows.csv", "eventWindows", "loadEventWindows", parsers.parseEventWindow],
];
const assets = new Map([...contracts.map(([file]) => file), "metadata.json"].map((file) => [
  file, readFileSync(new URL(`../../data/derived/${file}`, import.meta.url), "utf8"),
]));

async function withFetch(mock, check) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { return await check(); } finally { globalThis.fetch = original; }
}

async function loadData(base = "./") {
  const loaders = await loadersFor(base);
  return withFetch(async (url) => new Response(assets.get(url.split("/").at(-1))), () => loaders.loadAppData());
}

test("loads all real datasets concurrently under root, relative, and subdirectory bases", async () => {
  for (const base of ["/", "./", "/project/"]) {
    const loaders = await loadersFor(base);
    const pending = [];
    await withFetch((url) => new Promise((resolve) => pending.push({ url, resolve })), async () => {
      const promise = loaders.loadAppData();
      assert.deepEqual(pending.map(({ url }) => url), [...assets.keys()].map((file) => `${base}data/${file}`));
      for (const { url, resolve } of pending) resolve(new Response(assets.get(url.split("/").at(-1))));
      const data = await promise;
      for (const [file, key, , parser] of contracts) {
        const [columns, ...rows] = csvParseRows(assets.get(file));
        assert.deepEqual(parser.columns, columns);
        assert.equal(data[key].length, rows.length);
        assert.deepEqual(Object.keys(data[key][0]), columns);
      }
      assert.deepEqual(data.metadata, JSON.parse(assets.get("metadata.json")));
      assert.ok(data.weeklyMetrics[0].week_start instanceof Date);
      assert.equal(data.weeklyMetrics.find((row) => row.actor_id === "__ALL__").actor_deaths_suffered, null);
    });
  }
});

test("valid empty datasets work; incomplete or duplicate headers fail before row conversion", async () => {
  const loaders = await loadersFor("./");
  for (const [file, , load] of contracts) {
    const [columns] = csvParseRows(assets.get(file));
    await withFetch(async () => new Response(csvFormatRows([columns])), async () => {
      assert.deepEqual(await loaders[load](), []);
    });
    for (const header of [columns.slice(0, -1), [...columns, columns[0]]]) {
      await withFetch(async () => new Response(csvFormatRows([header])), async () => {
        await assert.rejects(loaders[load](), /missing required columns|duplicate column names/);
      });
    }
  }
});

test("truncated and extra CSV fields fail; explicit missing metrics stay null", async () => {
  const loaders = await loadersFor("./");
  const [columns, row] = csvParseRows(assets.get("event_windows.csv"));
  for (const values of [row.slice(0, 9), [...row, "unexpected"]]) {
    await withFetch(async () => new Response(csvFormatRows([columns, values])), async () => {
      await assert.rejects(loaders.loadEventWindows(), /event_windows.csv.*CSV data row 1.*fields/);
    });
  }
  const data = await loadData();
  assert.ok(data.eventWindows.some((row) => !row.is_observed_week && row.combat_event_count === null));
  assert.ok(data.eventWindows.some((row) => row.is_observed_week && row.combat_event_count === 0));
  const quoted = [...row];
  quoted[columns.indexOf("actor_name")] = 'Name, with "quotes"\nand a newline';
  await withFetch(async () => new Response("\uFEFF" + csvFormatRows([columns, quoted])), async () => {
    assert.equal((await loaders.loadEventWindows())[0].actor_name, quoted[2]);
  });
});

test("request and decoding failures reject the complete load with a filename", async () => {
  const loaders = await loadersFor("./");
  for (const response of [
    () => new Response("missing", { status: 404 }),
    () => new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    () => new Response("{"),
    () => new Response("{}"),
  ]) {
    await withFetch(async (url) => url.endsWith("metadata.json") ? response() : new Response(assets.get(url.split("/").at(-1))), async () => {
      await assert.rejects(loaders.loadAppData(), /metadata.json/);
    });
  }
});

test("shared actor/week updates select consistent data and reset to the overview", async () => {
  const data = await loadData();
  const store = createStore();
  const seen = [];
  const unsubscribe = store.subscribe((state) => seen.push({
    weekly: selectors.getWeeklyForActor(data, state.selectedActorId),
    map: state.focusWeek === null
      ? selectors.aggregateH3Overview(data, state.selectedActorId)
      : selectors.getH3ForActorAndWeek(data, state.selectedActorId, state.focusWeek),
    episodes: selectors.getEpisodesForActor(data, state.selectedActorId),
  }));
  const episode = data.eventWindows[0];
  store.setState({ selectedActorId: episode.actor_id, focusWeek: episode.t0_date });
  assert.ok(seen.at(-1).weekly.every((row) => row.actor_id === episode.actor_id));
  assert.ok(seen.at(-1).map.every((row) => row.actor_id === episode.actor_id && +row.week_start === +episode.t0_date));
  assert.ok(seen.at(-1).episodes.every((row) => row.actor_id === episode.actor_id));
  store.setState({ focusWeek: new Date(episode.t0_date) });
  assert.equal(seen.length, 2);
  store.reset();
  assert.deepEqual(seen[0], seen[2]);
  unsubscribe();
  store.setState({ selectedActorId: episode.actor_id });
  assert.equal(seen.length, 3);
});

test("overview conserves global counts, computes ratios of sums, and leaves sources unchanged", async () => {
  const data = await loadData();
  const before = JSON.stringify(data);
  const overview = selectors.aggregateH3Overview(data, "__ALL__");
  const global = data.h3Metrics.filter((row) => row.actor_id === "__ALL__");
  assert.equal(overview.reduce((sum, row) => sum + row.event_count, 0), global.reduce((sum, row) => sum + row.event_count, 0));
  for (const cell of overview) {
    assert.equal(cell.one_sided_event_share, cell.event_count ? cell.one_sided_event_count / cell.event_count : 0);
    assert.equal(cell.civilian_fatality_share, cell.best_fatalities ? cell.civilian_fatalities / cell.best_fatalities : 0);
    assert.equal(cell.one_sided_civilian_fatality_share, cell.best_fatalities ? cell.one_sided_civilian_fatalities / cell.best_fatalities : 0);
    assert.equal("week_start" in cell, false);
  }
  const top = selectors.getTopEpisodes(data, 2);
  assert.equal(new Set(top.map((row) => row.episode_id)).size, 2);
  for (const id of new Set(top.map((row) => row.episode_id))) {
    assert.equal(top.filter((row) => row.episode_id === id).length, data.eventWindows.filter((row) => row.episode_id === id).length);
  }
  assert.equal(JSON.stringify(data), before);
});
