/**
 * Parses a stored duration string back into total minutes.
 * Only recognizes the plain numeric-minutes format produced by the hour/minute
 * input (e.g. "90"). Returns null for anything else, including legacy free-text
 * durations, so callers can fall back to displaying the raw string.
 */
export function parseDurationMinutes(duration?: string | null): number | null {
  if (!duration) {
    return null;
  }
  const trimmed = duration.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

/**
 * Formats a total-minutes value as a human-readable duration string,
 * e.g. 90 -> "1 小時 30 分鐘", 45 -> "45 分鐘", 120 -> "2 小時".
 */
export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours} 小時 ${minutes} 分鐘`;
  }
  if (hours > 0) {
    return `${hours} 小時`;
  }
  return `${minutes} 分鐘`;
}

/**
 * Resolves the display text for a stored duration value. Falls back to the raw
 * string for legacy free-text durations that predate the structured hour/minute input.
 */
export function formatDurationDisplay(duration?: string | null): string | null {
  if (!duration) {
    return null;
  }
  const minutes = parseDurationMinutes(duration);
  return minutes !== null ? formatDurationMinutes(minutes) : duration;
}
