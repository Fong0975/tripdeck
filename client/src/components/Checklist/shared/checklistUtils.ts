import {
  STORAGE_OPTIONS,
  getEffectiveLocations,
  type StorageOption,
} from '@tripdeck/shared';

export { STORAGE_OPTIONS, type StorageOption };

let _tempId = -1;
export function nextTempId(): number {
  return _tempId--;
}

export function hasStorageOption(
  value: string | null | undefined,
  option: StorageOption,
): boolean {
  return getEffectiveLocations(value).includes(option);
}

/**
 * Combines the storage locations of an item's specs. An item with specs
 * holds no location of its own; this is what it shows instead.
 *
 * @param specs The item's specs.
 * @returns The storage options used by at least one spec, in
 *   {@link STORAGE_OPTIONS} order and comma separated; null when none is set.
 */
export function summarizeSpecLocations(
  specs: ReadonlyArray<{ storage_location: string | null }>,
): string | null {
  const used = STORAGE_OPTIONS.filter(option =>
    specs.some(spec => hasStorageOption(spec.storage_location, option)),
  );
  return used.length > 0 ? used.join(',') : null;
}

export function toggleStorageOption(
  current: string | null | undefined,
  option: StorageOption,
): string | null {
  const parts = current
    ? current
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  if (parts.includes(option)) {
    const next = parts.filter(p => p !== option);
    return next.length > 0 ? next.join(',') : null;
  }
  parts.push(option);
  return parts.join(',');
}
