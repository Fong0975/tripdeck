import type AdmZip from 'adm-zip';

import { createLogger } from '../../logger';
import {
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
  type TripBackupData,
} from '../../types/backup';
import type { ChecklistTemplateResponse } from '../../types/checklist';

import { collectTripImages, tripDataPath, tripImagePath } from './backupLayout';
import {
  assertChecklistTemplate,
  assertTripBackupData,
  isJsonObject,
  isManifestTripList,
} from './backupSchema';
import { openBackupZip, readEntryData, readJsonEntry } from './backupZipReader';
import { BackupValidationError } from './errors';

const logger = createLogger('backup');

/** One trip parsed out of a backup zip, ready to be imported. */
export interface ParsedBackupTrip {
  originalTripId: number;
  folder: string;
  data: TripBackupData;
  /** Every image file referenced by this trip's data, keyed by filename. */
  imageBuffers: Map<string, Buffer>;
}

export interface ParsedBackup {
  manifest: BackupManifest;
  trips: ParsedBackupTrip[];
  /**
   * The zip's `template.json`, parsed. Null unless
   * `manifest.includesTemplate` is true (i.e. this is a system-wide backup).
   */
  template: ChecklistTemplateResponse | null;
}

interface MissingImagesEntry {
  folder: string;
  title: string;
  missingFilenames: string[];
}

/**
 * Reads `manifest.json` and checks its format version and trip list.
 *
 * @throws {BackupValidationError} When the manifest is missing, unreadable,
 *   from another format version, or has a malformed trip list.
 */
function readManifest(zip: AdmZip): BackupManifest {
  const manifestJson = readJsonEntry(zip, 'manifest.json');
  if (!isJsonObject(manifestJson)) {
    logger.warn('Rejected backup upload: manifest.json missing or unreadable');
    throw new BackupValidationError(
      'Invalid backup file: manifest.json missing or unreadable',
    );
  }
  // The manifest's fields are checked one by one below so that a backup
  // from another format version is reported as such before any shape issue.
  const manifest = manifestJson as unknown as BackupManifest;
  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    logger.warn('Rejected backup upload: unsupported format version', {
      receivedVersion: manifest.formatVersion,
      expectedVersion: BACKUP_FORMAT_VERSION,
    });
    throw new BackupValidationError(
      `Unsupported backup format version: ${String(manifest.formatVersion)}`,
    );
  }
  if (!isManifestTripList(manifest.trips)) {
    logger.warn('Rejected backup upload: manifest.trips missing or malformed');
    throw new BackupValidationError(
      'Invalid backup file: manifest.trips is missing or malformed',
    );
  }
  return manifest;
}

/**
 * Reads and validates every listed trip's `data.json` (image buffers are
 * filled in later by `attachTripImages`).
 *
 * @throws {BackupValidationError} On the first missing or malformed trip.
 */
function readTrips(zip: AdmZip, manifest: BackupManifest): ParsedBackupTrip[] {
  const parsedTrips: ParsedBackupTrip[] = [];
  for (const tripEntry of manifest.trips) {
    const dataPath = tripDataPath(tripEntry.folder);
    const data = readJsonEntry(zip, dataPath);
    if (data === undefined) {
      logger.warn('Rejected backup upload: trip data.json unreadable', {
        folder: tripEntry.folder,
      });
      throw new BackupValidationError(
        `Invalid backup file: ${dataPath} missing or unreadable`,
      );
    }
    assertTripBackupData(data, dataPath);
    parsedTrips.push({
      originalTripId: tripEntry.originalTripId,
      folder: tripEntry.folder,
      data,
      imageBuffers: new Map(),
    });
  }
  return parsedTrips;
}

/**
 * Reads and validates the root `template.json` when the manifest says the
 * backup includes one.
 *
 * @returns The template, or null when the backup does not include one.
 * @throws {BackupValidationError} When the template is claimed but missing
 *   or malformed.
 */
function readTemplate(
  zip: AdmZip,
  manifest: BackupManifest,
): ChecklistTemplateResponse | null {
  if (!manifest.includesTemplate) {
    return null;
  }
  const templateJson = readJsonEntry(zip, 'template.json');
  if (templateJson === undefined) {
    logger.warn('Rejected backup upload: template.json missing or unreadable');
    throw new BackupValidationError(
      'Invalid backup file: template.json missing or unreadable',
    );
  }
  assertChecklistTemplate(templateJson, 'template.json');
  return templateJson;
}

/**
 * Reads every image referenced by each trip into its `imageBuffers`.
 *
 * @throws {BackupValidationError} Listing every missing image across all
 *   trips, when any is missing.
 */
function attachTripImages(zip: AdmZip, parsedTrips: ParsedBackupTrip[]): void {
  const missingImagesByTrip: MissingImagesEntry[] = [];
  for (const trip of parsedTrips) {
    const missingFilenames: string[] = [];
    for (const image of collectTripImages(trip.data)) {
      const data = readEntryData(
        zip,
        tripImagePath(trip.folder, image.filename),
      );
      if (!data) {
        missingFilenames.push(image.filename);
        continue;
      }
      trip.imageBuffers.set(image.filename, data);
    }
    if (missingFilenames.length > 0) {
      missingImagesByTrip.push({
        folder: trip.folder,
        title: trip.data.trip.title,
        missingFilenames,
      });
    }
  }

  if (missingImagesByTrip.length > 0) {
    const totalMissing = missingImagesByTrip.reduce(
      (sum, t) => sum + t.missingFilenames.length,
      0,
    );
    logger.warn('Rejected backup upload: incomplete, missing image files', {
      totalMissing,
      trips: missingImagesByTrip,
    });
    throw new BackupValidationError(
      `Backup file is incomplete: ${totalMissing} image file(s) missing`,
      { trips: missingImagesByTrip },
    );
  }
}

/**
 * Parses and validates a backup zip produced by `buildBackupZip`.
 *
 * Validation order:
 *  1. The archive itself must be readable, its declared uncompressed sizes
 *     must stay within the per-entry and total caps (see `zipSizeGuard`),
 *     and `manifest.json` must be present and parseable.
 *  2. `manifest.formatVersion` must match the version this server writes.
 *  3. Every trip listed in the manifest must have a readable
 *     `trips/<folder>/data.json` whose structure matches `TripBackupData`
 *     (see `backupSchema`). Any of these being wrong indicates a corrupt or
 *     foreign file, so they fail fast on the first problem.
 *  4. If `manifest.includesTemplate` is true, the zip's root `template.json`
 *     must also be readable and well-formed — same "fail fast" treatment
 *     as a trip's data.json, since a system-wide backup that claims to
 *     include a template but doesn't is just as corrupt.
 *  5. Every image referenced anywhere in every trip's data must exist as a
 *     zip entry. Missing images are collected across *all* trips first and
 *     reported together in a single error, so an incomplete backup is
 *     rejected as a whole rather than importing some trips with dangling
 *     image references.
 *
 * On success, every referenced image's bytes are already read into
 * `imageBuffers` so the import step never has to re-open the archive.
 */
export function parseBackupZip(buffer: Buffer): ParsedBackup {
  const zip = openBackupZip(buffer);
  const manifest = readManifest(zip);
  const trips = readTrips(zip, manifest);
  const template = readTemplate(zip, manifest);
  attachTripImages(zip, trips);
  return { manifest, trips, template };
}
