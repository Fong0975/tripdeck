/**
 * Maximum character lengths of the VARCHAR columns that store user input
 * (see `server/src/db/schema/*`). Validating against these up front turns an
 * oversized value into a 400 instead of a MySQL "Data too long" 500.
 */
export const FIELD_LIMITS = {
  /** trips.title / destination, attraction & location & checklist names, image and website titles. */
  name: 255,
  /** checklist `storage_location`. */
  storageLocation: 255,
  /** trip_attractions.start_time / end_time. */
  time: 10,
  /** trip_connections.duration. */
  duration: 100,
} as const;

/**
 * Counts characters the way MySQL's utf8mb4 VARCHAR(n) does (by code
 * point), so an emoji counts as one character rather than two UTF-16 units.
 */
function charLength(value: string): number {
  return [...value].length;
}

/**
 * Finds the first string field that exceeds its maximum length.
 *
 * @param fields - Pairs of `[fieldName, value, maxLength]`. Non-string values
 *   (undefined, null, numbers) are skipped; type checks happen elsewhere.
 * @returns A client-facing error such as `title must be at most 255
 *   characters`, or null when every field fits.
 */
export function findTooLongField(
  fields: [name: string, value: unknown, max: number][],
): string | null {
  for (const [name, value, max] of fields) {
    if (typeof value === 'string' && charLength(value) > max) {
      return `${name} must be at most ${max} characters`;
    }
  }
  return null;
}
