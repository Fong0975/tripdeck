import AdmZip from 'adm-zip';

import { BACKUP_FORMAT_VERSION, type BackupManifest } from '../../types/backup';
import * as templateRepo from '../checklist/template';
import * as tripRepo from '../trip';

import { addTripsToZip } from './backupExport';

/**
 * Builds a full system-wide backup zip: every trip (in the same
 * `trips/trip_<id>/{data.json,images/}` layout as `buildBackupZip`) plus a
 * `template.json` snapshot of the global packing checklist template, which
 * manual per-trip exports never include. `manifest.includesTemplate` is set
 * so the import side knows to look for `template.json`.
 */
export async function buildSystemBackupZip(): Promise<Buffer> {
  const allTrips = await tripRepo.findAll();
  const tripIds = allTrips.map(trip => trip.id);

  const zip = new AdmZip();
  const manifestTrips = await addTripsToZip(zip, tripIds);

  const template = await templateRepo.findTemplate();
  zip.addFile(
    'template.json',
    Buffer.from(JSON.stringify(template, null, 2), 'utf-8'),
  );

  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tripCount: manifestTrips.length,
    trips: manifestTrips,
    includesTemplate: true,
  };
  zip.addFile(
    'manifest.json',
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
  );

  return zip.toBuffer();
}
