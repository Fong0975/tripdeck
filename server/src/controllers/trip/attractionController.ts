import type {
  CreateAttractionBody,
  MoveAttractionBody,
  ReorderAttractionsBody,
  UpdateAttractionBody,
} from '@tripdeck/shared';
import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as attractionRepo from '../../repositories/attraction';
import * as tripRepo from '../../repositories/trip';
import { parseId } from '../../utils/parseId';
import { idParam } from '../params';

import {
  findAttractionBodyError,
  isIntegerAtLeast,
  ORDERED_IDS_MISMATCH_ERROR,
  resolveOrderedIds,
} from './attractionValidation';

const logger = createLogger('attraction');

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
     }
     #swagger.responses[400] = { description: 'Missing name, malformed referenceWebsites, or a field exceeding its maximum length' } */
  const tripId = idParam(req, 'tripId');
  const dayId = idParam(req, 'dayId');

  const body = (req.body ?? {}) as CreateAttractionBody;
  if (!body.name) {
    logger.warn('Rejected add-attraction request with no name', {
      tripId,
      dayId,
    });
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const bodyError = findAttractionBodyError({ ...body });
  if (bodyError) {
    logger.warn('Rejected add-attraction request: invalid body', {
      tripId,
      dayId,
      error: bodyError,
    });
    res.status(400).json({ error: bodyError });
    return;
  }

  const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
  if (!day) {
    logger.warn('Add-attraction rejected: day not found', {
      tripId,
      dayId,
    });
    res.status(404).json({ error: 'Day not found' });
    return;
  }

  const attraction = await attractionRepo.create(dayId, body);
  logger.info('Attraction created', {
    tripId,
    dayId,
    attractionId: attraction.id,
  });
  res.status(201).json(attraction);
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
     }
     #swagger.responses[400] = { description: 'Malformed referenceWebsites, or a field exceeding its maximum length' } */
  const tripId = idParam(req, 'tripId');
  const attractionId = idParam(req, 'attractionId');

  const body = (req.body ?? {}) as UpdateAttractionBody;
  const bodyError = findAttractionBodyError({ ...body });
  if (bodyError) {
    logger.warn('Rejected update-attraction request: invalid body', {
      tripId,
      attractionId,
      error: bodyError,
    });
    res.status(400).json({ error: bodyError });
    return;
  }

  const belongs = await attractionRepo.verifyBelongsToTrip(
    attractionId,
    tripId,
  );
  if (!belongs) {
    logger.warn('Update-attraction rejected: attraction not found', {
      tripId,
      attractionId,
    });
    res.status(404).json({ error: 'Attraction not found' });
    return;
  }

  const updated = await attractionRepo.update(attractionId, body);
  if (!updated) {
    logger.warn('Update-attraction rejected: attraction not found on update', {
      tripId,
      attractionId,
    });
    res.status(404).json({ error: 'Attraction not found' });
    return;
  }
  res.json(updated);
}

export async function deleteAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Delete an attraction' */
  const tripId = idParam(req, 'tripId');
  const attractionId = idParam(req, 'attractionId');

  const belongs = await attractionRepo.verifyBelongsToTrip(
    attractionId,
    tripId,
  );
  if (!belongs) {
    logger.warn('Delete-attraction rejected: attraction not found', {
      tripId,
      attractionId,
    });
    res.status(404).json({ error: 'Attraction not found' });
    return;
  }

  await attractionRepo.deleteById(attractionId);
  logger.info('Attraction deleted', { tripId, attractionId });
  res.status(204).send();
}

export async function duplicateAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Duplicate an attraction to the end of its day' */
  const tripId = idParam(req, 'tripId');
  const attractionId = idParam(req, 'attractionId');

  const belongs = await attractionRepo.verifyBelongsToTrip(
    attractionId,
    tripId,
  );
  if (!belongs) {
    logger.warn('Duplicate-attraction rejected: attraction not found', {
      tripId,
      attractionId,
    });
    res.status(404).json({ error: 'Attraction not found' });
    return;
  }

  const dayId = await attractionRepo.getDayIdForAttraction(attractionId);
  const copy = await attractionRepo.duplicate(attractionId, dayId);
  logger.info('Attraction duplicated', {
    tripId,
    dayId,
    sourceAttractionId: attractionId,
    newAttractionId: copy.id,
  });
  res.status(201).json(copy);
}

export async function reorderAttractions(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Reorder attractions within a day'
     #swagger.description = 'orderedIds must list every attraction of the day exactly once.'
     #swagger.responses[204] = { description: 'Attractions reordered' }
     #swagger.responses[400] = { description: 'orderedIds is not an array of positive integers, or does not list every attraction of the day exactly once' }
     #swagger.responses[404] = { description: 'Day not found' } */
  const tripId = idParam(req, 'tripId');
  const dayId = idParam(req, 'dayId');

  const body = (req.body ?? {}) as Partial<ReorderAttractionsBody>;
  const resolution = resolveOrderedIds(body.orderedIds);
  if (!resolution.ok) {
    logger.warn('Rejected reorder-attractions request: invalid orderedIds', {
      tripId,
      dayId,
      error: resolution.error,
    });
    res.status(400).json({ error: resolution.error });
    return;
  }
  const { orderedIds } = resolution;

  const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
  if (!day) {
    logger.warn('Reorder-attractions rejected: day not found', {
      tripId,
      dayId,
    });
    res.status(404).json({ error: 'Day not found' });
    return;
  }

  const result = await attractionRepo.updateOrder(dayId, orderedIds);
  if (result === 'invalid_order') {
    logger.warn('Reorder-attractions rejected: ids do not match the day', {
      tripId,
      dayId,
      count: orderedIds.length,
    });
    res.status(400).json({ error: ORDERED_IDS_MISMATCH_ERROR });
    return;
  }
  logger.info('Attractions reordered', {
    tripId,
    dayId,
    count: orderedIds.length,
  });
  res.status(204).send();
}

export async function moveAttraction(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Attractions']
     #swagger.summary = 'Move an attraction to a position in another (or the same) day'
     #swagger.description = 'Keeps the attraction id, so images, websites, times and geo stay attached. Connections whose endpoints are no longer adjacent in the source or target day are deleted. A same-day target behaves as a reorder. index is 0-based and clamped to the end of the day.'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['dayId', 'index'],
             properties: {
               dayId: { type: 'integer', example: 2 },
               index: { type: 'integer', minimum: 0, example: 0 }
             }
           }
         }
       }
     }
     #swagger.responses[204] = { description: 'Attraction moved' }
     #swagger.responses[400] = { description: 'Invalid tripId, attractionId, dayId or index' }
     #swagger.responses[404] = { description: 'Attraction or day not found' } */
  const tripId = idParam(req, 'tripId');
  const attractionId = idParam(req, 'attractionId');
  const body = req.body as MoveAttractionBody;
  const dayId = parseId(body.dayId);
  if (dayId === null || !isIntegerAtLeast(body.index, 0)) {
    logger.warn('Rejected move-attraction request: invalid input', {
      tripId,
      attractionId,
      dayId: body.dayId,
      index: body.index,
    });
    res.status(400).json({
      error:
        'dayId must be a positive integer and index a non-negative integer',
    });
    return;
  }

  const result = await attractionRepo.moveToDay(
    tripId,
    attractionId,
    dayId,
    body.index,
  );
  if (result === 'attraction_not_found') {
    logger.warn('Move-attraction rejected: attraction not found', {
      tripId,
      attractionId,
    });
    res.status(404).json({ error: 'Attraction not found' });
    return;
  }
  if (result === 'day_not_found') {
    logger.warn('Move-attraction rejected: day not found', {
      tripId,
      dayId,
    });
    res.status(404).json({ error: 'Day not found' });
    return;
  }

  logger.info('Attraction moved', {
    tripId,
    attractionId,
    dayId,
    index: body.index,
  });
  res.status(204).send();
}
