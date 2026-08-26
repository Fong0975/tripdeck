import type {
  FailedTripResult,
  ImportBackupResult,
  ImportedTripResult,
} from '../../types/backup';

import { parseBackupZip } from './backupValidate';
import { restoreTemplate } from './templateRestore';
import { importSingleTrip } from './tripImport';

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
  const parsed = parseBackupZip(buffer);

  const imported: ImportedTripResult[] = [];
  const failed: FailedTripResult[] = [];

  for (const trip of parsed.trips) {
    try {
      imported.push(await importSingleTrip(trip.data, trip.imageBuffers));
    } catch (err) {
      failed.push({
        originalTripId: trip.originalTripId,
        title: trip.data.trip.title,
        error: err instanceof Error ? err.message : 'Unknown import error',
      });
    }
  }

  let templateRestored = false;
  if (options.restoreTemplate && parsed.template) {
    try {
      await restoreTemplate(parsed.template);
      templateRestored = true;
    } catch (err) {
      console.error('[backup] Failed to restore checklist template:', err);
    }
  }

  return { imported, failed, templateRestored };
}
