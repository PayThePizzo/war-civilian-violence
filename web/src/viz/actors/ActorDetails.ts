/** Builds the Web 3 actor detail side panel for one profile (WEB.md §26). */
import type { ActorProfile } from "../../data/types";
import { formatCount, formatPercent, formatWeekLabel } from "../../utils/format";

function row(label: string, value: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "actor-details-row";
  const name = document.createElement("span");
  name.className = "actor-details-label";
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.className = "actor-details-value";
  amount.textContent = value;
  line.append(name, amount);
  return line;
}

/** Renders the selected/hovered actor's card, or a placeholder when nothing is focused. */
export function renderActorDetails(profile: ActorProfile | null): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "actor-details";
  if (!profile) {
    const empty = document.createElement("p");
    empty.className = "actor-details-empty";
    empty.textContent = "Hover or select an actor to see its profile.";
    panel.append(empty);
    return panel;
  }

  const heading = document.createElement("p");
  heading.className = "actor-details-heading";
  heading.textContent = profile.actor_name;
  panel.append(
    heading,
    row("Total events", formatCount(profile.total_event_count)),
    row("Combat events", formatCount(profile.combat_event_count)),
    row("One-sided events", formatCount(profile.one_sided_event_count)),
    row("One-sided share", formatPercent(profile.one_sided_event_share, 1)),
    row("Actor deaths suffered", formatCount(profile.actor_deaths_suffered)),
    row("One-sided civilian fatalities", formatCount(profile.one_sided_civilian_fatalities)),
    row("Active weeks", formatCount(profile.active_week_count)),
    row("H3 cells", formatCount(profile.active_h3_cell_count)),
    row("Active", `${formatWeekLabel(profile.first_event_date)} - ${formatWeekLabel(profile.last_event_date)}`),
  );
  return panel;
}
