/** Maximum number of calendar days (inclusive) a single trip may span. */
export const MAX_TRIP_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a strict `YYYY-MM-DD` string into a UTC timestamp.
 *
 * @param value - Raw input value.
 * @returns Milliseconds since epoch at UTC midnight, or null when `value` is
 *   not a string in that exact format or does not name a real calendar date
 *   (e.g. `2026-02-30`).
 */
function parseDateOnly(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day);
  // Date.UTC silently rolls overflowing days/months into the next period, so
  // a round-trip comparison is what rejects impossible dates.
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return time;
}

/**
 * Validates a trip's date range.
 *
 * @param startDate - Raw start date; must be a real `YYYY-MM-DD` date.
 * @param endDate - Raw end date; must be a real `YYYY-MM-DD` date.
 * @returns An error message suitable for a 400 response, or null when the
 *   range is valid (end on/after start, at most MAX_TRIP_DAYS days long).
 */
export function validateTripDates(
  startDate: unknown,
  endDate: unknown,
): string | null {
  const start = parseDateOnly(startDate);
  if (start === null) {
    return 'startDate must be a valid date in YYYY-MM-DD format';
  }
  const end = parseDateOnly(endDate);
  if (end === null) {
    return 'endDate must be a valid date in YYYY-MM-DD format';
  }
  if (end < start) {
    return 'endDate cannot be before startDate';
  }
  if ((end - start) / MS_PER_DAY + 1 > MAX_TRIP_DAYS) {
    return `A trip cannot span more than ${MAX_TRIP_DAYS} days`;
  }
  return null;
}

/**
 * Normalises a raw trip title from a request body.
 *
 * @param title - Raw input value.
 * @returns The trimmed title, or an empty string when `title` is not a string.
 */
export function normalizeTripTitle(title: unknown): string {
  return typeof title === 'string' ? title.trim() : '';
}
