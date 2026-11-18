import { FIELD_LIMITS } from '@tripdeck/shared';

/**
 * Validates a location label name typed by the user, mirroring the server.
 *
 * @param name - Raw input value.
 * @param existingNames - Names of the labels that already exist.
 * @returns A user-facing error, or null when the name can be added.
 */
export function validateLocationLabelName(
  name: string,
  existingNames: readonly string[],
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') {
    return '請輸入位置名稱';
  }
  if (/[,|]/.test(trimmed)) {
    return '位置名稱不可包含「,」或「|」';
  }
  if ([...trimmed].length > FIELD_LIMITS.locationLabel) {
    return `位置名稱最多 ${FIELD_LIMITS.locationLabel} 個字`;
  }
  if (existingNames.includes(trimmed)) {
    return '已有同名的位置標籤';
  }
  return null;
}
