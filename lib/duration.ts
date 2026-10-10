/** Timer helpers for the console, pure so scripts/check-results.ts asserts them. */

/**
 * Whole minutes from `now` until the next time the clock reads `hhmm` (local
 * time). Rounded up, so a session never ends before the time shown. A time
 * already past today means tomorrow. Null if `hhmm` is not a valid 24h time.
 */
export function minutesUntil(hhmm: string, now: Date): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  const target = new Date(now);
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.ceil((target.getTime() - now.getTime()) / 60_000);
}

/** 45 → "45 min", 90 → "1 h 30 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
