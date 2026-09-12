import { violenceColors } from "../utils/colors";

/** Use the shared palette for labeled swatches; color is never the only label. */
export function createViolenceLegend(container: HTMLElement): () => void {
  const legend = document.createElement("ul");
  legend.className = "violence-legend";
  legend.setAttribute("aria-label", "Types of violence");
  const entries = [
    ["State-based", violenceColors.stateBased],
    ["Non-state", violenceColors.nonState],
    ["One-sided", violenceColors.oneSided],
  ];
  for (const [label, color] of entries) {
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = color;
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, document.createTextNode(label));
    legend.append(item);
  }
  container.append(legend);
  return () => legend.remove();
}
