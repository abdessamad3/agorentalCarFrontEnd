/**
 * Whole days between today and the given date (negative if the date is in the past).
 * Uses Math.floor consistently — was previously reimplemented independently across
 * 6 components, one of which used Math.ceil instead, causing a freshly-expired
 * document to display "0d" (still valid) instead of "Expired" for several hours.
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
