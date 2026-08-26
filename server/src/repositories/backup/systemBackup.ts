import * as tripRepo from '../trip';

import { buildBackupZip } from './backupExport';

/**
 * Builds a full system-wide backup zip: every trip (in the same
 * `trips/trip_<id>/{data.json,images/}` layout as `buildBackupZip`) plus a
 * `template.json` snapshot of the global packing checklist template, which
 * manual per-trip exports don't include unless requested. `manifest`
 * gets `includesTemplate` set so the import side knows to look for
 * `template.json`.
 */
export async function buildSystemBackupZip(): Promise<Buffer> {
  const allTrips = await tripRepo.findAll();
  return buildBackupZip(
    allTrips.map(trip => trip.id),
    { includeTemplate: true },
  );
}
