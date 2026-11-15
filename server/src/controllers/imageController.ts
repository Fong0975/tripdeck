import { FIELD_LIMITS, type UploadedImage } from '@tripdeck/shared';
import type { Request, Response } from 'express';

import { createLogger } from '../logger';
import * as attractionRepo from '../repositories/attraction';
import * as connectionRepo from '../repositories/connection';
import * as imageRepo from '../repositories/image';
import * as tripRepo from '../repositories/trip';
import { deleteImageFromDisk, saveImageToDisk } from '../storage/imageFiles';
import { findTooLongField } from '../validation/fieldLimits';

import { idParam } from './params';

const logger = createLogger('image');

interface ImageHandlerConfig {
  /** e.g. "attraction"/"connection"/"trip"/"day" — included in log context to distinguish which entity an upload/delete targets. */
  entityType: string;
  notFoundError: string;
  getParentId: (req: Request) => number;
  /** Confirms the parent (attraction/connection/trip) exists and, where applicable, belongs to the trip. */
  verifyParent: (parentId: number, tripId: number) => Promise<boolean>;
  addImage: (
    parentId: number,
    filename: string,
    title: string,
  ) => Promise<UploadedImage>;
  deleteImage: (imageId: number, parentId: number) => Promise<boolean>;
}

type TitleResult = { ok: true; title: string } | { ok: false; error: string };

/**
 * Validates the multipart `title` field of an image upload.
 *
 * @param raw - Raw `title` from the request body.
 * @returns The trimmed title, or the client-facing error when it is missing,
 *   blank, not a string, or longer than its VARCHAR column.
 */
function parseImageTitle(raw: unknown): TitleResult {
  if (raw === undefined) {
    return { ok: false, error: 'title is required' };
  }
  if (typeof raw !== 'string') {
    return { ok: false, error: 'title must be a string' };
  }
  const title = raw.trim();
  if (!title) {
    return { ok: false, error: 'title is required' };
  }
  const tooLong = findTooLongField([['title', title, FIELD_LIMITS.name]]);
  return tooLong ? { ok: false, error: tooLong } : { ok: true, title };
}

/**
 * Inserts the DB row for a file that has just been written to disk. If the
 * insert fails the file is deleted again so no orphan is left in uploads,
 * and the error is re-thrown for the Express error handler.
 *
 * @param config - Entity-specific image operations.
 * @param parentId - Owning attraction/connection/trip/day id.
 * @param filename - Name of the file already saved to disk.
 * @param title - Validated image title.
 * @returns The created image.
 */
async function addImageOrDiscardFile(
  config: ImageHandlerConfig,
  parentId: number,
  filename: string,
  title: string,
): Promise<UploadedImage> {
  try {
    return await config.addImage(parentId, filename, title);
  } catch (err) {
    deleteImageFromDisk(filename);
    throw err;
  }
}

/**
 * Shared upload logic for attraction/connection/trip images: verifies the
 * parent, validates the file and title, saves the file to disk, then
 * inserts the DB row (removing the file again if the insert fails). Each entity's exported handler stays a distinct
 * named function (see below) purely so its Swagger doc comment stays
 * traceable — swagger-autogen resolves handlers by following the route's
 * import binding to a specific function, not through shared indirection.
 */
async function handleUpload(
  req: Request,
  res: Response,
  config: ImageHandlerConfig,
): Promise<void> {
  const tripId = idParam(req, 'tripId');
  const parentId = config.getParentId(req);

  const belongs = await config.verifyParent(parentId, tripId);
  if (!belongs) {
    logger.warn('Image upload rejected: parent not found', {
      entityType: config.entityType,
      tripId,
      parentId,
    });
    res.status(404).json({ error: config.notFoundError });
    return;
  }

  if (!req.file) {
    logger.warn('Image upload rejected: no file provided', {
      entityType: config.entityType,
      tripId,
      parentId,
    });
    res.status(400).json({ error: 'image file is required' });
    return;
  }

  const parsedTitle = parseImageTitle(
    (req.body as { title?: unknown } | undefined)?.title,
  );
  if (!parsedTitle.ok) {
    logger.warn('Image upload rejected: invalid title', {
      entityType: config.entityType,
      tripId,
      parentId,
      reason: parsedTitle.error,
    });
    res.status(400).json({ error: parsedTitle.error });
    return;
  }
  const { title } = parsedTitle;

  let filename: string;
  try {
    filename = saveImageToDisk(req.file.buffer, req.file.mimetype);
  } catch (err) {
    logger.warn('Image upload rejected: invalid image file', {
      entityType: config.entityType,
      tripId,
      parentId,
      mimetype: req.file.mimetype,
      sizeBytes: req.file.buffer.length,
      reason: err instanceof Error ? err.message : String(err),
    });
    res.status(400).json({ error: 'Invalid image file' });
    return;
  }

  const image = await addImageOrDiscardFile(config, parentId, filename, title);
  logger.info('Image uploaded', {
    entityType: config.entityType,
    tripId,
    parentId,
    imageId: image.id,
  });
  res.status(201).json(image);
}

/** Shared delete logic — see handleUpload for why each entity keeps its own exported wrapper. */
async function handleDelete(
  req: Request,
  res: Response,
  config: ImageHandlerConfig,
): Promise<void> {
  const tripId = idParam(req, 'tripId');
  const parentId = config.getParentId(req);
  const imageId = idParam(req, 'imageId');

  const belongs = await config.verifyParent(parentId, tripId);
  if (!belongs) {
    logger.warn('Image delete rejected: parent not found', {
      entityType: config.entityType,
      tripId,
      parentId,
      imageId,
    });
    res.status(404).json({ error: config.notFoundError });
    return;
  }

  const deleted = await config.deleteImage(imageId, parentId);
  if (!deleted) {
    logger.warn('Image delete rejected: image not found', {
      entityType: config.entityType,
      tripId,
      parentId,
      imageId,
    });
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  logger.info('Image deleted', {
    entityType: config.entityType,
    tripId,
    parentId,
    imageId,
  });
  res.status(204).send();
}

const attractionConfig: ImageHandlerConfig = {
  entityType: 'attraction',
  notFoundError: 'Attraction not found',
  getParentId: req => idParam(req, 'attractionId'),
  verifyParent: (parentId, tripId) =>
    attractionRepo.verifyBelongsToTrip(parentId, tripId),
  addImage: imageRepo.addAttractionImage,
  deleteImage: imageRepo.deleteAttractionImage,
};

const connectionConfig: ImageHandlerConfig = {
  entityType: 'connection',
  notFoundError: 'Connection not found',
  getParentId: req => idParam(req, 'connectionId'),
  verifyParent: (parentId, tripId) =>
    connectionRepo.verifyBelongsToTrip(parentId, tripId),
  addImage: imageRepo.addConnectionImage,
  deleteImage: imageRepo.deleteConnectionImage,
};

const tripConfig: ImageHandlerConfig = {
  entityType: 'trip',
  notFoundError: 'Trip not found',
  // A trip image's "parent" is the trip itself, so parentId === tripId here.
  getParentId: req => idParam(req, 'tripId'),
  verifyParent: async parentId => (await tripRepo.findById(parentId)) !== null,
  addImage: imageRepo.addTripImage,
  deleteImage: imageRepo.deleteTripImage,
};

const dayConfig: ImageHandlerConfig = {
  entityType: 'day',
  notFoundError: 'Day not found',
  getParentId: req => idParam(req, 'dayId'),
  verifyParent: async (parentId, tripId) =>
    (await tripRepo.findDayByIdAndTripId(tripId, parentId)) !== null,
  addImage: imageRepo.addDayImage,
  deleteImage: imageRepo.deleteDayImage,
};

// --- Attraction images ---

export async function uploadAttractionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Upload an image for an attraction'
     #swagger.consumes = ['multipart/form-data']
     #swagger.responses[400] = { description: 'Missing or invalid image file, or missing, non-string, blank, or too long (over 255 characters) title' } */
  await handleUpload(req, res, attractionConfig);
}

export async function deleteAttractionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Delete an attraction image' */
  await handleDelete(req, res, attractionConfig);
}

// --- Connection images ---

export async function uploadConnectionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Upload an image for a connection'
     #swagger.consumes = ['multipart/form-data']
     #swagger.responses[400] = { description: 'Missing or invalid image file, or missing, non-string, blank, or too long (over 255 characters) title' } */
  await handleUpload(req, res, connectionConfig);
}

export async function deleteConnectionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Delete a connection image' */
  await handleDelete(req, res, connectionConfig);
}

// --- Trip images ---

export async function uploadTripImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Upload an image for a trip'
     #swagger.consumes = ['multipart/form-data']
     #swagger.responses[400] = { description: 'Missing or invalid image file, or missing, non-string, blank, or too long (over 255 characters) title' } */
  await handleUpload(req, res, tripConfig);
}

export async function deleteTripImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Delete a trip image' */
  await handleDelete(req, res, tripConfig);
}

// --- Day images ---

export async function uploadDayImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Upload an image for a day'
     #swagger.consumes = ['multipart/form-data']
     #swagger.responses[400] = { description: 'Missing or invalid image file, or missing, non-string, blank, or too long (over 255 characters) title' } */
  await handleUpload(req, res, dayConfig);
}

export async function deleteDayImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Delete a day image' */
  await handleDelete(req, res, dayConfig);
}
