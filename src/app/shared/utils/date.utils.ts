/**
 * Whole days between today and the given date (negative if the date is in the past).
 * Uses Math.floor consistently — was previously reimplemented independently across
 * 6 components, one of which used Math.ceil instead, causing a freshly-expired
 * document to display "0d" (still valid) instead of "Expired" for several hours.
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / 86400000);
}
