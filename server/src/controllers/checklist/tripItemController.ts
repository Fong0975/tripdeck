import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';
import type { UpdateTripItemBody } from '../../types/checklist';

import { idParams } from './params';
import {
  handleAddItem,
  handleDeleteItem,
  handleUpdateItem,
  type ItemStore,
} from './shared/itemHandlers';
import { rejectNotFound } from './shared/responses';

const logger = createLogger('checklist-trip');

/**
 * Trip items are scoped by their `:tripId` trip. Updates are partial, so the
 * body is passed through without a required-name check.
 */
const tripItems: ItemStore<UpdateTripItemBody> = {
  logger,
  label: 'Trip checklist item',
  parentParam: 'tripId',
  verifyCategory: tripRepo.verifyCategoryBelongsToTrip,
  create: tripRepo.createTripItem,
  parseUpdate: body => body as UpdateTripItemBody,
  verifyItem: tripRepo.verifyItemBelongsToTrip,
  update: tripRepo.updateTripItem,
  remove: tripRepo.deleteTripItem,
};

export async function addTripItem(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add an item to a trip checklist category'
     #swagger.responses[201] = {
       description: 'Item created',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 63 },
               name: { type: 'string', example: '頸枕' },
               quantity: { type: 'integer', nullable: true, example: 1 },
               notes: { type: 'string', nullable: true, example: null },
               storage_location: { type: 'string', nullable: true, example: null },
               specs: { type: 'array', items: {}, example: [] }
             }
           }
         }
       }
     } */
  await handleAddItem(tripItems, req, res);
}

export async function deleteTripItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete an item from a trip checklist' */
  await handleDeleteItem(tripItems, req, res);
}

export async function updateTripItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update name, quantity, notes or storage_location of a trip checklist item'
     #swagger.responses[200] = {
       description: 'Item updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 7 },
               name: { type: 'string', example: '充電器' },
               quantity: { type: 'integer', nullable: true, example: 2 },
               notes: { type: 'string', nullable: true, example: '手機＋相機充電器各一' },
               storage_location: { type: 'string', nullable: true, example: '後背包' },
               specs: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: 'Type-C 充電器' },
                     storage_location: { type: 'string', nullable: true, example: '後背包' }
                   }
                 }
               }
             }
           }
         }
       }
     } */
  await handleUpdateItem(tripItems, req, res);
}

export async function setCheck(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Set the checked state of an item within an occasion' */
  const meta = idParams(req, 'tripId', 'occId', 'itemId');
  const { tripId, occId, itemId } = meta;
  const { checked } = req.body as { checked?: unknown };
  if (typeof checked !== 'boolean') {
    logger.warn('Rejected set-check request with a non-boolean value', meta);
    res.status(400).json({ error: 'checked must be a boolean' });
    return;
  }
  if (!(await tripRepo.verifyOccasionBelongsToTrip(occId, tripId))) {
    const message = 'Set-check rejected: occasion not found';
    rejectNotFound(res, logger, 'Occasion', message, meta);
    return;
  }
  if (!(await tripRepo.verifyItemBelongsToTrip(itemId, tripId))) {
    const message = 'Set-check rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  await tripRepo.setCheck(occId, itemId, checked);
  logger.debug('Trip checklist item check toggled', { ...meta, checked });
  res.status(204).send();
}
