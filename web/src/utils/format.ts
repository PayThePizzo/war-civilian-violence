/** Shared number/date formatting so every view reads the same way. */
import { utcFormat } from "d3";

const countFormat = new Intl.NumberFormat("en");
const weekLabelFormat = utcFormat("%d %b %Y");

export function formatCount(value: number): string {
  return countFormat.format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** "03 Jun 2024", matching the tooltip mockups in WEB.md. */
export function formatWeekLabel(date: Date): string {
  return weekLabelFormat(date);
}
