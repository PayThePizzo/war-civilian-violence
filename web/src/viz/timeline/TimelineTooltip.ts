/** Builds the Timeline hover tooltip content for one week's row (WEB.md §13). */
import type { WeeklyMetric } from "../../data/types";
import { formatCount, formatPercent, formatWeekLabel } from "../../utils/format";
import { violenceColors } from "../../utils/colors";

function row(label: string, value: string, keyColor?: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "tooltip-row";
  if (keyColor) {
    const key = document.createElement("span");
    key.className = "tooltip-key";
    key.style.backgroundColor = keyColor;
    key.setAttribute("aria-hidden", "true");
    line.append(key);
  }
  const name = document.createElement("span");
  name.className = "tooltip-label";
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.className = "tooltip-value";
  amount.textContent = value;
  line.append(name, amount);
  return line;
}

/** All values a hovered week's crosshair shows; text content only (untrusted labels). */
export function renderTimelineTooltip(metric: WeeklyMetric): HTMLElement {
  const content = document.createElement("div");
  content.className = "timeline-tooltip";
  const heading = document.createElement("p");
  heading.className = "tooltip-heading";
  heading.textContent = `Week of ${formatWeekLabel(metric.week_start)}`;
  content.append(
    heading,
    row("State-based events", formatCount(metric.state_based_event_count), violenceColors.stateBased),
    row("Non-state events", formatCount(metric.non_state_event_count), violenceColors.nonState),
    row("One-sided events", formatCount(metric.one_sided_event_count), violenceColors.oneSided),
    row("One-sided share", formatPercent(metric.one_sided_event_share, 1)),
    row("One-sided civilian fatalities", formatCount(metric.one_sided_civilian_fatalities), violenceColors.oneSided),
  );
  return content;
}
