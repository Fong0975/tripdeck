import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/trip';
import type { CreateLocationBody, UpdateLocationBody } from '../../types/trip';

const logger = createLogger('day-location');

export async function addDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const dayId = Number(req.params.dayId);
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
    const tripId = Number(req.params.tripId);
    const locationId = Number(req.params.locationId);
    const body = req.body as UpdateLocationBody;

    if (!body.name?.trim()) {
      logger.warn('Rejected update-location request with no name', {
        tripId,
        locationId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const trip = await tripRepo.findById(tripId);
    if (!trip) {
      logger.warn('Update-location rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
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
    const tripId = Number(req.params.tripId);
    const locationId = Number(req.params.locationId);

    const trip = await tripRepo.findById(tripId);
    if (!trip) {
      logger.warn('Delete-location rejected: trip not found', { tripId });
      res.status(404).json({ error: 'Trip not found' });
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
