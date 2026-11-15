/**
 * Counts characters the way MySQL's utf8mb4 VARCHAR(n) does (by code
 * point), so an emoji counts as one character rather than two UTF-16 units.
 */
function charLength(value: string): number {
  return [...value].length;
}

/**
 * Finds the first string field that exceeds its maximum length. Validating
 * against `FIELD_LIMITS` up front turns an oversized value into a 400
 * instead of a MySQL "Data too long" 500.
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
