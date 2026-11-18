import type { ChecklistItemBody } from '@tripdeck/shared';
import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as labelRepo from '../../repositories/checklist/locationLabelRepository';
import * as templateRepo from '../../repositories/checklist/template';

import { idParams } from './params';
import {
  handleAddItem,
  handleDeleteItem,
  handleUpdateItem,
  type ItemStore,
} from './shared/itemHandlers';
import { handleReorder, parseMoveTarget } from './shared/orderHandlers';
import { rejectNotFound } from './shared/responses';
import { parseItemFields } from './shared/validation';

const logger = createLogger('checklist-template');

/** Template items are scoped by their `:catId` category. */
const templateItems: ItemStore<ChecklistItemBody> = {
  logger,
  label: 'Template item',
  parentParam: 'catId',
  create: templateRepo.createItem,
  parseUpdate: parseItemFields,
  verifyItem: templateRepo.verifyItemBelongsToCategory,
  findDisallowedLocation: location =>
    labelRepo.findDisallowedLocation(location),
  update: templateRepo.updateItem,
  remove: templateRepo.deleteItem,
};

export async function addTemplateItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Add an item to a template category'
     #swagger.responses[201] = {
       description: 'Item created',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 32 },
               name: { type: 'string', example: '電子簽證' },
               quantity: { type: 'integer', nullable: true, example: null },
               notes: { type: 'string', nullable: true, example: null },
               storage_location: { type: 'string', nullable: true, example: null },
               specs: { type: 'array', items: {}, example: [] }
             }
           }
         }
       }
     }
     #swagger.responses[400] = { description: 'Missing, blank, or too long name; too long storage_location; or quantity not a non-negative integer' } */
  await handleAddItem(templateItems, req, res);
}

export async function updateTemplateItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Update a template item'
     #swagger.responses[200] = {
       description: 'Item updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               name: { type: 'string', example: '電子簽證' },
               quantity: { type: 'integer', nullable: true, example: 2 },
               notes: { type: 'string', nullable: true, example: '每人一份' },
               storage_location: { type: 'string', nullable: true, example: '隨身包' },
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
     #swagger.responses[400] = { description: 'Missing, blank, or too long name; too long storage_location; or quantity not a non-negative integer' } */
  await handleUpdateItem(templateItems, req, res);
}

export async function deleteTemplateItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Delete a template item' */
  await handleDeleteItem(templateItems, req, res);
}

export async function reorderTemplateItems(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Reorder the items of a template category'
     #swagger.description = 'orderedIds must list every item of the category exactly once.'
     #swagger.responses[204] = { description: 'Items reordered' }
     #swagger.responses[400] = { description: 'orderedIds is not an array of positive integers, or does not list every item of the category exactly once' }
     #swagger.responses[404] = { description: 'Category not found' } */
  const meta = idParams(req, 'catId');
  if (!(await templateRepo.categoryExists(meta.catId))) {
    const message = 'Reorder-items rejected: category not found';
    rejectNotFound(res, logger, 'Category', message, meta);
    return;
  }
  await handleReorder(
    {
      logger,
      label: 'Template items',
      body: req.body,
      meta,
      reorder: ids => templateRepo.reorderItems(meta.catId, ids),
    },
    res,
  );
}

export async function moveTemplateItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Move a template item to the end of another category'
     #swagger.responses[204] = { description: 'Item moved' }
     #swagger.responses[400] = { description: 'targetCategoryId is not a positive integer' }
     #swagger.responses[404] = { description: 'Item or target category not found' } */
  const meta = idParams(req, 'catId', 'itemId');
  const targetCatId = parseMoveTarget({ logger, body: req.body, meta }, res);
  if (targetCatId === null) {
    return;
  }
  if (
    !(await templateRepo.verifyItemBelongsToCategory(meta.itemId, meta.catId))
  ) {
    const message = 'Move-item rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  const result = await templateRepo.moveItem(meta.itemId, targetCatId);
  if (result !== 'moved') {
    const entity = result === 'item_not_found' ? 'Item' : 'Category';
    const message = `Move-item rejected: ${entity.toLowerCase()} not found`;
    rejectNotFound(res, logger, entity, message, { ...meta, targetCatId });
    return;
  }
  logger.info('Template item moved', { ...meta, targetCatId });
  res.status(204).send();
}
