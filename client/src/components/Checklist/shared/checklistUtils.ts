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
