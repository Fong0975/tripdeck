const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Civil timezones span UTC-12 to UTC+14, so a client's local calendar date is
 * never more than one day away from the UTC date.
 */
const MAX_CLIENT_DAY_SKEW = 1;

/**
 * Parses a `YYYY-MM-DD` string as a real calendar date.
 *
 * @param dateStr - Candidate date string.
 * @returns Milliseconds at UTC midnight of that date, or null when the string
 *   is malformed or names a non-existent day (e.g. `2026-02-30`).
 */
export function parseIsoDateUtc(dateStr: string): number | null {
  const match = ISO_DATE_PATTERN.exec(dateStr);
  if (!match) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);
  const roundTrips =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return roundTrips ? ms : null;
}

/**
 * Checks that a client-reported "days from today" value is consistent with the
 * target date, allowing for the client being in any civil timezone.
 *
 * @param dateStr - Target date as `YYYY-MM-DD`.
 * @param days - Client-reported days between its local today and `dateStr`.
 * @param now - Server clock.
 * @returns True when `days` is within one day of the UTC-based difference.
 */
export function isPlausibleDaysFromToday(
  dateStr: string,
  days: number,
  now: Date,
): boolean {
  const target = parseIsoDateUtc(dateStr);
  if (target === null || !Number.isSafeInteger(days)) {
    return false;
  }
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const utcDays = Math.round((target - todayUtc) / MS_PER_DAY);
  return Math.abs(days - utcDays) <= MAX_CLIENT_DAY_SKEW;
}
