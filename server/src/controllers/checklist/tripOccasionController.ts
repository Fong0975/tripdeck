import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';

import { idParam, idParams } from './params';
import { rejectInvalidBody, rejectNotFound } from './shared/responses';
import { ensureTripExists } from './shared/tripGuards';
import { requireName } from './shared/validation';

const logger = createLogger('checklist-trip');

export async function addOccasion(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add a packing occasion to a trip checklist'
     #swagger.responses[201] = {
       description: 'Occasion created',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 2 },
               name: { type: 'string', example: '回程' },
               checks: { type: 'object', additionalProperties: { type: 'boolean' }, example: {} }
             }
           }
         }
       }
     }
     #swagger.responses[400] = { description: 'Missing, blank, or too long name' } */
  const tripId = idParam(req, 'tripId');
  const name = requireName(req.body);
  if (!name.ok) {
    rejectInvalidBody(res, logger, 'add-occasion', name.error, { tripId });
    return;
  }
  if (!(await ensureTripExists(tripId, res, logger, 'Add-occasion'))) {
    return;
  }
  const occasion = await tripRepo.createOccasion(tripId, name.value);
  logger.info('Trip checklist occasion created', {
    tripId,
    occId: occasion.id,
  });
  res.status(201).json(occasion);
}

export async function updateOccasion(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update an occasion name'
     #swagger.responses[200] = {
       description: 'Occasion updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               name: { type: 'string', example: '出發' },
               checks: {
                 type: 'object',
                 additionalProperties: { type: 'boolean' },
                 example: { '3': true, '7': true }
               }
             }
           }
         }
       }
     }
     #swagger.responses[400] = { description: 'Missing, blank, or too long name' } */
  const meta = idParams(req, 'tripId', 'occId');
  const { tripId, occId } = meta;
  const name = requireName(req.body);
  if (!name.ok) {
    rejectInvalidBody(res, logger, 'update-occasion', name.error, meta);
    return;
  }
  if (!(await tripRepo.verifyOccasionBelongsToTrip(occId, tripId))) {
    const message = 'Update-occasion rejected: occasion not found';
    rejectNotFound(res, logger, 'Occasion', message, meta);
    return;
  }
  const occasion = await tripRepo.updateOccasion(occId, name.value);
  if (!occasion) {
    const message = 'Update-occasion rejected: occasion not found on update';
    rejectNotFound(res, logger, 'Occasion', message, meta);
    return;
  }
  res.json(occasion);
}

export async function deleteOccasion(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete an occasion'
     #swagger.description = 'Rejected with 409 if this is the last remaining occasion.' */
  const meta = idParams(req, 'tripId', 'occId');
  const result = await tripRepo.deleteOccasionIfNotLast(
    meta.tripId,
    meta.occId,
  );
  if (result === 'not_found') {
    const message = 'Delete-occasion rejected: occasion not found';
    rejectNotFound(res, logger, 'Occasion', message, meta);
    return;
  }
  if (result === 'last_occasion') {
    logger.warn('Delete-occasion rejected: last remaining occasion', meta);
    res.status(409).json({ error: 'Cannot delete the last occasion' });
    return;
  }
  logger.info('Trip checklist occasion deleted', meta);
  res.status(204).send();
}
