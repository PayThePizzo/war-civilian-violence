/**
 * Instagram post 2 - "WHO shows a different violence profile?"
 * Static, non-interactive counterpart of Web 3's parallel-coordinates plot
 * (web/src/viz/actors/ActorParallelCoordinates.ts, VIZ.md §3): same
 * eligible_for_web3 actor universe and one-sided semantic color, but
 * re-composed as a ranked horizontal lollipop comparison (x = one-sided
 * event share, dot size = total_event_count) - no parallel-coordinates
 * geometry, axes, or six-metric layout carried over.
 */
import { loadSocialData } from "../../shared/data";
import { violenceColors } from "../../shared/colors";
import { formatCount, formatMonthYear, formatPercent } from "../../shared/format";
import type { ActorProfile } from "../../shared/types";
import sfaImageUrl from "../../images/SFA.png";
import rsfImageUrl from "../../images/RSF.png";

const sudanGovImageUrl = new URL("../../images/SudanGov.JPG", import.meta.url).href;

const ROOT_ID = "social-root";

/**
 * Deterministic display-only rule (never redefines eligible_for_web3, the
 * pipeline's own eligibility threshold - config/config.yaml's actors.min_events):
 * 1. Restrict to actor_profiles rows where eligible_for_web3 === true.
 * 2. Sort by one_sided_event_share descending; ties broken by
 *    total_event_count descending, then actor_id ascending, so the order
 *    never depends on CSV row order.
 * 3. Keep the top MAX_DISPLAY_ACTORS - with 11 actors currently eligible,
 *    this keeps the graphic scannable on a phone per the brief's 5-7 target.
 */
const MAX_DISPLAY_ACTORS = 6;

function selectDisplayActors(actors: readonly ActorProfile[]): ActorProfile[] {
  return actors
    .filter((row) => row.eligible_for_web3)
    .slice()
    .sort(
      (a, b) =>
        b.one_sided_event_share - a.one_sided_event_share ||
        b.total_event_count - a.total_event_count ||
        a.actor_id.localeCompare(b.actor_id),
    )
    .slice(0, MAX_DISPLAY_ACTORS);
}

async function render(): Promise<void> {
  const root = document.getElementById(ROOT_ID);
  if (!root) throw new Error("Missing #social-root");

  const data = await loadSocialData();
  const displayed = selectDisplayActors(data.actorProfiles);
  if (displayed.length === 0) throw new Error("No eligible_for_web3 actors found");

  const barActors = displayed.filter((a) => a.one_sided_event_share > 0);

  root.innerHTML = "";
  root.append(
    buildHeadline(),
    buildSubtitle(),
    buildDivider(),
    buildChartBlock(barActors),
    buildChartAnnotation(),
    buildDivider(),
    buildFooter(data.metadata.country, data.metadata.analysis_start, data.metadata.analysis_end),
  );

  document.body.dataset.renderState = "ready";
}

function buildHeadline(): HTMLHeadingElement {
  const headline = document.createElement("h1");
  headline.className = "social-headline";
  headline.textContent = "Sudan's armed actors leave very different civilian tolls";
  return headline;
}

function buildSubtitle(): HTMLParagraphElement {
  const subtitle = document.createElement("p");
  subtitle.className = "social-subtitle";
  subtitle.textContent = "RSF and SFA recorded one-sided violence in roughly a quarter of their events, while the Government of Sudan showed a much lower share.";
  return subtitle;
}

function buildDivider(): HTMLHRElement {
  const hr = document.createElement("hr");
  hr.className = "social-divider";
  return hr;
}

/** Ranked horizontal bars, direct-labeled (skill rule: a single series needs no legend box). */
function buildChartBlock(actors: readonly ActorProfile[]): HTMLDivElement {
  const block = document.createElement("div");
  block.className = "chart-block";

  const label = document.createElement("p");
  label.className = "panel-label";
  label.innerHTML =
    'ONE-SIDED EVENT SHARE <span class="panel-label-unit">· share of each actor\'s own recorded events classified as one-sided violence</span>';
  block.append(label);

  // Dot x-position is relative to the largest displayed share, not a fixed 0-100% axis -
  // every row still carries its own exact percentage as a direct label, so the position
  // only aids relative scanning and never substitutes for the printed number.
  const maxShare = Math.max(...actors.map((a) => a.one_sided_event_share), 0.01);
  const domainMax = maxShare * 1.15;

  // Dot size encodes total_event_count on a restrained sqrt scale (share stays the
  // primary read via x-position) - a flat size when all displayed actors tie.
  const counts = actors.map((a) => a.total_event_count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const list = document.createElement("div");
  list.className = "actor-list";
  for (const actor of actors) {
    list.append(buildLollipopRow(actor, domainMax, minCount, maxCount));
  }
  block.append(list);
  return block;
}

const MIN_DOT_DIAMETER_PX = 14;
const MAX_DOT_DIAMETER_PX = 26;

function dotDiameterPx(count: number, minCount: number, maxCount: number): number {
  if (maxCount === minCount) return (MIN_DOT_DIAMETER_PX + MAX_DOT_DIAMETER_PX) / 2;
  const t = (Math.sqrt(count) - Math.sqrt(minCount)) / (Math.sqrt(maxCount) - Math.sqrt(minCount));
  return MIN_DOT_DIAMETER_PX + t * (MAX_DOT_DIAMETER_PX - MIN_DOT_DIAMETER_PX);
}

function buildLollipopRow(actor: ActorProfile, domainMax: number, minCount: number, maxCount: number): HTMLDivElement {
  const row = document.createElement("div");
  const isSfa = actor.actor_name === "SFA";
  const isRsf = actor.actor_name === "RSF";
  const isSudanGov = actor.actor_name === "Government of Sudan";
  row.className = isSfa
    ? "actor-row actor-row-sfa"
    : isRsf
      ? "actor-row actor-row-rsf"
      : isSudanGov
        ? "actor-row actor-row-sudan-gov"
        : "actor-row";
  if (isSfa) row.style.setProperty("--actor-image", `url("${sfaImageUrl}")`);
  if (isRsf) row.style.setProperty("--actor-image", `url("${rsfImageUrl}")`);
  if (isSudanGov) row.style.setProperty("--actor-image", `url("${sudanGovImageUrl}")`);

  const head = document.createElement("div");
  head.className = "actor-row-head";
  const name = document.createElement("span");
  name.className = "actor-name";
  name.textContent = actor.actor_name;
  const share = document.createElement("span");
  share.className = "actor-share";
  share.textContent = formatPercent(actor.one_sided_event_share);
  head.append(name, share);

  const track = document.createElement("div");
  track.className = "lollipop-track";
  const widthPercent = Math.max(0, Math.min(100, (actor.one_sided_event_share / domainMax) * 100));
  const stem = document.createElement("div");
  stem.className = "lollipop-stem";
  stem.style.width = `${widthPercent}%`;
  stem.style.background = violenceColors.oneSided;
  const dot = document.createElement("div");
  dot.className = "lollipop-dot";
  const diameter = dotDiameterPx(actor.total_event_count, minCount, maxCount);
  dot.style.left = `${widthPercent}%`;
  dot.style.width = `${diameter}px`;
  dot.style.height = `${diameter}px`;
  dot.style.background = violenceColors.oneSided;
  track.append(stem, dot);

  const context = document.createElement("p");
  context.className = "actor-context";
  // Context stays off the lollipop's quantitative x-axis - plain text, not a second
  // mark - and one-sided fatalities are only mentioned when non-zero, so a minor
  // actor's row doesn't read as "0 one-sided civilian fatalities" clutter.
  context.textContent =
    actor.one_sided_civilian_fatalities > 0
      ? `${formatCount(actor.total_event_count)} events · ${formatCount(actor.one_sided_civilian_fatalities)} one-sided civilian fatalities`
      : `${formatCount(actor.total_event_count)} events`;

  row.append(head, track, context);
  return row;
}

function buildChartAnnotation(): HTMLDivElement {
  const finding = document.createElement("div");
  finding.className = "social-finding";
  const label = document.createElement("p");
  label.className = "social-finding-label";
  label.textContent = "Key Finding";
  const text = document.createElement("p");
  text.className = "social-finding-text";
  text.innerHTML =
    "Looking at each actor’s own recorded events, 27% of RSF events and 25% of SFA events were classified as one-sided violence, compared with 4% for the Government of Sudan.";
  finding.append(label, text);
  return finding;
}

function buildFooter(country: string, analysisStart: string, analysisEnd: string): HTMLDivElement {
  const wrap = document.createElement("div");
  const start = new Date(`${analysisStart}T00:00:00.000Z`);
  const end = new Date(`${analysisEnd}T00:00:00.000Z`);
  const footer = document.createElement("p");
  footer.className = "social-footer";
  footer.textContent = `UCDP Georeferenced Event Dataset (GED) · ${country} · ${formatMonthYear(start)}-${formatMonthYear(end)}`;
  wrap.append(footer);
  return wrap;
}

render().catch((error: unknown) => {
  const root = document.getElementById(ROOT_ID);
  if (root) {
    root.innerHTML = "";
    const message = document.createElement("p");
    message.className = "social-error";
    message.textContent = `Failed to render: ${error instanceof Error ? error.message : String(error)}`;
    root.appendChild(message);
  }
  document.body.dataset.renderState = "error";
  console.error(error);
});
