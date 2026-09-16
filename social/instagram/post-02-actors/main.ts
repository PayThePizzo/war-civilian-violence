/**
 * Instagram post 2 — WHO. Deliberately minimal, same rationale as post 1's
 * main.ts: a real ranked-bar rendering of actor_profiles.csv proves the
 * pipeline end to end without building the finished editorial chart yet.
 */
import * as d3 from "d3";
import { loadSocialData } from "../../shared/data";
import { violenceColors } from "../../shared/colors";
import { formatMonthYear, formatPercent } from "../../shared/format";
import type { ActorProfile } from "../../shared/types";

const ROOT_ID = "social-root";
const MAX_ACTORS = 6;

async function render(): Promise<void> {
  const root = document.getElementById(ROOT_ID);
  if (!root) throw new Error("Missing #social-root");

  const data = await loadSocialData();
  // Default eligibility is the pipeline's own eligible_for_web3 threshold,
  // never re-derived here - see actors.min_events in config/config.yaml.
  const actors = data.actorProfiles
    .filter((row) => row.eligible_for_web3)
    .sort((a, b) => b.one_sided_event_share - a.one_sided_event_share)
    .slice(0, MAX_ACTORS);

  root.innerHTML = "";

  const eyebrow = document.createElement("p");
  eyebrow.className = "social-eyebrow";
  eyebrow.textContent = "From Battlefield to Civilians · UCDP GED";
  root.appendChild(eyebrow);

  const headline = document.createElement("h1");
  headline.className = "social-headline";
  headline.textContent = "Not all armed actors fight the same way";
  root.appendChild(headline);

  const subtitle = document.createElement("p");
  subtitle.className = "social-subtitle";
  subtitle.textContent = "Share of recorded events that were one-sided violence, by actor.";
  root.appendChild(subtitle);

  const vizContainer = document.createElement("div");
  vizContainer.className = "social-viz";
  root.appendChild(vizContainer);
  renderRankedBars(vizContainer, actors);

  const finding = document.createElement("div");
  finding.className = "social-finding";
  const findingLabel = document.createElement("p");
  findingLabel.className = "social-finding-label";
  findingLabel.textContent = "Main finding";
  const findingText = document.createElement("p");
  findingText.className = "social-finding-text";
  findingText.textContent =
    "Placeholder — to be written from the data once the full actor-comparison visualization is built.";
  finding.append(findingLabel, findingText);
  root.appendChild(finding);

  root.appendChild(buildFooter(data.metadata.country, data.metadata.analysis_start, data.metadata.analysis_end));

  document.body.dataset.renderState = "ready";
}

function renderRankedBars(
  container: HTMLElement,
  actors: Pick<ActorProfile, "actor_name" | "one_sided_event_share">[],
): void {
  const width = 920;
  const rowHeight = 56;
  const height = Math.max(rowHeight, actors.length * rowHeight);
  const labelWidth = 260;
  const barMaxWidth = width - labelWidth - 80;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "One-sided event share by actor");

  if (actors.length === 0) {
    svg.append("text").attr("x", 0).attr("y", rowHeight / 2).text("No eligible actors");
    return;
  }

  const x = d3.scaleLinear().domain([0, 1]).range([0, barMaxWidth]);

  const rows = svg
    .selectAll("g.actor-row")
    .data(actors)
    .join("g")
    .attr("class", "actor-row")
    .attr("transform", (_d, i) => `translate(0, ${i * rowHeight})`);

  rows
    .append("text")
    .attr("x", 0)
    .attr("y", rowHeight / 2)
    .attr("dominant-baseline", "middle")
    .attr("font-family", "var(--font-sans)")
    .attr("font-size", 20)
    .attr("fill", "var(--ink)")
    .text((d) => d.actor_name);

  rows
    .append("rect")
    .attr("x", labelWidth)
    .attr("y", rowHeight / 2 - 12)
    .attr("height", 24)
    .attr("width", (d) => x(d.one_sided_event_share))
    .attr("fill", violenceColors.oneSided);

  rows
    .append("text")
    .attr("x", (d) => labelWidth + x(d.one_sided_event_share) + 12)
    .attr("y", rowHeight / 2)
    .attr("dominant-baseline", "middle")
    .attr("font-family", "var(--font-sans)")
    .attr("font-size", 18)
    .attr("fill", "var(--body-text)")
    .text((d) => formatPercent(d.one_sided_event_share));
}

/** metadata.json supplies the analytical period; never hardcode these dates. */
function buildFooter(country: string, analysisStart: string, analysisEnd: string): HTMLParagraphElement {
  const footer = document.createElement("p");
  footer.className = "social-footer";
  const start = new Date(`${analysisStart}T00:00:00.000Z`);
  const end = new Date(`${analysisEnd}T00:00:00.000Z`);
  footer.textContent = `UCDP GED · ${country} · ${formatMonthYear(start)}–${formatMonthYear(end)}`;
  return footer;
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
