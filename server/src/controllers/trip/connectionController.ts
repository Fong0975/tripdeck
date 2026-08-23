import type { Request, Response } from 'express';

import * as connectionRepo from '../../repositories/connectionRepository';
import * as tripRepo from '../../repositories/trip';
import type {
  CreateConnectionBody,
  UpdateConnectionBody,
} from '../../types/trip';

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
