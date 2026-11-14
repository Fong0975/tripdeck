const LOCAL_MIDDAY_MINUTES = 12 * 60;

/** A forecast entry stamped with its UTC Unix time in seconds. */
export interface TimedEntry {
  dt: number;
}

/** A wall-clock moment at the destination. */
export interface LocalDateTime {
  /** Local calendar date as `YYYY-MM-DD`. */
  date: string;
  /** Minutes elapsed since local midnight. */
  minutesOfDay: number;
}

/** Entries that fall on one local date, plus the one closest to local noon. */
export interface LocalDaySelection<T extends TimedEntry> {
  dayEntries: T[];
  midday: T;
}

/**
 * Converts a UTC Unix timestamp into the destination's local date and time.
 *
 * @param dtSeconds - UTC Unix time in seconds.
 * @param tzOffsetSeconds - Destination offset from UTC in seconds (e.g. 32400 for UTC+9).
 * @returns The local calendar date and minutes since local midnight.
 */
export function toLocalDateTime(
  dtSeconds: number,
  tzOffsetSeconds: number,
): LocalDateTime {
  // Shifting the instant by the offset and reading UTC fields yields the
  // destination's wall clock without depending on the server's timezone.
  const shifted = new Date((dtSeconds + tzOffsetSeconds) * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * Picks the forecast entries that fall on `dateStr` in the destination's local
 * time and the entry closest to local midday (the first in list order wins a
 * tie).
 *
 * @param entries - Forecast entries in any order.
 * @param dateStr - Target local date as `YYYY-MM-DD`.
 * @param tzOffsetSeconds - Destination offset from UTC in seconds.
 * @returns The day's entries and midday entry, or null when none match.
 */
export function selectLocalDay<T extends TimedEntry>(
  entries: readonly T[],
  dateStr: string,
  tzOffsetSeconds: number,
): LocalDaySelection<T> | null {
  const dayEntries: T[] = [];
  let midday: T | undefined;
  let bestDistance = Infinity;

  for (const entry of entries) {
    const local = toLocalDateTime(entry.dt, tzOffsetSeconds);
    if (local.date !== dateStr) {
      continue;
    }
    dayEntries.push(entry);
    const distance = Math.abs(local.minutesOfDay - LOCAL_MIDDAY_MINUTES);
    if (distance < bestDistance) {
      bestDistance = distance;
      midday = entry;
    }
  }

  return midday ? { dayEntries, midday } : null;
}
