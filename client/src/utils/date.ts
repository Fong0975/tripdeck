import { differenceInCalendarDays, parseISO } from 'date-fns';

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
