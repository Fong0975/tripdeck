import type { Request, Response } from 'express';

import { createLogger } from '../logger';
import { getMapsConfig, isMapsEnabled } from '../maps/config';
import { getNextPacificReset } from '../maps/pacificTime';
import { resolveTripGeo } from '../maps/tripGeoResolver';
import { getUsage, markExhausted, tryConsume } from '../maps/usageTracker';
import * as tripRepo from '../repositories/trip';

const logger = createLogger('maps');

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export const getMapsStatus = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  /* #swagger.tags = ['Maps']
     #swagger.summary = 'Whether the map feature is configured and still within today\'s quota'
     #swagger.responses[200] = {
       description: 'Map feature availability',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               enabled: { type: 'boolean', example: true },
               exhausted: { type: 'boolean', description: 'Map loads are used up for today', example: false },
               geocodeExhausted: { type: 'boolean', description: 'Name lookups are used up for today', example: false },
               resetAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the daily counters reset (US Pacific midnight)' }
             }
           }
         }
       }
     } */
  if (!isMapsEnabled()) {
    res.json({
      enabled: false,
      exhausted: false,
      geocodeExhausted: false,
      resetAt: null,
    });
    return;
  }

  try {
    const [load, geocode] = await Promise.all([
      getUsage('load'),
      getUsage('geocode'),
    ]);
    res.json({
      enabled: true,
      exhausted: load.exhausted,
      geocodeExhausted: geocode.exhausted,
      resetAt: getNextPacificReset().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to read maps status', undefined, err);
    res.status(500).json({ error: 'Failed to read maps status' });
  }
};

export const getMapsConfigForBrowser = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  /* #swagger.tags = ['Maps']
     #swagger.summary = 'Browser API key for the Maps JavaScript API; counts as one map load'
     #swagger.responses[200] = {
       description: 'Key to load the map with',
       content: {
         'application/json': {
           schema: { type: 'object', properties: { apiKey: { type: 'string' } } }
         }
       }
     }
     #swagger.responses[404] = { description: 'Map feature is not configured' }
     #swagger.responses[429] = { description: 'Today\'s map load quota is used up' } */
  if (!isMapsEnabled()) {
    res.status(404).json({ error: 'Maps feature is not configured' });
    return;
  }

  try {
    if (!(await tryConsume('load'))) {
      res.status(429).json({
        error: 'Daily map quota reached',
        resetAt: getNextPacificReset().toISOString(),
      });
      return;
    }
    res.json({ apiKey: getMapsConfig().browserKey });
  } catch (err) {
    logger.error('Failed to issue the maps config', undefined, err);
    res.status(500).json({ error: 'Failed to load maps config' });
  }
};

export const resolveGeo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  /* #swagger.tags = ['Maps']
     #swagger.summary = 'Resolve attraction coordinates for a trip, geocoding only the given day\'s gaps'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['tripId', 'dayId'],
             properties: { tripId: { type: 'integer' }, dayId: { type: 'integer' } }
           }
         }
       }
     }
     #swagger.responses[200] = {
       description: 'Location of every attraction in the trip',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               geocodeExhausted: { type: 'boolean' },
               attractions: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer' },
                     latitude: { type: 'number', nullable: true },
                     longitude: { type: 'number', nullable: true },
                     geoSource: { type: 'string', nullable: true, enum: ['url', 'geocode', 'not_found'] }
                   }
                 }
               }
             }
           }
         }
       }
     }
     #swagger.responses[400] = { description: 'Invalid tripId or dayId' }
     #swagger.responses[404] = { description: 'Map feature not configured, or day not found' } */
  const { tripId, dayId } = (req.body ?? {}) as {
    tripId?: unknown;
    dayId?: unknown;
  };
  if (!isPositiveInteger(tripId) || !isPositiveInteger(dayId)) {
    logger.warn('Rejected geo resolve request with invalid ids', {
      tripId,
      dayId,
    });
    res
      .status(400)
      .json({ error: 'tripId and dayId must be positive integers' });
    return;
  }
  if (!isMapsEnabled()) {
    res.status(404).json({ error: 'Maps feature is not configured' });
    return;
  }

  try {
    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      logger.warn('Geo resolve rejected: day not found', { tripId, dayId });
      res.status(404).json({ error: 'Day not found' });
      return;
    }
    res.json(await resolveTripGeo(tripId, dayId));
  } catch (err) {
    logger.error(
      'Failed to resolve attraction locations',
      { tripId, dayId },
      err,
    );
    res.status(500).json({ error: 'Failed to resolve attraction locations' });
  }
};

export const reportMapsError = async (
  req: Request,
  res: Response,
): Promise<void> => {
  /* #swagger.tags = ['Maps']
     #swagger.summary = 'Frontend report that Google rejected the map key or quota; disables map loads until the daily reset'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['reason'],
             properties: { reason: { type: 'string', enum: ['auth_failure'] } }
           }
         }
       }
     }
     #swagger.responses[204] = { description: 'Recorded' }
     #swagger.responses[400] = { description: 'Unknown reason' } */
  const { reason } = (req.body ?? {}) as { reason?: unknown };
  if (reason !== 'auth_failure') {
    logger.warn('Rejected maps error report with an unknown reason', {
      reason,
    });
    res.status(400).json({ error: 'Unknown reason' });
    return;
  }

  try {
    await markExhausted('load');
    logger.warn(
      'Browser reported a Google Maps authentication or quota failure; map loads are disabled until the daily reset',
    );
    res.status(204).send();
  } catch (err) {
    logger.error('Failed to record the maps error report', undefined, err);
    res.status(500).json({ error: 'Failed to record maps error' });
  }
};
