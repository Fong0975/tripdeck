import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/trip';
import type { CreateLocationBody, UpdateLocationBody } from '../../types/trip';
import { idParam } from '../params';

const logger = createLogger('day-location');

/** Trip and location ids of a `/:tripId/locations/:locationId` route. */
interface LocationIds {
  tripId: number;
  locationId: number;
}

/**
 * Reads the `tripId` and `locationId` route params.
 *
 * @param req - Express request carrying the route params.
 * @returns The trip and location ids.
 */
function locationParams(req: Request): LocationIds {
  return {
    tripId: idParam(req, 'tripId'),
    locationId: idParam(req, 'locationId'),
  };
}

/**
 * Responds with 404 unless the location belongs to one of the trip's days.
 *
 * @param res - Express response used for the 404 reply.
 * @param ids - Trip and location ids from the route params.
 * @param action - Human-readable request name used in the log message.
 * @returns True when the location belongs to the trip; false when a 404
 *   response has already been sent.
 */
async function ensureLocationInTrip(
  res: Response,
  ids: LocationIds,
  action: string,
): Promise<boolean> {
  const belongs = await tripRepo.verifyLocationBelongsToTrip(
    ids.locationId,
    ids.tripId,
  );
  if (!belongs) {
    // Spread into a plain object literal: an interface type has no index
    // signature, so it is not assignable to the logger's `LogMeta` record.
    logger.warn(`${action} rejected: location not found in trip`, { ...ids });
    res.status(404).json({ error: 'Location not found' });
  }
  return belongs;
}

export async function addDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  const tripId = idParam(req, 'tripId');
  const dayId = idParam(req, 'dayId');
  const body = req.body as CreateLocationBody;

  if (!body.name?.trim()) {
    logger.warn('Rejected add-location request with no name', {
      tripId,
      dayId,
    });
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
  if (!day) {
    logger.warn('Add-location rejected: day not found', { tripId, dayId });
    res.status(404).json({ error: 'Day not found' });
    return;
  }

  const location = await tripRepo.addLocation(dayId, body);
  logger.info('Day location added', {
    tripId,
    dayId,
    locationId: location.id,
  });
  res.status(201).json(location);
}

export async function updateDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  const ids = locationParams(req);
  const { tripId, locationId } = ids;
  const body = req.body as UpdateLocationBody;

  if (!body.name?.trim()) {
    logger.warn('Rejected update-location request with no name', {
      tripId,
      locationId,
    });
    res.status(400).json({ error: 'name is required' });
    return;
  }

  if (!(await ensureLocationInTrip(res, ids, 'Update-location'))) {
    return;
  }

  const updated = await tripRepo.updateLocation(locationId, body);
  if (!updated) {
    logger.warn('Update-location rejected: location not found', {
      tripId,
      locationId,
    });
    res.status(404).json({ error: 'Location not found' });
    return;
  }
  res.json({ id: locationId, name: body.name.trim() });
}

export async function deleteDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  const ids = locationParams(req);
  const { tripId, locationId } = ids;

  if (!(await ensureLocationInTrip(res, ids, 'Delete-location'))) {
    return;
  }

  const deleted = await tripRepo.deleteLocation(locationId);
  if (!deleted) {
    logger.warn('Delete-location rejected: location not found', {
      tripId,
      locationId,
    });
    res.status(404).json({ error: 'Location not found' });
    return;
  }
  logger.info('Day location deleted', { tripId, locationId });
  res.status(204).send();
}
