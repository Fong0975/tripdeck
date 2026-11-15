import { readFile } from 'fs/promises';
import path from 'path';

import type { UploadedImage } from '@tripdeck/shared';
import AdmZip from 'adm-zip';

import { createLogger } from '../../logger';
import { UPLOADS_DIR } from '../../storage/imageFiles';
import {
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
  type TripBackupData,
} from '../../types/backup';
import { mapWithConcurrency } from '../../utils/mapWithConcurrency';
import * as templateRepo from '../checklist/template';
import * as checklistRepo from '../checklist/trip';
import * as tripRepo from '../trip';

import { collectTripImages, tripDataPath, tripImagePath } from './backupLayout';
import { TripNotFoundError } from './errors';

const logger = createLogger('backup');

/** Maximum image files read from disk at once while building a zip. */
const IMAGE_READ_CONCURRENCY = 8;

/**
 * Assembles the full backup payload for one trip: its own fields/images,
 * the full day/attraction/connection content tree, and its checklist
 * (null when the checklist was never initialized for this trip).
 */
export async function buildTripBackupData(
  tripId: number,
): Promise<TripBackupData> {
  const trip = await tripRepo.findById(tripId);
  if (!trip) {
    logger.warn('Cannot build backup data: trip not found', { tripId });
    throw new TripNotFoundError(tripId);
  }

  const [content, checklist] = await Promise.all([
    tripRepo.findContent(tripId),
    checklistRepo.findChecklist(tripId),
  ]);

  return {
    trip: {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      description: trip.description,
      images: trip.images,
    },
    content: content ?? { tripId, days: [] },
    checklist,
  };
}

/**
 * Reads a trip's image files from disk (asynchronously, at most
 * {@link IMAGE_READ_CONCURRENCY} at a time) and adds them to the trip's
 * `images/` folder in `zip`, in the order given. A file that cannot be read
 * is logged and skipped rather than failing the export.
 *
 * @param zip - The zip being built.
 * @param images - The trip's images, in export order.
 * @param tripId - The trip's ID, for logging.
 * @param folder - The trip's folder name inside the zip.
 * @returns The number of images skipped because their file was unreadable.
 */
async function addTripImagesToZip(
  zip: AdmZip,
  images: UploadedImage[],
  tripId: number,
  folder: string,
): Promise<number> {
  const buffers: Array<Buffer | undefined> = new Array(images.length);
  await mapWithConcurrency(
    images.map((image, index) => ({ image, index })),
    IMAGE_READ_CONCURRENCY,
    async ({ image, index }) => {
      try {
        buffers[index] = await readFile(path.join(UPLOADS_DIR, image.filename));
      } catch (err) {
        logger.warn('Missing image file on disk, skipped from export', {
          filename: image.filename,
          tripId,
          folder,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  let skippedImages = 0;
  images.forEach((image, index) => {
    const buffer = buffers[index];
    if (buffer === undefined) {
      skippedImages++;
      return;
    }
    zip.addFile(tripImagePath(folder, image.filename), buffer);
  });
  return skippedImages;
}

/**
 * Adds one `trips/trip_<id>/` folder (data.json + images/) per trip ID to
 * `zip`, de-duplicating IDs first. Returns the manifest entries describing
 * what was written, so callers (a per-trip export or a system-wide backup)
 * can build their own `manifest.json` around them. A missing image file on
 * disk is skipped (with a logged warning) rather than failing the whole
 * export, since a DB image row should never outlive its file under normal
 * operation.
 */
async function addTripsToZip(
  zip: AdmZip,
  tripIds: number[],
): Promise<BackupManifest['trips']> {
  const uniqueTripIds = Array.from(new Set(tripIds));
  const manifestTrips: BackupManifest['trips'] = [];

  for (const tripId of uniqueTripIds) {
    const data = await buildTripBackupData(tripId);
    const folder = `trip_${tripId}`;
    const images = collectTripImages(data);

    zip.addFile(
      tripDataPath(folder),
      Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
    );

    const skippedImages = await addTripImagesToZip(zip, images, tripId, folder);

    logger.debug('Added trip to export zip', {
      tripId,
      folder,
      imageCount: images.length,
      skippedImages,
    });

    manifestTrips.push({
      originalTripId: tripId,
      folder,
      title: data.trip.title,
    });
  }

  return manifestTrips;
}

/**
 * Builds a backup zip for the given trip IDs. Each trip gets its own
 * `trips/trip_<id>/` folder containing `data.json` and an `images/` folder
 * with the actual image files, alongside a top-level `manifest.json`.
 * Duplicate IDs are de-duplicated; a missing image file on disk is skipped
 * (with a logged warning) rather than failing the whole export, since a
 * DB image row should never outlive its file under normal operation.
 *
 * When `options.includeTemplate` is set, a `template.json` snapshot of the
 * global packing checklist template is also added to the zip's root and
 * `manifest.includesTemplate` is set, so the same file can later be
 * imported with "restore template" enabled.
 */
export async function buildBackupZip(
  tripIds: number[],
  options: { includeTemplate?: boolean } = {},
): Promise<Buffer> {
  const zip = new AdmZip();
  const manifestTrips = await addTripsToZip(zip, tripIds);

  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tripCount: manifestTrips.length,
    trips: manifestTrips,
  };

  if (options.includeTemplate) {
    const template = await templateRepo.findTemplate();
    zip.addFile(
      'template.json',
      Buffer.from(JSON.stringify(template, null, 2), 'utf-8'),
    );
    manifest.includesTemplate = true;
  }

  zip.addFile(
    'manifest.json',
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
  );

  const zipBuffer = zip.toBuffer();
  logger.info('Backup zip built', {
    tripCount: manifestTrips.length,
    includesTemplate: !!options.includeTemplate,
    sizeBytes: zipBuffer.length,
  });
  return zipBuffer;
}
