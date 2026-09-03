/**
 * Today's calendar date in the business's timezone (Africa/Casablanca), regardless
 * of the browser's own timezone — matches ComplianceService::resolveStatus() on the
 * backend, which computes "today" the same way for the exact same reason.
 */
function todayInBusinessTz(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return new Date(get('year'), get('month') - 1, get('day'));
}

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
  const now = todayInBusinessTz();
  return Math.floor((target.getTime() - now.getTime()) / 86400000);
}
