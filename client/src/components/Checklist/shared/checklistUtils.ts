export type StorageOption = '託運' | '隨身';

let _tempId = -1;
export function nextTempId(): number {
  return _tempId--;
}

export const STORAGE_OPTIONS: StorageOption[] = ['託運', '隨身'];

export function hasStorageOption(
  value: string | null | undefined,
  option: StorageOption,
): boolean {
  if (!value) {
    return false;
  }
  return value
    .split(',')
    .map(s => s.trim())
    .includes(option);
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
