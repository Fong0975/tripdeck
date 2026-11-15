import type { UploadedImage } from '@tripdeck/shared';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import {
  deleteImageFromDisk,
  saveImportedImageBuffer,
} from '../../storage/imageFiles';

import { TripImportDataError } from './errors';

const logger = createLogger('backup');

/** Inserts an image row for `parentId` (one of the image repositories). */
export type AddImageFn = (
  parentId: number,
  filename: string,
  title: string,
) => Promise<UploadedImage>;

/**
 * An image from the backup whose file still has to be written to disk and
 * linked to its newly-inserted parent row once the import transaction has
 * committed.
 */
export interface PendingImage {
  newParentId: number;
  filename: string;
  title: string;
  add: AddImageFn;
}

/**
 * Builds the pending-image entries for one parent's images.
 *
 * @param images - The parent's images from the backup.
 * @param newParentId - The parent's newly-inserted ID.
 * @param add - Image repository function that links an image to the parent.
 * @returns One pending image per backup image, in the same order.
 */
export function toPendingImages(
  images: UploadedImage[],
  newParentId: number,
  add: AddImageFn,
): PendingImage[] {
  return images.map(image => ({
    newParentId,
    filename: image.filename,
    title: image.title,
    add,
  }));
}

/**
 * Removes a trip whose DB rows were committed but whose images could not all
 * be written: deletes every image file already written, then the trip row
 * (its `ON DELETE CASCADE` chain takes every other row with it). A failure
 * of the trip delete is logged and swallowed so the caller can rethrow the
 * original import error instead of masking it.
 *
 * @param newTripId - The ID of the newly-created trip to remove.
 * @param title - The trip's title, for logging.
 * @param writtenFilenames - Image files already written to disk.
 */
async function discardImportedTrip(
  newTripId: number,
  title: string,
  writtenFilenames: string[],
): Promise<void> {
  for (const filename of writtenFilenames) {
    deleteImageFromDisk(filename);
  }
  try {
    await pool.execute('DELETE FROM trips WHERE id = ?', [newTripId]);
  } catch (cleanupErr) {
    logger.error(
      'Failed to delete partially imported trip during rollback',
      { newTripId, title },
      cleanupErr,
    );
  }
}

/**
 * Writes every pending image to disk under a fresh filename and links it to
 * its new parent row. If any image fails, every file already written is
 * deleted and the newly-created trip is removed, so a failed import never
 * leaves a partially-created trip behind.
 *
 * @param newTripId - The newly-created trip owning the images.
 * @param title - The trip's title, for logging.
 * @param pendingImages - Images to write, in order.
 * @param imageBuffers - Image bytes from the backup, keyed by filename.
 * @throws {TripImportDataError} When an image's bytes are missing from the
 *   backup; re-throws any write/insert error. The trip is discarded first.
 */
export async function writePendingImages(
  newTripId: number,
  title: string,
  pendingImages: PendingImage[],
  imageBuffers: Map<string, Buffer>,
): Promise<void> {
  const writtenFilenames: string[] = [];
  try {
    for (const pending of pendingImages) {
      const buffer = imageBuffers.get(pending.filename);
      if (!buffer) {
        throw new TripImportDataError(
          `Missing image data for ${pending.filename}`,
        );
      }
      const newFilename = saveImportedImageBuffer(buffer, pending.filename);
      writtenFilenames.push(newFilename);
      await pending.add(pending.newParentId, newFilename, pending.title);
    }
  } catch (err) {
    logger.error(
      'Failed to write imported trip images; rolling back the new trip',
      {
        newTripId,
        title,
        filesWrittenBeforeFailure: writtenFilenames.length,
        totalImages: pendingImages.length,
      },
      err,
    );
    await discardImportedTrip(newTripId, title, writtenFilenames);
    throw err;
  }
}
