/** Builds the ConflictMap hover tooltip content for one H3 cell (WEB.md §21). */
import type { H3Cell } from "./H3Layer";
import { formatCount, formatPercent } from "../../utils/format";

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

/** All values a hovered H3 cell's tooltip shows; text content only (untrusted labels). */
export function renderMapTooltip(cell: H3Cell, heading: string): HTMLElement {
  const content = document.createElement("div");
  content.className = "map-tooltip";
  const title = document.createElement("p");
  title.className = "tooltip-heading";
  title.textContent = heading;
  content.append(
    title,
    row("Events", formatCount(cell.event_count)),
    row("Combat events", formatCount(cell.combat_event_count)),
    row("One-sided events", formatCount(cell.one_sided_event_count)),
    row("One-sided event share", formatPercent(cell.one_sided_event_share, 1)),
    row("Best-estimate fatalities", formatCount(cell.best_fatalities)),
    row("One-sided civilian fatalities", formatCount(cell.one_sided_civilian_fatalities)),
  );
  return content;
}
