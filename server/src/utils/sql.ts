/**
 * Builds a comma-separated list of `?` placeholders for a SQL `IN (...)`
 * clause or a multi-value insert row.
 *
 * @param count - Number of placeholders to generate.
 * @returns e.g. `'?, ?, ?'` for 3; an empty string for 0.
 */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
