import {
  IMAGE_MIME_TYPES,
  MAX_BACKUP_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
} from '@tripdeck/shared';

const BYTES_PER_MB = 1024 * 1024;

/** The `accept` attribute value for image file pickers. */
export const ACCEPTED_IMAGE_TYPES = IMAGE_MIME_TYPES.join(',');

/** Turns a MIME type into a short format name, e.g. "image/jpeg" into "JPEG". */
const formatName = (type: string): string =>
  type.replace('image/', '').toUpperCase();

/** Human-readable list of the accepted image formats, e.g. "JPEG、PNG". */
const IMAGE_FORMAT_NAMES = IMAGE_MIME_TYPES.map(formatName).join('、');

/** Formats a byte count as whole megabytes, e.g. "10 MB". */
function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / BYTES_PER_MB)} MB`;
}

/**
 * Checks a picked image against the server's upload rules before it is sent,
 * so an oversized or unsupported file fails fast with a clear message.
 *
 * @param file - The file the user picked.
 * @returns A user-facing error message, or null when the file is acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `僅支援 ${IMAGE_FORMAT_NAMES} 格式的圖片`;
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return `圖片大小不可超過 ${formatMegabytes(MAX_IMAGE_UPLOAD_BYTES)}`;
  }
  return null;
}

/**
 * Checks a picked backup zip against the server's upload size limit.
 *
 * @param file - The file the user picked.
 * @returns A user-facing error message, or null when the file is acceptable.
 */
export function validateBackupFile(file: File): string | null {
  if (file.size > MAX_BACKUP_UPLOAD_BYTES) {
    return `備份檔大小不可超過 ${formatMegabytes(MAX_BACKUP_UPLOAD_BYTES)}`;
  }
  return null;
}
