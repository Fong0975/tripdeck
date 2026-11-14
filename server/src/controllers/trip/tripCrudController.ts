import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/trip';
import type { CreateTripBody, UpdateTripBody } from '../../types/trip';
import { parseId } from '../../utils/parseId';
import {
  normalizeTripTitle,
  validateTripDates,
} from '../../validation/tripValidation';

const logger = createLogger('trip');

const INVALID_TRIP_ID_ERROR = 'tripId must be a positive integer';

/**
 * Parses `req.params.tripId`, answering 400 when it is not a valid id.
 *
 * @param req - Incoming request carrying the `:tripId` route param.
 * @param res - Response used to send the 400 on failure.
 * @param action - Short handler name used in the warning log.
 * @returns The parsed id, or null when a 400 response has already been sent.
 */
function parseTripIdParam(
  req: Request,
  res: Response,
  action: string,
): number | null {
  const tripId = parseId(req.params.tripId);
  if (tripId === null) {
    logger.warn(`${action} rejected: invalid tripId`, {
      tripId: req.params.tripId,
    });
    res.status(400).json({ error: INVALID_TRIP_ID_ERROR });
  }
  return tripId;
}

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
     }
     #swagger.responses[400] = { description: 'Invalid tripId' } */
  const tripId = parseTripIdParam(req, res, 'Get-trip');
  if (tripId === null) {
    return;
  }
  try {
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
     }
     #swagger.responses[400] = { description: 'Missing or empty title, invalid date format, endDate before startDate, or trip longer than 365 days' } */
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

    const title = normalizeTripTitle(body.title);
    if (!title) {
      logger.warn('Rejected create-trip request with an empty title');
      res.status(400).json({ error: 'title cannot be empty' });
      return;
    }

    const dateError = validateTripDates(body.startDate, body.endDate);
    if (dateError) {
      logger.warn('Rejected create-trip request with invalid dates', {
        startDate: body.startDate,
        endDate: body.endDate,
        reason: dateError,
      });
      res.status(400).json({ error: dateError });
      return;
    }

    const trip = await tripRepo.create({ ...body, title });
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
     }
     #swagger.responses[400] = { description: 'Invalid tripId, empty title, invalid date format, endDate before startDate, or trip longer than 365 days' } */
  const tripId = parseTripIdParam(req, res, 'Update-trip');
  if (tripId === null) {
    return;
  }
  try {
    const existing = await tripRepo.findById(tripId);
    if (!existing) {
      logger.warn('Update-trip rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const body = req.body as UpdateTripBody;
    if ('title' in body && !normalizeTripTitle(body.title)) {
      logger.warn('Rejected update-trip request with an empty title', {
        tripId,
      });
      res.status(400).json({ error: 'title cannot be empty' });
      return;
    }

    if (body.startDate !== undefined || body.endDate !== undefined) {
      const effectiveStart = body.startDate ?? existing.startDate;
      const effectiveEnd = body.endDate ?? existing.endDate;
      const dateError = validateTripDates(effectiveStart, effectiveEnd);
      if (dateError) {
        logger.warn('Update-trip rejected: invalid dates', {
          tripId,
          startDate: effectiveStart,
          endDate: effectiveEnd,
          reason: dateError,
        });
        res.status(400).json({ error: dateError });
        return;
      }
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
     #swagger.summary = 'Delete a trip'
     #swagger.responses[400] = { description: 'Invalid tripId' } */
  const tripId = parseTripIdParam(req, res, 'Delete-trip');
  if (tripId === null) {
    return;
  }
  try {
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
                           sortOrder: { type: 'integer', example: 0 },
                           latitude: { type: 'number', nullable: true, example: 34.9671 },
                           longitude: { type: 'number', nullable: true, example: 135.7727 },
                           geoSource: { type: 'string', nullable: true, enum: ['url', 'geocode', 'not_found'], example: 'url' }
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
     }
     #swagger.responses[400] = { description: 'Invalid tripId' } */
  const tripId = parseTripIdParam(req, res, 'Get-trip-content');
  if (tripId === null) {
    return;
  }
  try {
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
