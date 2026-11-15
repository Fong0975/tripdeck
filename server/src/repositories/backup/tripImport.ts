import { createLogger } from '../../logger';
import type { ImportedTripResult, TripBackupData } from '../../types/backup';
import { withTransaction } from '../../utils/withTransaction';
import * as imageRepo from '../image';

import {
  type PendingImage,
  toPendingImages,
  writePendingImages,
} from './pendingImages';
import { importTripChecklist } from './tripChecklistImport';
import { importTripContent, insertTrip } from './tripContentImport';
import { generateUniqueTripTitle } from './tripImportHelpers';

export { generateUniqueTripTitle };

const logger = createLogger('backup');

/**
 * Imports one trip's backup data as a brand-new trip.
 *
 * All database rows are written inside one transaction, remapping every
 * old ID to the newly-inserted one as it goes (days, locations,
 * attractions/websites, connections, and the full checklist subtree); see
 * `importTripContent` for why connections are inserted in a second pass.
 *
 * Image files are copied to disk only after the transaction commits
 * (mirroring attractionDuplicate.ts). If that step fails partway through,
 * every file already written is deleted and the newly-created trip is
 * removed (its `ON DELETE CASCADE` chain takes every DB row with it), so a
 * failed import never leaves a partially-created trip behind.
 *
 * @param data - The trip's backup data.
 * @param imageBuffers - Image bytes from the backup, keyed by filename.
 * @returns The original and new trip IDs plus the title used.
 * @throws {TripImportDataError} When the backup data is internally
 *   inconsistent or an image is missing; re-throws database/disk errors.
 */
export async function importSingleTrip(
  data: TripBackupData,
  imageBuffers: Map<string, Buffer>,
): Promise<ImportedTripResult> {
  const title = await generateUniqueTripTitle(data.trip.title.trim());
  logger.debug('Starting trip import transaction', {
    originalTripId: data.trip.id,
    title,
  });

  let newTripId: number;
  let pendingImages: PendingImage[];
  try {
    ({ newTripId, pendingImages } = await withTransaction(async conn => {
      const tripId = await insertTrip(conn, data.trip, title);
      const images = [
        ...toPendingImages(data.trip.images, tripId, imageRepo.addTripImage),
        ...(await importTripContent(conn, data, tripId)),
      ];
      if (data.checklist) {
        await importTripChecklist(conn, data.trip.id, tripId, data.checklist);
      }
      return { newTripId: tripId, pendingImages: images };
    }));
  } catch (err) {
    logger.error(
      'Trip import transaction failed, rolled back',
      { originalTripId: data.trip.id, title },
      err,
    );
    throw err;
  }
  logger.debug('Trip import transaction committed', {
    originalTripId: data.trip.id,
    newTripId,
  });

  logger.debug('Writing imported trip images to disk', {
    originalTripId: data.trip.id,
    newTripId,
    imageCount: pendingImages.length,
  });
  await writePendingImages(newTripId, title, pendingImages, imageBuffers);

  logger.info('Trip imported successfully', {
    originalTripId: data.trip.id,
    newTripId,
    title,
    daysImported: data.content.days.length,
    imagesImported: pendingImages.length,
  });
  return { originalTripId: data.trip.id, newTripId, title };
}
