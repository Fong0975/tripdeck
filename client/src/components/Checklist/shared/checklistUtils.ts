import { getEffectiveLocations, NO_LOCATION } from '@tripdeck/shared';

let _tempId = -1;
export function nextTempId(): number {
  return _tempId--;
}

/** Lists the location names of a raw `storage_location`, without the empty location. */
function listLocationNames(
  value: string | null | undefined,
  order: readonly string[] = [],
): string[] {
  return getEffectiveLocations(value, order).filter(
    name => name !== NO_LOCATION,
  );
}

export function hasStorageOption(
  value: string | null | undefined,
  option: string,
): boolean {
  return listLocationNames(value).includes(option);
}

/**
 * Combines the storage locations of an item's specs. An item with specs
 * holds no location of its own; this is what it shows instead.
 *
 * @param specs The item's specs.
 * @param order Label names in display order; other names follow in the order
 *   the specs carry them.
 * @returns The names used by at least one spec, comma separated; null when
 *   none is set.
 */
export function summarizeSpecLocations(
  specs: ReadonlyArray<{ storage_location: string | null }>,
  order: readonly string[] = [],
): string | null {
  const used = specs.flatMap(spec => listLocationNames(spec.storage_location));
  const names = listLocationNames(used.join(','), order);
  return names.length > 0 ? names.join(',') : null;
}

/**
 * Adds a location name to, or removes it from, a raw `storage_location`.
 *
 * @param current The raw value before the change.
 * @param option The name to toggle.
 * @param order Label names in display order; the result lists names in this
 *   order, with other names following in their stored order.
 * @returns The new raw value, or null when no name is left.
 */
export function toggleStorageOption(
  current: string | null | undefined,
  option: string,
  order: readonly string[] = [],
): string | null {
  const names = listLocationNames(current);
  const next = names.includes(option)
    ? names.filter(name => name !== option)
    : [...names, option];
  return next.length > 0
    ? listLocationNames(next.join(','), order).join(',')
    : null;
}
