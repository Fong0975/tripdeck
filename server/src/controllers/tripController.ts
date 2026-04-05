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
  } catch {
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
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(trip);
  } catch {
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
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Delete a trip' */
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

// --- Connections ---

export async function addConnection(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Connections']
     #swagger.summary = 'Add a connection between two attractions'
     #swagger.responses[201] = {
       description: 'Connection created',
       content: {
         'application/json': {
           schema: {
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
     } */
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
  /* #swagger.tags = ['Connections']
     #swagger.summary = 'Update a connection'
     #swagger.responses[200] = {
       description: 'Connection updated',
       content: {
         'application/json': {
           schema: {
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
     } */
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
  /* #swagger.tags = ['Connections']
     #swagger.summary = 'Delete a connection' */
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
