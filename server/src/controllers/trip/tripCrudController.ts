import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/trip';
import type { CreateTripBody, UpdateTripBody } from '../../types/trip';

const logger = createLogger('trip');

export async function getTrips(_req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'List all trips'
     #swagger.responses[200] = {
       description: 'Array of trips',
       content: {
         'application/json': {
           schema: {
             type: 'array',
             items: {
               type: 'object',
               properties: {
                 id: { type: 'integer', example: 1 },
                 title: { type: 'string', example: '關西之旅' },
                 destination: { type: 'string', nullable: true, example: '大阪、京都、神戶' },
                 startDate: { type: 'string', format: 'date', example: '2024-05-10' },
                 endDate: { type: 'string', format: 'date', example: '2024-05-12' },
                 description: { type: 'string', nullable: true, example: null },
                 createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
               }
             }
           }
         }
       }
     } */
  try {
    res.json(await tripRepo.findAll());
  } catch (err) {
    logger.error('Failed to fetch trips', undefined, err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}

export async function getTrip(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Get a trip by ID'
     #swagger.responses[200] = {
       description: 'Trip found',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               title: { type: 'string', example: '關西之旅' },
               destination: { type: 'string', nullable: true, example: '大阪、京都、神戶' },
               startDate: { type: 'string', format: 'date', example: '2024-05-10' },
               endDate: { type: 'string', format: 'date', example: '2024-05-12' },
               description: { type: 'string', nullable: true, example: null },
               createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
             }
           }
         }
       }
     } */
  try {
    const tripId = Number(req.params.tripId);
    const trip = await tripRepo.findById(tripId);
    if (!trip) {
      logger.warn('Get-trip rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(trip);
  } catch (err) {
    logger.error('Failed to fetch trip', { tripId: req.params.tripId }, err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
}

export async function createTrip(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Create a new trip'
     #swagger.responses[201] = {
       description: 'Trip created',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               title: { type: 'string', example: '關西之旅' },
               destination: { type: 'string', nullable: true, example: '大阪、京都、神戶' },
               startDate: { type: 'string', format: 'date', example: '2024-05-10' },
               endDate: { type: 'string', format: 'date', example: '2024-05-12' },
               description: { type: 'string', nullable: true, example: null },
               createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
             }
           }
         }
       }
     } */
  try {
    const body = req.body as CreateTripBody;
    if (!body.title || !body.startDate || !body.endDate) {
      logger.warn('Rejected create-trip request with missing fields', {
        hasTitle: !!body.title,
        hasStart: !!body.startDate,
        hasEnd: !!body.endDate,
      });
      res
        .status(400)
        .json({ error: 'title, startDate, and endDate are required' });
      return;
    }
    const trip = await tripRepo.create(body);
    logger.info('Trip created', { tripId: trip.id, title: trip.title });
    res.status(201).json(trip);
  } catch (err) {
    logger.error('Failed to create trip', { title: req.body?.title }, err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
}

export async function updateTrip(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Update a trip'
     #swagger.responses[200] = {
       description: 'Trip updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               title: { type: 'string', example: '關西之旅' },
               destination: { type: 'string', nullable: true, example: '大阪、京都、神戶' },
               startDate: { type: 'string', format: 'date', example: '2024-05-10' },
               endDate: { type: 'string', format: 'date', example: '2024-05-12' },
               description: { type: 'string', nullable: true, example: null },
               createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
             }
           }
         }
       }
     } */
  try {
    const tripId = Number(req.params.tripId);
    const existing = await tripRepo.findById(tripId);
    if (!existing) {
      logger.warn('Update-trip rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const body = req.body as UpdateTripBody;
    if ('title' in body && !body.title?.trim()) {
      logger.warn('Rejected update-trip request with an empty title', {
        tripId,
      });
      res.status(400).json({ error: 'title cannot be empty' });
      return;
    }

    const effectiveStart = body.startDate ?? existing.startDate;
    const effectiveEnd = body.endDate ?? existing.endDate;
    if (effectiveEnd < effectiveStart) {
      logger.warn('Update-trip rejected: endDate before startDate', {
        tripId,
        startDate: effectiveStart,
        endDate: effectiveEnd,
      });
      res.status(400).json({ error: 'endDate cannot be before startDate' });
      return;
    }

    const updated = await tripRepo.update(tripId, body);
    if (!updated) {
      logger.warn('Update-trip rejected: trip not found on update', {
        tripId,
      });
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    logger.error('Failed to update trip', { tripId: req.params.tripId }, err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
}

export async function deleteTrip(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Delete a trip' */
  try {
    const tripId = Number(req.params.tripId);
    const deleted = await tripRepo.deleteById(tripId);
    if (!deleted) {
      logger.warn('Delete-trip rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    logger.info('Trip deleted', { tripId });
    res.status(204).send();
  } catch (err) {
    logger.error('Failed to delete trip', { tripId: req.params.tripId }, err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
}

export async function getTripContent(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Get full trip content (days, attractions, connections)'
     #swagger.responses[200] = {
       description: 'Full trip content',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               tripId: { type: 'integer', example: 1 },
               days: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     day: { type: 'integer', example: 1 },
                     date: { type: 'string', format: 'date', example: '2024-05-10' },
                     attractions: {
                       type: 'array',
                       items: {
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
                     },
                     connections: {
                       type: 'array',
                       items: {
                         type: 'object',
                         properties: {
                           id: { type: 'integer', example: 1 },
                           fromAttractionId: { type: 'integer', example: 1 },
                           toAttractionId: { type: 'integer', example: 2 },
                           transportMode: { type: 'string', nullable: true, example: 'transit' },
                           duration: { type: 'string', nullable: true, example: '約 40 分鐘' },
                           route: { type: 'string', nullable: true, example: 'JR 稻荷站 → 京都站' },
                           notes: { type: 'string', nullable: true, example: null }
                         }
                       }
                     }
                   }
                 }
               }
             }
           }
         }
       }
     } */
  try {
    const tripId = Number(req.params.tripId);
    const content = await tripRepo.findContent(tripId);
    if (!content) {
      logger.warn('Get-trip-content rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(content);
  } catch (err) {
    logger.error(
      'Failed to fetch trip content',
      { tripId: req.params.tripId },
      err,
    );
    res.status(500).json({ error: 'Failed to fetch trip content' });
  }
}
