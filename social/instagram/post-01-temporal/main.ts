/**
 * Instagram post 1 — WHEN. Deliberately minimal: proves the render pipeline
 * (data load -> D3 -> fonts -> deterministic 1080x1350 canvas) end to end
 * with a real one-sided-share sparkline, not the finished editorial chart
 * from INSTA.md - the setup brief says not to build the final visualization
 * in detail yet.
 */
import * as d3 from "d3";
import { loadSocialData } from "../../shared/data";
import { violenceColors } from "../../shared/colors";
import { formatMonthYear } from "../../shared/format";
import type { WeeklyMetric } from "../../shared/types";

const ROOT_ID = "social-root";

async function render(): Promise<void> {
  const root = document.getElementById(ROOT_ID);
  if (!root) throw new Error("Missing #social-root");

  const data = await loadSocialData();
  // __ALL__ rows are read directly from weekly_metrics.csv, never summed from
  // actor rows - see CLAUDE.md's double-counting rule.
  const weekly = data.weeklyMetrics
    .filter((row) => row.actor_id === "__ALL__")
    .sort((a, b) => a.week_start.getTime() - b.week_start.getTime());

  root.innerHTML = "";

  const eyebrow = document.createElement("p");
  eyebrow.className = "social-eyebrow";
  eyebrow.textContent = "From Battlefield to Civilians · UCDP GED";
  root.appendChild(eyebrow);

  const headline = document.createElement("h1");
  headline.className = "social-headline";
  headline.textContent = "When does violence turn toward civilians?";
  root.appendChild(headline);

  const subtitle = document.createElement("p");
  subtitle.className = "social-subtitle";
  subtitle.textContent =
    "Weekly share of recorded events that were one-sided violence against civilians, Sudan.";
  root.appendChild(subtitle);

  const vizContainer = document.createElement("div");
  vizContainer.className = "social-viz";
  root.appendChild(vizContainer);
  renderOneSidedShareSparkline(vizContainer, weekly);

  const finding = document.createElement("div");
  finding.className = "social-finding";
  const findingLabel = document.createElement("p");
  findingLabel.className = "social-finding-label";
  findingLabel.textContent = "Main finding";
  const findingText = document.createElement("p");
  findingText.className = "social-finding-text";
  findingText.textContent =
    "Placeholder — to be written from the data once the full temporal visualization is built, describing association only, never causation.";
  finding.append(findingLabel, findingText);
  root.appendChild(finding);

  root.appendChild(buildFooter(data.metadata.country, data.metadata.analysis_start, data.metadata.analysis_end));

  document.body.dataset.renderState = "ready";
}

function renderOneSidedShareSparkline(
  container: HTMLElement,
  weekly: Pick<WeeklyMetric, "week_start" | "one_sided_event_share">[],
): void {
  const width = 920;
  const height = 220;
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "One-sided event share over time");

  if (weekly.length === 0) {
    svg.append("text").attr("x", 0).attr("y", height / 2).text("No weekly data");
    return;
  }

  const x = d3
    .scaleUtc()
    .domain(d3.extent(weekly, (d) => d.week_start) as [Date, Date])
    .range([0, width]);
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

  const line = d3
    .line<Pick<WeeklyMetric, "week_start" | "one_sided_event_share">>()
    .x((d) => x(d.week_start))
    .y((d) => y(d.one_sided_event_share));

  svg
    .append("path")
    .datum(weekly)
    .attr("fill", "none")
    .attr("stroke", violenceColors.oneSided)
    .attr("stroke-width", 3)
    .attr("d", line);
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
