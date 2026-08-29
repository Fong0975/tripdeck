import { createLogger } from '../../logger';
import type {
  FailedTripResult,
  ImportBackupResult,
  ImportedTripResult,
} from '../../types/backup';

import { parseBackupZip } from './backupValidate';
import { restoreTemplate } from './templateRestore';
import { importSingleTrip } from './tripImport';

const logger = createLogger('backup');

/**
 * Validates and imports every trip in a backup zip. Each trip is imported
 * independently: one trip failing does not stop the others, since every
 * imported trip is a self-contained new record.
 *
 * When `options.restoreTemplate` is true and the backup actually contains a
 * template snapshot (system-wide backups only), the global checklist
 * template is replaced after every trip has been processed. A failure while
 * restoring the template is logged but does not affect the trip results
 * already collected — it only leaves `templateRestored` false.
 */
export async function importBackupZip(
  buffer: Buffer,
  options: { restoreTemplate?: boolean } = {},
): Promise<ImportBackupResult> {
  logger.debug('Validating backup zip', { sizeBytes: buffer.length });
  const parsed = parseBackupZip(buffer);

  const imported: ImportedTripResult[] = [];
  const failed: FailedTripResult[] = [];

  logger.debug('Importing trips', { tripCount: parsed.trips.length });
  for (const trip of parsed.trips) {
    try {
      const result = await importSingleTrip(trip.data, trip.imageBuffers);
      imported.push(result);
      logger.info('Trip imported', {
        originalTripId: result.originalTripId,
        newTripId: result.newTripId,
        title: result.title,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown import error';
      failed.push({
        originalTripId: trip.originalTripId,
        title: trip.data.trip.title,
        error: message,
      });
      logger.warn('Failed to import trip', {
        originalTripId: trip.originalTripId,
        title: trip.data.trip.title,
        error: message,
      });
    }
  }

  let templateRestored = false;
  if (options.restoreTemplate && parsed.template) {
    logger.debug('Restoring checklist template');
    try {
      await restoreTemplate(parsed.template);
      templateRestored = true;
    } catch (err) {
      logger.error('Failed to restore checklist template', undefined, err);
    }
  }

  logger.info('Backup import completed', {
    importedCount: imported.length,
    failedCount: failed.length,
    templateRestored,
  });

  return { imported, failed, templateRestored };
}
