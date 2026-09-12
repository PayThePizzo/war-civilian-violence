import type { AppData } from "../data/types";

/** Chart-free data summary for the first milestone described in WEB.md. */
export class DataPreview {
  protected readonly data: AppData;
  protected readonly scope: HTMLParagraphElement;
  private readonly content: HTMLDivElement;

  constructor(container: HTMLElement, data: AppData, rowCount: number) {
    this.data = data;
    this.content = document.createElement("div");
    this.content.className = "data-preview";
    const count = document.createElement("p");
    count.textContent = `Data loaded: ${rowCount.toLocaleString("en")} rows.`;
    this.scope = document.createElement("p");
    this.scope.className = "scope-summary";
    this.content.append(count, this.scope);
    container.append(this.content);
  }

  protected actorName(actorId: string): string {
    if (actorId === "__ALL__") return "All actors";
    return this.data.actorProfiles.find((actor) => actor.actor_id === actorId)?.actor_name ?? actorId;
  }

  destroy(): void {
    this.content.remove();
  }
}
