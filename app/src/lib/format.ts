export function formatMoney(amount: number, currency: string): string {
  const value = (isFinite(amount) ? amount : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${value}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Format an ISO date string (YYYY-MM-DD) as "May 31, 2026".
 * Parsed as local time to avoid the classic off-by-one-day UTC shift.
 * Returns the input unchanged if it isn't a valid ISO date (e.g. legacy
 * free-text values saved before date pickers existed).
 */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
