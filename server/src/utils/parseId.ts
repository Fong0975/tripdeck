/**
 * Parses a route parameter or body value as a database id.
 *
 * @param value - Raw value (e.g. `req.params.tripId` or a JSON body field).
 * @returns The id when `value` is a positive safe integer (number or decimal
 *   digit string), otherwise null.
 */
export function parseId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
