/** Minutes in a day; the exclusive upper bound of a valid time of day. */
export const MINUTES_PER_DAY = 24 * 60;

/**
 * Parses a stored `HH:mm` time into minutes since midnight. Stored values are
 * untrusted (the type does not enforce a format), so anything that is not a
 * valid 24-hour time yields null.
 *
 * @param value - The stored time string, possibly null or malformed.
 * @returns Minutes since midnight (0-1439), or null when missing or invalid.
 */
export function parseTimeMinutes(
  value: string | null | undefined,
): number | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Formats minutes since midnight as `HH:mm`.
 *
 * @param totalMinutes - Minutes since midnight (0-1440).
 */
export function formatTimeMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
