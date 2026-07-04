import type { Frequency } from "../types";

export const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every 2 weeks" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

/**
 * Advance an ISO date (YYYY-MM-DD) by one period of `freq`.
 * Month/quarter/year steps clamp to the last valid day of the target month
 * (e.g. Jan 31 + 1 month → Feb 28), avoiding JS Date's month-overflow.
 * Returns "" if the input isn't a valid ISO date.
 */
export function advanceDate(iso: string, freq: Frequency): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  let [, ys, ms, ds] = m;
  let year = Number(ys);
  let month = Number(ms) - 1; // 0-based
  const day = Number(ds);

  if (freq === "weekly" || freq === "biweekly") {
    const base = new Date(year, month, day);
    base.setDate(base.getDate() + (freq === "weekly" ? 7 : 14));
    return toIso(base);
  }

  const monthsToAdd =
    freq === "monthly" ? 1 : freq === "quarterly" ? 3 : 12; // yearly
  month += monthsToAdd;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;

  // Clamp day to the last day of the resulting month.
  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  return toIso(new Date(year, month, clampedDay));
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/**
 * Increment an invoice number, preserving any non-numeric prefix and the
 * zero-padded width of the trailing digits. Examples:
 *   "006"        → "007"
 *   "INV-009"    → "INV-010"
 *   "2024-099"   → "2024-100"
 *   "A"          → "A1"   (no trailing number to bump)
 */
export function incrementNumber(value: string): string {
  // Match the LAST run of digits in the string.
  const m = /^(.*?)(\d+)(\D*)$/.exec(value);
  if (!m) return value ? `${value}1` : "1";
  const [, prefix, digits, suffix] = m;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${prefix}${next}${suffix}`;
}
