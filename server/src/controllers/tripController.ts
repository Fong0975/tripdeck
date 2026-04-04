import type { Request, Response } from 'express';

import * as attractionRepo from '../repositories/attractionRepository';
import * as connectionRepo from '../repositories/connectionRepository';
import * as tripRepo from '../repositories/tripRepository';
import type {
  CreateAttractionBody,
  CreateConnectionBody,
  CreateTripBody,
  ReorderAttractionsBody,
  UpdateAttractionBody,
  UpdateConnectionBody,
} from '../types/trip';

// --- Trips ---

export async function getTrips(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await tripRepo.findAll());
  } catch {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}

export async function getTrip(req: Request, res: Response): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const trip = await tripRepo.findById(tripId);
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(trip);
  } catch {
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
}

export async function createTrip(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as CreateTripBody;
    if (!body.title || !body.startDate || !body.endDate) {
      res
        .status(400)
        .json({ error: 'title, startDate, and endDate are required' });
      return;
    }
    res.status(201).json(await tripRepo.create(body));
  } catch {
    res.status(500).json({ error: 'Failed to create trip' });
  }
}

export async function deleteTrip(req: Request, res: Response): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const deleted = await tripRepo.deleteById(tripId);
    if (!deleted) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete trip' });
  }
}

// --- Trip content ---

export async function getTripContent(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const content = await tripRepo.findContent(tripId);
    if (!content) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(content);
  } catch {
    res.status(500).json({ error: 'Failed to fetch trip content' });
  }
}

// --- Attractions ---

export async function addAttraction(
  req: Request,
  res: Response,
): Promise<void> {
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

export async function reorderAttractions(
  req: Request,
  res: Response,
): Promise<void> {
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

// --- Connections ---

export async function addConnection(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const dayId = Number(req.params.dayId);

    const body = req.body as CreateConnectionBody;
    if (!body.fromAttractionId || !body.toAttractionId || !body.transportMode) {
      res.status(400).json({
        error:
          'fromAttractionId, toAttractionId, and transportMode are required',
      });
      return;
    }

    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    res.status(201).json(await connectionRepo.create(dayId, body));
  } catch {
    res.status(500).json({ error: 'Failed to add connection' });
  }
}

export async function updateConnection(
  req: Request,
  res: Response,
): Promise<void> {
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

    const updated = await connectionRepo.update(
      connectionId,
      req.body as UpdateConnectionBody,
    );
    if (!updated) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update connection' });
  }
}

export async function deleteConnection(
  req: Request,
  res: Response,
): Promise<void> {
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

    await connectionRepo.deleteById(connectionId);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete connection' });
  }
}
