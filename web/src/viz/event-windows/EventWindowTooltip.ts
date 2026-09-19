/** Builds the Web 4 matrix cell hover tooltip (WEB.md §36). */
import { contextForWeek } from "../../data/context";
import type { EventWindow } from "../../data/types";
import { formatCount, formatWeekLabel } from "../../utils/format";
import type { Episode } from "./eventWindowMath";

function sectionHeading(text: string): HTMLElement {
  const heading = document.createElement("p");
  heading.className = "tooltip-section-heading";
  heading.textContent = text;
  return heading;
}

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

/** "not observed" for a null metric - never rendered as a false zero. Shared with the details panel. */
export const metricValue = (value: number | null): string => (value === null ? "not observed" : formatCount(value));

export function renderEventWindowTooltip(episode: Episode, cell: EventWindow): HTMLElement {
  const content = document.createElement("div");
  content.className = "ew-tooltip";
  const heading = document.createElement("p");
  heading.className = "tooltip-heading";
  heading.textContent = episode.actorName;
  const context = contextForWeek(cell.calendar_week);
  content.append(
    heading,
    sectionHeading("Actor / Episode"),
    row("Episode rank", String(episode.peakRank)),
    row("T0", formatWeekLabel(episode.t0Date)),
    sectionHeading("Current position"),
    row("Relative week", cell.relative_week === 0 ? "T0" : `T${cell.relative_week > 0 ? "+" : ""}${cell.relative_week}`),
    row("Calendar week", formatWeekLabel(cell.calendar_week)),
    row("Status", cell.is_observed_week ? "Observed" : "Not observed"),
    ...(context ? [row("Coincides with", context.label)] : []),
    sectionHeading("Combat context"),
    row("Combat events", metricValue(cell.combat_event_count)),
    row("Combatant fatalities", metricValue(cell.combatant_fatalities)),
    row("Actor deaths suffered", metricValue(cell.actor_deaths_suffered)),
    sectionHeading("Civilian violence"),
    row("One-sided events", metricValue(cell.one_sided_event_count)),
    row("One-sided civilian fatalities", metricValue(cell.one_sided_civilian_fatalities)),
    row("Civilian fatalities", metricValue(cell.civilian_fatalities)),
  );
  return content;
}
