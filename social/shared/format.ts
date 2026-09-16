/** Same number/date formatting as web/src/utils/format.ts, so posts read like the website. */
import { utcFormat } from "d3";

const countFormat = new Intl.NumberFormat("en");
const weekLabelFormat = utcFormat("%d %b %Y");
const monthYearFormat = utcFormat("%b %Y");

export function formatCount(value: number): string {
  return countFormat.format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** "03 Jun 2024", matching the tooltip mockups in web/WEB.md. */
export function formatWeekLabel(date: Date): string {
  return weekLabelFormat(date);
}

/** "Apr 2023", used for the footer's analysis-period range. */
export function formatMonthYear(date: Date): string {
  return monthYearFormat(date);
}
