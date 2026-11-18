import type { UpdateTripChecklistItemBody } from '@tripdeck/shared';
import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as labelRepo from '../../repositories/checklist/locationLabelRepository';
import * as checklistRepo from '../../repositories/checklist/trip';

import { idParams } from './params';
import {
  handleAddItem,
  handleDeleteItem,
  handleUpdateItem,
  type ItemStore,
} from './shared/itemHandlers';
import { handleReorder, parseMoveTarget } from './shared/orderHandlers';
import { rejectNotFound } from './shared/responses';
import {
  INVALID_CHECK_LOCATION_ERROR,
  parseCheckBody,
  parseTripItemPatch,
} from './shared/validation';

const logger = createLogger('checklist-trip');

/**
 * Trip items are scoped by their `:tripId` trip. Updates are partial: only
 * the fields present in the body are validated and written.
 */
const tripItems: ItemStore<UpdateTripChecklistItemBody> = {
  logger,
  label: 'Trip checklist item',
  parentParam: 'tripId',
  verifyCategory: checklistRepo.verifyCategoryBelongsToTrip,
  create: checklistRepo.createTripItem,
  parseUpdate: parseTripItemPatch,
  verifyItem: checklistRepo.verifyItemBelongsToTrip,
  findDisallowedLocation: async (location, itemId) =>
    labelRepo.findDisallowedLocation(
      location,
      itemId === undefined
        ? []
        : await checklistRepo.getItemCheckLocations(itemId),
    ),
  update: checklistRepo.updateTripItem,
  remove: checklistRepo.deleteTripItem,
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
     }
     #swagger.responses[400] = { description: 'Missing, blank, or too long name; too long storage_location; or quantity not a non-negative integer' } */
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
     }
     #swagger.responses[400] = { description: 'Blank or too long name, too long storage_location, or quantity not a non-negative integer' } */
  await handleUpdateItem(tripItems, req, res);
}

export async function setCheck(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Set the checked state of an item at one of its storage locations within an occasion'
     #swagger.description = 'Each storage location of an item is checked independently.'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['checked', 'location'],
             properties: {
               checked: { type: 'boolean', example: true },
               location: {
                 type: 'string',
                 description: 'One of the storage locations of the item (託運 or 隨身); an empty string when it has none.',
                 example: '託運'
               }
             }
           }
         }
       }
     }
     #swagger.responses[204] = { description: 'Check state stored' }
     #swagger.responses[400] = { description: 'checked is not a boolean, or location is not a string or not one of the locations of the item' }
     #swagger.responses[404] = { description: 'Occasion or item not found' } */
  const meta = idParams(req, 'tripId', 'occId', 'itemId');
  const { tripId, occId, itemId } = meta;
  const body = parseCheckBody(req.body);
  if (!body.ok) {
    logger.warn('Rejected set-check request with an invalid body', meta);
    res.status(400).json({ error: body.error });
    return;
  }
  const { checked, location } = body.value;
  if (!(await checklistRepo.verifyOccasionBelongsToTrip(occId, tripId))) {
    const message = 'Set-check rejected: occasion not found';
    rejectNotFound(res, logger, 'Occasion', message, meta);
    return;
  }
  if (!(await checklistRepo.verifyItemBelongsToTrip(itemId, tripId))) {
    const message = 'Set-check rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  const locations = await checklistRepo.getItemCheckLocations(itemId);
  if (!locations.includes(location)) {
    logger.warn('Set-check rejected: location not stored on item', {
      ...meta,
      location,
    });
    res.status(400).json({ error: INVALID_CHECK_LOCATION_ERROR });
    return;
  }
  await checklistRepo.setCheck(occId, itemId, location, checked);
  logger.debug('Trip checklist item check toggled', {
    ...meta,
    location,
    checked,
  });
  res.status(204).send();
}

export async function reorderTripItems(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Reorder the items of a trip checklist category'
     #swagger.description = 'orderedIds must list every item of the category exactly once.'
     #swagger.responses[204] = { description: 'Items reordered' }
     #swagger.responses[400] = { description: 'orderedIds is not an array of positive integers, or does not list every item of the category exactly once' }
     #swagger.responses[404] = { description: 'Category not found' } */
  const meta = idParams(req, 'tripId', 'catId');
  if (
    !(await checklistRepo.verifyCategoryBelongsToTrip(meta.catId, meta.tripId))
  ) {
    const message = 'Reorder-items rejected: category not found';
    rejectNotFound(res, logger, 'Category', message, meta);
    return;
  }
  await handleReorder(
    {
      logger,
      label: 'Trip checklist items',
      body: req.body,
      meta,
      reorder: ids => checklistRepo.reorderTripItems(meta.catId, ids),
    },
    res,
  );
}

export async function moveTripItem(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Move a trip checklist item to the end of another category'
     #swagger.description = 'The item keeps its id, specs and check marks. The target category must belong to the same trip.'
     #swagger.responses[204] = { description: 'Item moved' }
     #swagger.responses[400] = { description: 'targetCategoryId is not a positive integer' }
     #swagger.responses[404] = { description: 'Item or target category not found' } */
  const meta = idParams(req, 'tripId', 'itemId');
  const targetCatId = parseMoveTarget({ logger, body: req.body, meta }, res);
  if (targetCatId === null) {
    return;
  }
  const result = await checklistRepo.moveTripItem(
    meta.tripId,
    meta.itemId,
    targetCatId,
  );
  if (result !== 'moved') {
    const entity = result === 'item_not_found' ? 'Item' : 'Category';
    const message = `Move-item rejected: ${entity.toLowerCase()} not found`;
    rejectNotFound(res, logger, entity, message, { ...meta, targetCatId });
    return;
  }
  logger.info('Trip checklist item moved', { ...meta, targetCatId });
  res.status(204).send();
}
