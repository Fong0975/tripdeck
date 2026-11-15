import type AdmZip from 'adm-zip';

import { createLogger } from '../../logger';

import { BackupValidationError } from './errors';

const logger = createLogger('backup');

/**
 * Per-entry uncompressed-size cap. Without this, a maliciously crafted entry
 * can declare a tiny compressed payload that expands to gigabytes on
 * decompression (a "zip bomb"), exhausting server memory.
 */
export const MAX_ENTRY_UNCOMPRESSED_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Cap on the sum of every entry's uncompressed size, so an archive of many
 * individually-acceptable entries cannot add up to an unbounded amount of
 * decompressed data.
 */
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Rejects an archive whose declared uncompressed sizes exceed either the
 * per-entry or the total cap. `entry.header.size` is read straight from the
 * zip's central directory, so this runs before `getData()` ever performs any
 * actual decompression and must be called before any entry is extracted.
 *
 * @param zip - An opened (but not yet extracted) archive.
 * @throws BackupValidationError when any cap is exceeded.
 */
export function assertSafeZipSizes(zip: AdmZip): void {
  let totalBytes = 0;
  for (const entry of zip.getEntries()) {
    const size = entry.header.size;
    if (size > MAX_ENTRY_UNCOMPRESSED_BYTES) {
      logger.warn('Rejected oversized zip entry (possible zip bomb)', {
        entryName: entry.entryName,
        declaredSize: size,
      });
      throw new BackupValidationError(
        `Invalid backup file: "${entry.entryName}" is too large (${size} bytes uncompressed)`,
      );
    }
    totalBytes += size;
  }

  if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    logger.warn('Rejected oversized zip archive (possible zip bomb)', {
      declaredTotalSize: totalBytes,
      limit: MAX_TOTAL_UNCOMPRESSED_BYTES,
    });
    throw new BackupValidationError(
      `Invalid backup file: total uncompressed size (${totalBytes} bytes) exceeds the ${MAX_TOTAL_UNCOMPRESSED_BYTES} byte limit`,
    );
  }
}
