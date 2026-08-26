import AdmZip from 'adm-zip';

import {
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
  type TripBackupData,
} from '../../types/backup';
import type { ChecklistTemplateResponse } from '../../types/checklist';
import type { ImageResponse } from '../../types/trip';

import { BackupValidationError } from './errors';

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
 * Per-entry uncompressed-size cap enforced before any zip entry is
 * decompressed. Without this, a maliciously crafted entry can declare a
 * tiny compressed payload that expands to gigabytes on decompression (a
 * "zip bomb"), exhausting server memory. `entry.header.size` is read
 * straight from the zip's central directory, so the check happens before
 * `getData()` ever runs the actual decompression.
 */
const MAX_ENTRY_UNCOMPRESSED_BYTES = 20 * 1024 * 1024; // 20 MB

function assertSafeEntrySize(entry: AdmZip.IZipEntry): void {
  if (entry.header.size > MAX_ENTRY_UNCOMPRESSED_BYTES) {
    throw new BackupValidationError(
      `Invalid backup file: "${entry.entryName}" is too large (${entry.header.size} bytes uncompressed)`,
    );
  }
}

function readJsonEntry<T>(zip: AdmZip, entryPath: string): T | null {
  const entry = zip.getEntry(entryPath);
  if (!entry) {
    return null;
  }
  assertSafeEntrySize(entry);
  try {
    return JSON.parse(entry.getData().toString('utf-8')) as T;
  } catch {
    return null;
  }
}

/** Collects every image referenced anywhere in a trip's backup data. */
function collectImages(data: TripBackupData): ImageResponse[] {
  const images: ImageResponse[] = [...data.trip.images];
  for (const day of data.content.days) {
    images.push(...day.images);
    for (const attraction of day.attractions) {
      images.push(...attraction.images);
    }
    for (const connection of day.connections) {
      images.push(...connection.images);
    }
  }
  return images;
}

/**
 * Parses and validates a backup zip produced by `buildBackupZip`.
 *
 * Validation order:
 *  1. The archive itself must be readable, and `manifest.json` must be
 *     present and parseable.
 *  2. `manifest.formatVersion` must match the version this server writes.
 *  3. Every trip listed in the manifest must have a readable
 *     `trips/<folder>/data.json`. Any of these being wrong indicates a
 *     corrupt or foreign file, so they fail fast on the first problem.
 *  4. If `manifest.includesTemplate` is true, the zip's root `template.json`
 *     must also be readable — same "fail fast" treatment as a trip's
 *     data.json, since a system-wide backup that claims to include a
 *     template but doesn't is just as corrupt.
 *  5. Every image referenced anywhere in every trip's data must exist as a
 *     zip entry. Missing images are collected across *all* trips first and
 *     reported together in a single error, so an incomplete backup is
 *     rejected as a whole rather than importing some trips with dangling
 *     image references.
 *
 * Every entry's declared uncompressed size is also checked against
 * `MAX_ENTRY_UNCOMPRESSED_BYTES` before it's decompressed, rejecting an
 * oversized ("zip bomb") entry up front instead of exhausting memory.
 *
 * On success, every referenced image's bytes are already read into
 * `imageBuffers` so the import step never has to re-open the archive.
 */
export function parseBackupZip(buffer: Buffer): ParsedBackup {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new BackupValidationError(
      'Invalid backup file: not a valid zip archive',
    );
  }

  const manifest = readJsonEntry<BackupManifest>(zip, 'manifest.json');
  if (!manifest) {
    throw new BackupValidationError(
      'Invalid backup file: manifest.json missing or unreadable',
    );
  }
  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError(
      `Unsupported backup format version: ${String(manifest.formatVersion)}`,
    );
  }
  if (!Array.isArray(manifest.trips)) {
    throw new BackupValidationError(
      'Invalid backup file: manifest.trips is missing or malformed',
    );
  }

  const parsedTrips: ParsedBackupTrip[] = [];
  for (const tripEntry of manifest.trips) {
    const data = readJsonEntry<TripBackupData>(
      zip,
      `trips/${tripEntry.folder}/data.json`,
    );
    if (!data) {
      throw new BackupValidationError(
        `Invalid backup file: trips/${tripEntry.folder}/data.json missing or unreadable`,
      );
    }
    parsedTrips.push({
      originalTripId: tripEntry.originalTripId,
      folder: tripEntry.folder,
      data,
      imageBuffers: new Map(),
    });
  }

  let template: ChecklistTemplateResponse | null = null;
  if (manifest.includesTemplate) {
    template = readJsonEntry<ChecklistTemplateResponse>(zip, 'template.json');
    if (!template) {
      throw new BackupValidationError(
        'Invalid backup file: template.json missing or unreadable',
      );
    }
  }

  const missingImagesByTrip: MissingImagesEntry[] = [];
  for (const trip of parsedTrips) {
    const missingFilenames: string[] = [];
    for (const image of collectImages(trip.data)) {
      const entry = zip.getEntry(
        `trips/${trip.folder}/images/${image.filename}`,
      );
      if (!entry) {
        missingFilenames.push(image.filename);
        continue;
      }
      assertSafeEntrySize(entry);
      trip.imageBuffers.set(image.filename, entry.getData());
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
    throw new BackupValidationError(
      `Backup file is incomplete: ${totalMissing} image file(s) missing`,
      { trips: missingImagesByTrip },
    );
  }

  return { manifest, trips: parsedTrips, template };
}
