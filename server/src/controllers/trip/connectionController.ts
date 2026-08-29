import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as connectionRepo from '../../repositories/connectionRepository';
import * as tripRepo from '../../repositories/trip';
import type {
  CreateConnectionBody,
  UpdateConnectionBody,
} from '../../types/trip';

const logger = createLogger('connection');

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
      logger.warn('Rejected add-connection request with missing fields', {
        tripId,
        dayId,
      });
      res.status(400).json({
        error:
          'fromAttractionId, toAttractionId, and transportMode are required',
      });
      return;
    }

    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      logger.warn('Add-connection rejected: day not found', {
        tripId,
        dayId,
      });
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    const connection = await connectionRepo.create(dayId, body);
    logger.info('Connection created', {
      tripId,
      dayId,
      connectionId: connection.id,
    });
    res.status(201).json(connection);
  } catch (err) {
    logger.error(
      'Failed to add connection',
      { tripId: req.params.tripId, dayId: req.params.dayId },
      err,
    );
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
      logger.warn('Update-connection rejected: connection not found', {
        tripId,
        connectionId,
      });
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const updated = await connectionRepo.update(
      connectionId,
      req.body as UpdateConnectionBody,
    );
    if (!updated) {
      logger.warn(
        'Update-connection rejected: connection not found on update',
        { tripId, connectionId },
      );
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    logger.error(
      'Failed to update connection',
      { tripId: req.params.tripId, connectionId: req.params.connectionId },
      err,
    );
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
      logger.warn('Delete-connection rejected: connection not found', {
        tripId,
        connectionId,
      });
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    await connectionRepo.deleteById(connectionId);
    logger.info('Connection deleted', { tripId, connectionId });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete connection',
      { tripId: req.params.tripId, connectionId: req.params.connectionId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete connection' });
  }
}
