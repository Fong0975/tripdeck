const TIME_ZONE = 'America/Los_Angeles';
const MINUTE_MS = 60_000;
// A Pacific day is at most 25 hours long (the fall DST change).
const MAX_SEARCH_MINUTES = 26 * 60;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Calendar date in US Pacific time, the clock Google Maps Platform quotas
 * reset on.
 *
 * @param now - Instant to convert.
 * @returns The date as `YYYY-MM-DD`.
 */
export function getPacificDay(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/**
 * First instant at which the Pacific calendar date differs from `now`'s,
 * i.e. when the daily quota counters reset. Found by bisecting over whole
 * minutes, which is exact because day changes always fall on a minute.
 *
 * @param now - Instant to start from.
 * @returns The next Pacific midnight.
 */
export function getNextPacificReset(now: Date = new Date()): Date {
  const today = getPacificDay(now);
  const startMs = Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS;

  let sameDayMinutes = 0;
  let nextDayMinutes = MAX_SEARCH_MINUTES;
  while (nextDayMinutes - sameDayMinutes > 1) {
    const mid = Math.floor((sameDayMinutes + nextDayMinutes) / 2);
    if (getPacificDay(new Date(startMs + mid * MINUTE_MS)) === today) {
      sameDayMinutes = mid;
    } else {
      nextDayMinutes = mid;
    }
  }
  return new Date(startMs + nextDayMinutes * MINUTE_MS);
}
