/** Builds the Web 3 hover tooltip: identifies a line before the detail panel catches up. */
import type { ActorProfile } from "../../data/types";
import { formatPercent } from "../../utils/format";

export function renderActorTooltip(profile: ActorProfile): HTMLElement {
  const content = document.createElement("div");
  content.className = "actor-tooltip";
  const heading = document.createElement("p");
  heading.className = "tooltip-heading";
  heading.textContent = profile.actor_name;
  const share = document.createElement("p");
  share.className = "tooltip-row";
  const label = document.createElement("span");
  label.className = "tooltip-label";
  label.textContent = "One-sided share";
  const value = document.createElement("strong");
  value.className = "tooltip-value";
  value.textContent = formatPercent(profile.one_sided_event_share, 1);
  share.append(label, value);
  content.append(heading, share);
  return content;
}
