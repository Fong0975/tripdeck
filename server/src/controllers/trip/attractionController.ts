import type { Request, Response } from 'express';

import * as attractionRepo from '../../repositories/attraction';
import * as tripRepo from '../../repositories/trip';
import type {
  CreateAttractionBody,
  ReorderAttractionsBody,
  UpdateAttractionBody,
} from '../../types/trip';

export async function addAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Add an attraction to a day'
     #swagger.responses[201] = {
       description: 'Attraction created',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               name: { type: 'string', example: '伏見稻荷大社' },
               googleMapUrl: { type: 'string', nullable: true, example: null },
               notes: { type: 'string', nullable: true, example: '建議早上前往' },
               nearbyAttractions: { type: 'string', nullable: true, example: '伏見夢百衆' },
               startTime: { type: 'string', nullable: true, example: '09:00' },
               endTime: { type: 'string', nullable: true, example: '11:00' },
               referenceWebsites: { type: 'array', items: { type: 'string' }, example: ['https://inari.jp/'] },
               sortOrder: { type: 'integer', example: 0 }
             }
           }
         }
       }
     } */
  try {
    const tripId = Number(req.params.tripId);
    const dayId = Number(req.params.dayId);

    const body = req.body as CreateAttractionBody;
    if (!body.name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    res.status(201).json(await attractionRepo.create(dayId, body));
  } catch {
    res.status(500).json({ error: 'Failed to add attraction' });
  }
}

export async function updateAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Update an attraction'
     #swagger.responses[200] = {
       description: 'Attraction updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               name: { type: 'string', example: '伏見稻荷大社' },
               googleMapUrl: { type: 'string', nullable: true, example: null },
               notes: { type: 'string', nullable: true, example: '建議早上前往' },
               nearbyAttractions: { type: 'string', nullable: true, example: '伏見夢百衆' },
               startTime: { type: 'string', nullable: true, example: '09:00' },
               endTime: { type: 'string', nullable: true, example: '11:00' },
               referenceWebsites: { type: 'array', items: { type: 'string' }, example: ['https://inari.jp/'] },
               sortOrder: { type: 'integer', example: 0 }
             }
           }
         }
       }
     } */
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

    const updated = await attractionRepo.update(
      attractionId,
      req.body as UpdateAttractionBody,
    );
    if (!updated) {
      res.status(404).json({ error: 'Attraction not found' });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update attraction' });
  }
}

export async function deleteAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Delete an attraction' */
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

    await attractionRepo.deleteById(attractionId);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete attraction' });
  }
}

export async function duplicateAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Duplicate an attraction to the end of its day' */
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

    const dayId = await attractionRepo.getDayIdForAttraction(attractionId);
    const copy = await attractionRepo.duplicate(attractionId, dayId);
    res.status(201).json(copy);
  } catch {
    res.status(500).json({ error: 'Failed to duplicate attraction' });
  }
}

export async function reorderAttractions(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Reorder attractions within a day' */
  try {
    const tripId = Number(req.params.tripId);
    const dayId = Number(req.params.dayId);

    const body = req.body as ReorderAttractionsBody;
    if (!Array.isArray(body.orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required' });
      return;
    }

    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    await attractionRepo.updateOrder(dayId, body.orderedIds);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to reorder attractions' });
  }
}
