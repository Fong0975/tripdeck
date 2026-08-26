import fs from 'fs';
import path from 'path';

import AdmZip from 'adm-zip';

import { UPLOADS_DIR } from '../../middleware/upload';
import {
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
  type TripBackupData,
} from '../../types/backup';
import type { ImageResponse } from '../../types/trip';
import * as checklistRepo from '../checklist/trip';
import * as tripRepo from '../trip';

import { TripNotFoundError } from './errors';

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
 * Collects every image referenced anywhere in a trip's backup data
 * (trip-level, day-level, attraction-level, connection-level).
 */
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
 * Adds one `trips/trip_<id>/` folder (data.json + images/) per trip ID to
 * `zip`, de-duplicating IDs first. Returns the manifest entries describing
 * what was written, so callers (a per-trip export or a system-wide backup)
 * can build their own `manifest.json` around them. A missing image file on
 * disk is skipped (with a console warning) rather than failing the whole
 * export, since a DB image row should never outlive its file under normal
 * operation.
 */
export async function addTripsToZip(
  zip: AdmZip,
  tripIds: number[],
): Promise<BackupManifest['trips']> {
  const uniqueTripIds = Array.from(new Set(tripIds));
  const manifestTrips: BackupManifest['trips'] = [];

  for (const tripId of uniqueTripIds) {
    const data = await buildTripBackupData(tripId);
    const folder = `trip_${tripId}`;

    zip.addFile(
      `trips/${folder}/data.json`,
      Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
    );

    for (const image of collectImages(data)) {
      try {
        const buffer = fs.readFileSync(path.join(UPLOADS_DIR, image.filename));
        zip.addFile(`trips/${folder}/images/${image.filename}`, buffer);
      } catch {
        console.warn(
          `[backup] Missing image file on disk, skipped from export: ${image.filename} (trip ${tripId})`,
        );
      }
    }

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
 * (with a console warning) rather than failing the whole export, since a
 * DB image row should never outlive its file under normal operation.
 */
export async function buildBackupZip(tripIds: number[]): Promise<Buffer> {
  const zip = new AdmZip();
  const manifestTrips = await addTripsToZip(zip, tripIds);

  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tripCount: manifestTrips.length,
    trips: manifestTrips,
  };
  zip.addFile(
    'manifest.json',
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
  );

  return zip.toBuffer();
}
