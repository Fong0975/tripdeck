import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/**
 * Shifts a calendar date string (`yyyy-MM-dd`) by `days` and returns it in the
 * same format. Works purely in local calendar days, so the result never drifts
 * by one around DST changes or in timezones behind UTC.
 *
 * @param dateStr - The starting date, e.g. "2026-08-20".
 * @param days - Number of days to add (negative to subtract).
 * @returns The shifted date, e.g. "2026-08-23" for `days = 3`.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd');
}

/**
 * Returns the number of calendar days between today (local midnight) and the
 * given ISO date string (e.g. "2026-08-20"). Positive for future dates,
 * negative for past dates, 0 for today.
 */
export function daysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(`${dateStr}T00:00:00`).getTime() - today.getTime()) / 86_400_000,
  );
}

/**
 * Returns true if the given ISO date string (e.g. "2026-08-20") is strictly
 * before today (local midnight).
 */
export function isPastDate(dateStr: string): boolean {
  return daysFromToday(dateStr) < 0;
}

/**
 * Returns the total number of days spanned by a trip, inclusive of both the
 * start and end dates (e.g. a trip starting and ending on the same day is 1).
 */
export function getTripTotalDays(trip: {
  startDate: string;
  endDate: string;
}): number {
  return (
    differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate)) +
    1
  );
}
