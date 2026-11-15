import type {
  CreateConnectionBody,
  UpdateConnectionBody,
} from '@tripdeck/shared';
import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as connectionRepo from '../../repositories/connection';
import * as tripRepo from '../../repositories/trip';
import { isTransportMode } from '../../validation/transportMode';
import { idParam } from '../params';

import {
  ENDPOINTS_NOT_IN_DAY_ERROR,
  findTooLongConnectionField,
  INVALID_TRANSPORT_MODE_ERROR,
  isMissing,
  resolveEndpoints,
} from './connectionValidation';

const logger = createLogger('connection');

/**
 * Logs a rejected request and responds with `400 { error }`.
 *
 * @param res - Express response.
 * @param action - Human-readable request name used in the log message.
 * @param error - Client-facing error message.
 * @param context - Structured log metadata.
 */
function rejectBadRequest(
  res: Response,
  action: string,
  error: string,
  context: Record<string, unknown>,
): void {
  logger.warn(`${action} rejected: ${error}`, context);
  res.status(400).json({ error });
}

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
     }
     #swagger.responses[400] = { description: 'Invalid ids, missing fields, unknown transportMode, duration longer than 100 characters, or attractions not in this day' }
     #swagger.responses[404] = { description: 'Day not found' } */
  const tripId = idParam(req, 'tripId');
  const dayId = idParam(req, 'dayId');

  const body = req.body as CreateConnectionBody;
  if (!body.fromAttractionId || !body.toAttractionId || !body.transportMode) {
    logger.warn('Rejected add-connection request with missing fields', {
      tripId,
      dayId,
    });
    res.status(400).json({
      error: 'fromAttractionId, toAttractionId, and transportMode are required',
    });
    return;
  }

  const resolution = resolveEndpoints(
    body.fromAttractionId,
    body.toAttractionId,
  );
  if (!resolution.ok) {
    rejectBadRequest(res, 'Add-connection', resolution.error, {
      tripId,
      dayId,
    });
    return;
  }
  if (!isTransportMode(body.transportMode)) {
    rejectBadRequest(res, 'Add-connection', INVALID_TRANSPORT_MODE_ERROR, {
      tripId,
      dayId,
      transportMode: body.transportMode,
    });
    return;
  }
  const tooLong = findTooLongConnectionField(body);
  if (tooLong) {
    rejectBadRequest(res, 'Add-connection', tooLong, { tripId, dayId });
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

  const { fromAttractionId, toAttractionId } = resolution.endpoints;
  const inDay = await connectionRepo.attractionsBelongToDay(
    dayId,
    fromAttractionId,
    toAttractionId,
  );
  if (!inDay) {
    rejectBadRequest(res, 'Add-connection', ENDPOINTS_NOT_IN_DAY_ERROR, {
      tripId,
      dayId,
      fromAttractionId,
      toAttractionId,
    });
    return;
  }

  const connection = await connectionRepo.create(dayId, {
    ...body,
    ...resolution.endpoints,
  });
  logger.info('Connection created', {
    tripId,
    dayId,
    connectionId: connection.id,
  });
  res.status(201).json(connection);
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
     }
     #swagger.responses[400] = { description: 'Invalid ids, unknown transportMode, duration longer than 100 characters, or attractions not in the connection\'s day' }
     #swagger.responses[404] = { description: 'Connection not found' } */
  const tripId = idParam(req, 'tripId');
  const connectionId = idParam(req, 'connectionId');

  const body = req.body as UpdateConnectionBody;
  if (!isMissing(body.transportMode) && !isTransportMode(body.transportMode)) {
    rejectBadRequest(res, 'Update-connection', INVALID_TRANSPORT_MODE_ERROR, {
      tripId,
      connectionId,
      transportMode: body.transportMode,
    });
    return;
  }
  const tooLong = findTooLongConnectionField(body);
  if (tooLong) {
    rejectBadRequest(res, 'Update-connection', tooLong, {
      tripId,
      connectionId,
    });
    return;
  }

  const current = await connectionRepo.findEndpointsInTrip(
    connectionId,
    tripId,
  );
  if (!current) {
    logger.warn('Update-connection rejected: connection not found', {
      tripId,
      connectionId,
    });
    res.status(404).json({ error: 'Connection not found' });
    return;
  }

  let data = body;
  if (!isMissing(body.fromAttractionId) || !isMissing(body.toAttractionId)) {
    const resolution = resolveEndpoints(
      body.fromAttractionId,
      body.toAttractionId,
      current,
    );
    if (!resolution.ok) {
      rejectBadRequest(res, 'Update-connection', resolution.error, {
        tripId,
        connectionId,
      });
      return;
    }
    const { fromAttractionId, toAttractionId } = resolution.endpoints;
    const inDay = await connectionRepo.attractionsBelongToDay(
      current.dayId,
      fromAttractionId,
      toAttractionId,
    );
    if (!inDay) {
      rejectBadRequest(res, 'Update-connection', ENDPOINTS_NOT_IN_DAY_ERROR, {
        tripId,
        connectionId,
        fromAttractionId,
        toAttractionId,
      });
      return;
    }
    data = { ...body, ...resolution.endpoints };
  }

  const updated = await connectionRepo.update(connectionId, data);
  if (!updated) {
    logger.warn('Update-connection rejected: connection not found on update', {
      tripId,
      connectionId,
    });
    res.status(404).json({ error: 'Connection not found' });
    return;
  }
  res.json(updated);
}

export async function deleteConnection(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Connections']
     #swagger.summary = 'Delete a connection'
     #swagger.responses[400] = { description: 'Invalid tripId or connectionId' }
     #swagger.responses[404] = { description: 'Connection not found' } */
  const tripId = idParam(req, 'tripId');
  const connectionId = idParam(req, 'connectionId');

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
}
