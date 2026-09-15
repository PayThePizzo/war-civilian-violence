/** Builds the Web 3 actor detail side panel for one profile (WEB.md §26). */
import type { ActorProfile } from "../../data/types";
import { formatCount, formatPercent, formatWeekLabel } from "../../utils/format";
import { METRIC_LABELS } from "./actorMath";

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

function group(title: string, rows: HTMLElement[]): HTMLElement {
  const section = document.createElement("div");
  section.className = "actor-details-group";
  const heading = document.createElement("p");
  heading.className = "actor-details-group-heading";
  heading.textContent = title;
  section.append(heading, ...rows);
  return section;
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
    group("Activity", [
      row(METRIC_LABELS.total_event_count, formatCount(profile.total_event_count)),
      row(METRIC_LABELS.combat_event_count, formatCount(profile.combat_event_count)),
      row(METRIC_LABELS.active_week_count, formatCount(profile.active_week_count)),
    ]),
    group("One-sided violence", [
      row(METRIC_LABELS.one_sided_event_count, formatCount(profile.one_sided_event_count)),
      row(METRIC_LABELS.one_sided_event_share, formatPercent(profile.one_sided_event_share, 1)),
      row(METRIC_LABELS.one_sided_civilian_fatalities, formatCount(profile.one_sided_civilian_fatalities)),
    ]),
    group("Losses / geography", [
      row(METRIC_LABELS.actor_deaths_suffered, formatCount(profile.actor_deaths_suffered)),
      row(METRIC_LABELS.active_h3_cell_count, formatCount(profile.active_h3_cell_count)),
    ]),
    group("Active period", [
      row("First -> last event", `${formatWeekLabel(profile.first_event_date)} -> ${formatWeekLabel(profile.last_event_date)}`),
    ]),
  );
  return panel;
}
