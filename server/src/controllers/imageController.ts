import type { Request, Response } from 'express';

import { createLogger } from '../logger';
import { saveImageToDisk } from '../middleware/upload';
import * as attractionRepo from '../repositories/attraction';
import * as connectionRepo from '../repositories/connectionRepository';
import * as imageRepo from '../repositories/imageRepository';
import * as tripRepo from '../repositories/trip';
import type { ImageResponse } from '../types/trip';

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
  ) => Promise<ImageResponse>;
  deleteImage: (imageId: number, parentId: number) => Promise<boolean>;
}

/**
 * Shared upload logic for attraction/connection/trip images: verifies the
 * parent, validates the file and title, saves the file to disk, then
 * inserts the DB row. Each entity's exported handler stays a distinct
 * named function (see below) purely so its Swagger doc comment stays
 * traceable — swagger-autogen resolves handlers by following the route's
 * import binding to a specific function, not through shared indirection.
 */
async function handleUpload(
  req: Request,
  res: Response,
  config: ImageHandlerConfig,
): Promise<void> {
  const tripId = Number(req.params.tripId);
  const parentId = config.getParentId(req);

  try {
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

    const title = (req.body.title as string | undefined)?.trim();
    if (!title) {
      logger.warn('Image upload rejected: no title provided', {
        entityType: config.entityType,
        tripId,
        parentId,
      });
      res.status(400).json({ error: 'title is required' });
      return;
    }

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

    const image = await config.addImage(parentId, filename, title);
    logger.info('Image uploaded', {
      entityType: config.entityType,
      tripId,
      parentId,
      imageId: image.id,
    });
    res.status(201).json(image);
  } catch (err) {
    logger.error(
      'Failed to upload image',
      { entityType: config.entityType, tripId, parentId },
      err,
    );
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

/** Shared delete logic — see handleUpload for why each entity keeps its own exported wrapper. */
async function handleDelete(
  req: Request,
  res: Response,
  config: ImageHandlerConfig,
): Promise<void> {
  const tripId = Number(req.params.tripId);
  const parentId = config.getParentId(req);
  const imageId = Number(req.params.imageId);

  try {
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
  } catch (err) {
    logger.error(
      'Failed to delete image',
      { entityType: config.entityType, tripId, parentId, imageId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete image' });
  }
}

const attractionConfig: ImageHandlerConfig = {
  entityType: 'attraction',
  notFoundError: 'Attraction not found',
  getParentId: req => Number(req.params.attractionId),
  verifyParent: (parentId, tripId) =>
    attractionRepo.verifyBelongsToTrip(parentId, tripId),
  addImage: imageRepo.addAttractionImage,
  deleteImage: imageRepo.deleteAttractionImage,
};

const connectionConfig: ImageHandlerConfig = {
  entityType: 'connection',
  notFoundError: 'Connection not found',
  getParentId: req => Number(req.params.connectionId),
  verifyParent: (parentId, tripId) =>
    connectionRepo.verifyBelongsToTrip(parentId, tripId),
  addImage: imageRepo.addConnectionImage,
  deleteImage: imageRepo.deleteConnectionImage,
};

const tripConfig: ImageHandlerConfig = {
  entityType: 'trip',
  notFoundError: 'Trip not found',
  // A trip image's "parent" is the trip itself, so parentId === tripId here.
  getParentId: req => Number(req.params.tripId),
  verifyParent: async parentId => (await tripRepo.findById(parentId)) !== null,
  addImage: imageRepo.addTripImage,
  deleteImage: imageRepo.deleteTripImage,
};

const dayConfig: ImageHandlerConfig = {
  entityType: 'day',
  notFoundError: 'Day not found',
  getParentId: req => Number(req.params.dayId),
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
     #swagger.consumes = ['multipart/form-data'] */
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
     #swagger.consumes = ['multipart/form-data'] */
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
     #swagger.consumes = ['multipart/form-data'] */
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
     #swagger.consumes = ['multipart/form-data'] */
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
