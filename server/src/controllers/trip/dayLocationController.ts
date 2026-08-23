import type { Request, Response } from 'express';

import * as tripRepo from '../../repositories/trip';
import type { CreateLocationBody, UpdateLocationBody } from '../../types/trip';

export async function addDayLocation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const dayId = Number(req.params.dayId);
    const body = req.body as CreateLocationBody;

    if (!body.name?.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    const location = await tripRepo.addLocation(dayId, body);
    res.status(201).json(location);
  } catch {
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
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const trip = await tripRepo.findById(tripId);
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const updated = await tripRepo.updateLocation(locationId, body);
    if (!updated) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    res.json({ id: locationId, name: body.name.trim() });
  } catch {
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
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const deleted = await tripRepo.deleteLocation(locationId);
    if (!deleted) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete location' });
  }
}
