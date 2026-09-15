/** Builds the Web 4 persistent Episode Details side panel: shows the hovered or selected episode. */
import type { EventWindow } from "../../data/types";
import { formatCount, formatWeekLabel } from "../../utils/format";
import { metricValue } from "./EventWindowTooltip";
import type { BackgroundMetric, Episode } from "./eventWindowMath";
import { BACKGROUND_METRIC_LABELS } from "./eventWindowMath";

function row(label: string, value: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "ew-details-row";
  const name = document.createElement("span");
  name.className = "ew-details-label";
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.className = "ew-details-value";
  amount.textContent = value;
  line.append(name, amount);
  return line;
}

function group(title: string, rows: HTMLElement[]): HTMLElement {
  const section = document.createElement("div");
  section.className = "ew-details-group";
  const heading = document.createElement("p");
  heading.className = "ew-details-group-heading";
  heading.textContent = title;
  section.append(heading, ...rows);
  return section;
}

export interface EventWindowDetailsOptions {
  metric: BackgroundMetric;
  /** Name of the globally selected actor (Web 1/2/3's selectedActorId), if any is set. */
  selectedActorName: string | null;
}

/**
 * Renders the currently hovered-or-selected episode's profile, or a placeholder when nothing is
 * focused. Only ever reads pipeline-computed fields (episode_id, peak_rank, t0_date, the T0 row's
 * metrics, is_observed_week) - no episode detection or statistics are computed in the browser.
 */
export function renderEventWindowDetails(episode: Episode | null, options: EventWindowDetailsOptions): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "ew-details";

  const metricLabel = BACKGROUND_METRIC_LABELS[options.metric];

  if (!episode) {
    const empty = document.createElement("p");
    empty.className = "ew-details-empty";
    empty.textContent = options.selectedActorName
      ? `Hover an episode to inspect its temporal profile for ${options.selectedActorName}.`
      : "Hover an episode to inspect its temporal profile.";
    panel.append(empty);
    return panel;
  }

  const t0Row: EventWindow | undefined = episode.rows.find((r) => r.relative_week === 0);
  const observedWeeks = episode.rows.filter((r) => r.is_observed_week).length;

  const heading = document.createElement("p");
  heading.className = "ew-details-heading";
  heading.textContent = episode.actorName;

  panel.append(
    heading,
    group("Episode", [
      row("T0 date", formatWeekLabel(episode.t0Date)),
      row("Episode rank", String(episode.peakRank)),
      row("Peak metric value", formatCount(t0Row?.peak_metric_value ?? episode.rows[0]?.peak_metric_value ?? 0)),
    ]),
    group("At T0", [
      row("Combat events", t0Row ? metricValue(t0Row.combat_event_count) : "not observed"),
      row("Combatant fatalities", t0Row ? metricValue(t0Row.combatant_fatalities) : "not observed"),
      row("Actor deaths suffered", t0Row ? metricValue(t0Row.actor_deaths_suffered) : "not observed"),
      row("One-sided events", t0Row ? metricValue(t0Row.one_sided_event_count) : "not observed"),
      row("One-sided civilian fatalities", t0Row ? metricValue(t0Row.one_sided_civilian_fatalities) : "not observed"),
    ]),
    group("Window", [
      row("Observed weeks", `${observedWeeks} of ${episode.rows.length}`),
      row("Background metric", metricLabel),
    ]),
  );
  return panel;
}
