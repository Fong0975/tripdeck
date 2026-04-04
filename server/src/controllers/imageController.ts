import type { Request, Response } from 'express';

import { saveImageToDisk } from '../middleware/upload';
import * as attractionRepo from '../repositories/attractionRepository';
import * as connectionRepo from '../repositories/connectionRepository';
import * as imageRepo from '../repositories/imageRepository';

// --- Attraction images ---

export async function uploadAttractionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Upload an image for an attraction'
     #swagger.consumes = ['multipart/form-data'] */
  try {
    const tripId = Number(req.params.tripId);
    const attractionId = Number(req.params.attractionId);

    const belongs = await attractionRepo.verifyBelongsToTrip(
      attractionId,
      tripId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Attraction not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'image file is required' });
      return;
    }

    const title = (req.body.title as string | undefined)?.trim();
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    let filename: string;
    try {
      filename = saveImageToDisk(req.file.buffer, req.file.mimetype);
    } catch {
      res.status(400).json({ error: 'Invalid image file' });
      return;
    }

    const image = await imageRepo.addAttractionImage(
      attractionId,
      filename,
      title,
    );
    res.status(201).json(image);
  } catch {
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

export async function deleteAttractionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Delete an attraction image' */
  try {
    const tripId = Number(req.params.tripId);
    const attractionId = Number(req.params.attractionId);
    const imageId = Number(req.params.imageId);

    const belongs = await attractionRepo.verifyBelongsToTrip(
      attractionId,
      tripId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Attraction not found' });
      return;
    }

    const deleted = await imageRepo.deleteAttractionImage(
      imageId,
      attractionId,
    );
    if (!deleted) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete image' });
  }
}

// --- Connection images ---

export async function uploadConnectionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Upload an image for a connection'
     #swagger.consumes = ['multipart/form-data'] */
  try {
    const tripId = Number(req.params.tripId);
    const connectionId = Number(req.params.connectionId);

    const belongs = await connectionRepo.verifyBelongsToTrip(
      connectionId,
      tripId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'image file is required' });
      return;
    }

    const title = (req.body.title as string | undefined)?.trim();
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    let filename: string;
    try {
      filename = saveImageToDisk(req.file.buffer, req.file.mimetype);
    } catch {
      res.status(400).json({ error: 'Invalid image file' });
      return;
    }

    const image = await imageRepo.addConnectionImage(
      connectionId,
      filename,
      title,
    );
    res.status(201).json(image);
  } catch {
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

export async function deleteConnectionImage(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Images']
     #swagger.summary = 'Delete a connection image' */
  try {
    const tripId = Number(req.params.tripId);
    const connectionId = Number(req.params.connectionId);
    const imageId = Number(req.params.imageId);

    const belongs = await connectionRepo.verifyBelongsToTrip(
      connectionId,
      tripId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const deleted = await imageRepo.deleteConnectionImage(
      imageId,
      connectionId,
    );
    if (!deleted) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete image' });
  }
}
