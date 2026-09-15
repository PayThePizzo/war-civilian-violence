/** Local-only Web 2 controls: mode/metric/2D-3D toggles and the Week-mode stepper (WEB.md §18-20). */
import { formatWeekLabel } from "../../utils/format";
import { COLOR_METRIC_LABELS, INTENSITY_METRIC_LABELS, observedWeeks, stepWeek } from "./mapMath";
import type { ColorMetric, IntensityMetric } from "./mapMath";

const PLAY_INTERVAL_MS = 900;

export interface MapControlsOptions {
  onModeChange: (mode: "overview" | "week") => void;
  onIntensityChange: (metric: IntensityMetric) => void;
  onColorChange: (metric: ColorMetric) => void;
  onExtrudedChange: (extruded: boolean) => void;
  onWeekChange: (week: Date) => void;
}

const INTENSITY_OPTIONS = Object.entries(INTENSITY_METRIC_LABELS) as Array<[IntensityMetric, string]>;
const COLOR_OPTIONS = Object.entries(COLOR_METRIC_LABELS) as Array<[ColorMetric, string]>;

export class MapControls {
  readonly root: HTMLDivElement;
  private readonly overviewButton: HTMLButtonElement;
  private readonly weekButton: HTMLButtonElement;
  private readonly stepper: HTMLDivElement;
  private readonly prevButton: HTMLButtonElement;
  private readonly playButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly weekLabel: HTMLSpanElement;
  private readonly extrudedButton: HTMLButtonElement;
  private readonly options: MapControlsOptions;

  private mode: "overview" | "week" = "overview";
  private weeks: Date[] = [];
  private currentWeek: Date | null = null;
  private extruded = false;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MapControlsOptions) {
    this.options = options;
    this.root = document.createElement("div");
    this.root.className = "map-controls";

    const modeGroup = document.createElement("div");
    modeGroup.className = "map-controls-row";
    modeGroup.setAttribute("role", "group");
    modeGroup.setAttribute("aria-label", "Mode");
    this.overviewButton = document.createElement("button");
    this.overviewButton.type = "button";
    this.overviewButton.textContent = "Overview";
    this.weekButton = document.createElement("button");
    this.weekButton.type = "button";
    this.weekButton.textContent = "Week";
    this.weekButton.disabled = true;
    this.overviewButton.addEventListener("click", () => this.setMode("overview"));
    this.weekButton.addEventListener("click", () => this.setMode("week"));
    modeGroup.append(this.overviewButton, this.weekButton);

    this.stepper = document.createElement("div");
    this.stepper.className = "map-controls-row map-stepper";
    this.stepper.hidden = true;
    this.prevButton = document.createElement("button");
    this.prevButton.type = "button";
    this.prevButton.textContent = "◀";
    this.prevButton.setAttribute("aria-label", "Previous week");
    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.textContent = "Play";
    this.nextButton = document.createElement("button");
    this.nextButton.type = "button";
    this.nextButton.textContent = "▶";
    this.nextButton.setAttribute("aria-label", "Next week");
    this.weekLabel = document.createElement("span");
    this.weekLabel.className = "map-week-label";
    this.prevButton.addEventListener("click", () => this.step(-1));
    this.nextButton.addEventListener("click", () => this.step(1));
    this.playButton.addEventListener("click", () => this.togglePlay());
    this.stepper.append(this.prevButton, this.playButton, this.nextButton, this.weekLabel);

    const metricRow = document.createElement("div");
    metricRow.className = "map-controls-row";
    metricRow.append(
      this.buildSelect("Intensity", INTENSITY_OPTIONS, (value) => options.onIntensityChange(value as IntensityMetric)),
      this.buildSelect("Colour", COLOR_OPTIONS, (value) => options.onColorChange(value as ColorMetric)),
    );

    this.extrudedButton = document.createElement("button");
    this.extrudedButton.type = "button";
    this.extrudedButton.textContent = "2D";
    this.extrudedButton.setAttribute("aria-pressed", "false");
    this.extrudedButton.addEventListener("click", () => {
      this.extruded = !this.extruded;
      this.extrudedButton.textContent = this.extruded ? "3D" : "2D";
      this.extrudedButton.setAttribute("aria-pressed", String(this.extruded));
      options.onExtrudedChange(this.extruded);
    });
    metricRow.append(this.extrudedButton);

    this.root.append(modeGroup, this.stepper, metricRow);
    this.setMode("overview");
  }

  private buildSelect(
    label: string,
    entries: ReadonlyArray<readonly [string, string]>,
    onChange: (value: string) => void,
  ): HTMLLabelElement {
    const wrapper = document.createElement("label");
    wrapper.className = "map-select";
    const text = document.createElement("span");
    text.textContent = label;
    const select = document.createElement("select");
    for (const [value, optionLabel] of entries) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = optionLabel;
      select.append(option);
    }
    select.addEventListener("change", () => onChange(select.value));
    wrapper.append(text, select);
    return wrapper;
  }

  /** Rebuild the observed-weeks stepper for the current actor; called on every store update. */
  setAvailableWeeks(rows: readonly { week_start: Date }[]): void {
    this.weeks = observedWeeks(rows);
  }

  /**
   * Sync to the shared store's focusWeek (WEB.md §19: a Web 1 click switches the map to Week
   * mode automatically). Drives the same callbacks a user click would, so the caller only needs
   * one code path for "current week/mode changed" regardless of the source.
   */
  syncFromStore(week: Date | null): void {
    this.currentWeek = week;
    this.weekButton.disabled = week === null;
    const mode = week === null ? "overview" : "week";
    if (mode !== this.mode) this.setMode(mode);
    if (week !== null) this.options.onWeekChange(week);
    this.renderWeekLabel();
  }

  private setMode(mode: "overview" | "week"): void {
    this.mode = mode;
    this.overviewButton.setAttribute("aria-pressed", String(mode === "overview"));
    this.weekButton.setAttribute("aria-pressed", String(mode === "week"));
    this.stepper.hidden = mode !== "week";
    if (mode === "overview") this.stopPlay();
    this.options.onModeChange(mode);
  }

  private step(direction: -1 | 1): void {
    const next = stepWeek(this.weeks, this.currentWeek, direction);
    if (next === null) return;
    this.currentWeek = next;
    this.renderWeekLabel();
    this.options.onWeekChange(next);
  }

  private togglePlay(): void {
    if (this.playTimer) {
      this.stopPlay();
      return;
    }
    this.playButton.textContent = "Pause";
    this.playTimer = setInterval(() => {
      if (this.currentWeek !== null && this.weeks.length > 0
        && this.currentWeek.getTime() === this.weeks[this.weeks.length - 1].getTime()) {
        this.stopPlay();
        return;
      }
      this.step(1);
    }, PLAY_INTERVAL_MS);
  }

  private stopPlay(): void {
    if (this.playTimer) clearInterval(this.playTimer);
    this.playTimer = null;
    this.playButton.textContent = "Play";
  }

  private renderWeekLabel(): void {
    this.weekLabel.textContent = this.currentWeek === null ? "" : `Week of ${formatWeekLabel(this.currentWeek)}`;
  }

  destroy(): void {
    this.stopPlay();
    this.root.remove();
  }
}
