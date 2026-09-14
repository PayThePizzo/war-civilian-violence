/** Builds the Web 4 matrix cell hover tooltip (WEB.md §36). */
import type { EventWindow } from "../../data/types";
import { formatCount, formatWeekLabel } from "../../utils/format";
import type { Episode } from "./eventWindowMath";

function row(label: string, value: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "tooltip-row";
  const name = document.createElement("span");
  name.className = "tooltip-label";
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.className = "tooltip-value";
  amount.textContent = value;
  line.append(name, amount);
  return line;
}

const metricValue = (value: number | null) => (value === null ? "not observed" : formatCount(value));

export function renderEventWindowTooltip(episode: Episode, cell: EventWindow): HTMLElement {
  const content = document.createElement("div");
  content.className = "ew-tooltip";
  const heading = document.createElement("p");
  heading.className = "tooltip-heading";
  heading.textContent = episode.actorName;
  const subheading = document.createElement("p");
  subheading.className = "tooltip-subheading";
  subheading.textContent = `Episode rank ${episode.peakRank}`;
  content.append(
    heading,
    subheading,
    row("T0", formatWeekLabel(episode.t0Date)),
    row("Current", cell.relative_week === 0 ? "T0" : `T${cell.relative_week > 0 ? "+" : ""}${cell.relative_week}`),
    row("Calendar week", formatWeekLabel(cell.calendar_week)),
    row("Combat events", metricValue(cell.combat_event_count)),
    row("Combatant fatalities", metricValue(cell.combatant_fatalities)),
    row("Actor deaths suffered", metricValue(cell.actor_deaths_suffered)),
    row("One-sided events", metricValue(cell.one_sided_event_count)),
    row("Civilian fatalities", metricValue(cell.civilian_fatalities)),
  );
  return content;
}
