import AdmZip from 'adm-zip';

import { createLogger } from '../../logger';

import { BackupValidationError } from './errors';
import { assertSafeZipSizes } from './zipSizeGuard';

const logger = createLogger('backup');

/**
 * Opens an uploaded backup archive and checks its declared uncompressed
 * sizes against the caps in `zipSizeGuard` before anything is extracted.
 *
 * @param buffer - The raw uploaded file.
 * @returns The opened archive.
 * @throws {BackupValidationError} When the buffer is not a readable zip or
 *   its entries exceed the size caps.
 */
export function openBackupZip(buffer: Buffer): AdmZip {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    logger.warn('Rejected backup upload: not a valid zip archive', {
      bufferSize: buffer.length,
      reason: err instanceof Error ? err.message : String(err),
    });
    throw new BackupValidationError(
      'Invalid backup file: not a valid zip archive',
    );
  }
  assertSafeZipSizes(zip);
  return zip;
}

/**
 * Reads one zip entry's raw bytes.
 *
 * @param zip - The opened archive.
 * @param entryPath - Path of the entry inside the archive.
 * @returns The entry's bytes, or `undefined` when the entry does not exist.
 */
export function readEntryData(
  zip: AdmZip,
  entryPath: string,
): Buffer | undefined {
  return zip.getEntry(entryPath)?.getData();
}

/**
 * Reads and JSON-parses one zip entry. Returns `undefined` (a value JSON can
 * never produce) when the entry is missing or is not valid JSON; the parsed
 * value is otherwise returned unvalidated.
 *
 * @param zip - The opened archive.
 * @param entryPath - Path of the entry inside the archive.
 * @returns The parsed value, or `undefined`.
 */
export function readJsonEntry(zip: AdmZip, entryPath: string): unknown {
  const entry = zip.getEntry(entryPath);
  if (!entry) {
    return undefined;
  }
  // Decompression errors are read inside the try so that a corrupt entry is
  // reported as "unreadable" just like malformed JSON.
  try {
    return JSON.parse(entry.getData().toString('utf-8')) as unknown;
  } catch (err) {
    logger.warn('Failed to parse JSON entry in backup zip', {
      entryPath,
      reason: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}
