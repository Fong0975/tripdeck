import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/trip';
import type { CreateLocationBody, UpdateLocationBody } from '../../types/trip';
import { parseId } from '../../utils/parseId';

const logger = createLogger('day-location');

/**
 * Parses the `tripId` and `locationId` route params, responding with 400 when
 * either is not a positive integer.
 *
 * @param req - Express request carrying the route params.
 * @param res - Express response used for the 400 reply.
 * @param action - Human-readable request name used in the log message.
 * @returns The parsed ids, or null when a 400 response has already been sent.
 */
function parseLocationParams(
  req: Request,
  res: Response,
  action: string,
): { tripId: number; locationId: number } | null {
  const tripId = parseId(req.params.tripId);
  const locationId = parseId(req.params.locationId);
  if (tripId === null || locationId === null) {
    logger.warn(`${action} rejected: invalid ids`, {
      tripId: req.params.tripId,
      locationId: req.params.locationId,
    });
    res.status(400).json({ error: 'Invalid tripId or locationId' });
    return null;
  }
  return { tripId, locationId };
}

/**
 * Responds with 404 unless the location belongs to one of the trip's days.
 *
 * @param res - Express response used for the 404 reply.
 * @param ids - Parsed trip and location ids.
 * @param action - Human-readable request name used in the log message.
 * @returns True when the location belongs to the trip; false when a 404
 *   response has already been sent.
 */
async function ensureLocationInTrip(
  res: Response,
  ids: { tripId: number; locationId: number },
  action: string,
): Promise<boolean> {
  const belongs = await tripRepo.verifyLocationBelongsToTrip(
    ids.locationId,
    ids.tripId,
  );
  if (!belongs) {
    logger.warn(`${action} rejected: location not found in trip`, ids);
    res.status(404).json({ error: 'Location not found' });
  }
  return belongs;
}

export async function addDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = parseId(req.params.tripId);
    const dayId = parseId(req.params.dayId);
    if (tripId === null || dayId === null) {
      logger.warn('Add-location rejected: invalid ids', {
        tripId: req.params.tripId,
        dayId: req.params.dayId,
      });
      res.status(400).json({ error: 'Invalid tripId or dayId' });
      return;
    }
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
  } catch (err) {
    logger.error(
      'Failed to add location',
      { tripId: req.params.tripId, dayId: req.params.dayId },
      err,
    );
    res.status(500).json({ error: 'Failed to add location' });
  }
}

export async function updateDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ids = parseLocationParams(req, res, 'Update-location');
    if (!ids) {
      return;
    }
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
  } catch (err) {
    logger.error(
      'Failed to update location',
      { tripId: req.params.tripId, locationId: req.params.locationId },
      err,
    );
    res.status(500).json({ error: 'Failed to update location' });
  }
}

export async function deleteDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ids = parseLocationParams(req, res, 'Delete-location');
    if (!ids) {
      return;
    }
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
  } catch (err) {
    logger.error(
      'Failed to delete location',
      { tripId: req.params.tripId, locationId: req.params.locationId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete location' });
  }
}
