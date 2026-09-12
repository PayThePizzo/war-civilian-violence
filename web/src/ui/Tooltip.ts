/** Generic hover tooltip: positions a content element near the pointer, clamped to its host. */
export interface Tooltip {
  /** Show with the given content at a host-relative (x, y) anchor point. */
  show(content: Node, x: number, y: number): void;
  hide(): void;
  destroy(): void;
}

const OFFSET = 12;

/** Create a tooltip absolutely positioned within `host`; caller must set `position: relative` on host. */
export function createTooltip(host: HTMLElement): Tooltip {
  const element = document.createElement("div");
  element.className = "tooltip";
  element.setAttribute("role", "status");
  element.hidden = true;
  host.append(element);

  function show(content: Node, x: number, y: number): void {
    element.replaceChildren(content);
    element.hidden = false;
    // Measure after making visible so offsetWidth/Height reflect this content.
    const hostWidth = host.clientWidth;
    const hostHeight = host.clientHeight;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const left = Math.min(Math.max(0, x + OFFSET), Math.max(0, hostWidth - width));
    const top = Math.min(Math.max(0, y + OFFSET), Math.max(0, hostHeight - height));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function hide(): void {
    element.hidden = true;
  }

  function destroy(): void {
    element.remove();
  }

  return { show, hide, destroy };
}
