import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as templateRepo from '../../repositories/checklist/template';
import type { UpdateItemBody } from '../../types/checklist';

import {
  handleAddItem,
  handleDeleteItem,
  handleUpdateItem,
  type ItemStore,
} from './shared/itemHandlers';
import { pickItemFields, requireName } from './shared/validation';

/** Template items are scoped by their `:catId` category. */
const templateItems: ItemStore<UpdateItemBody> = {
  logger: createLogger('checklist-template'),
  label: 'Template item',
  parentParam: 'catId',
  create: templateRepo.createItem,
  parseUpdate: body => {
    const name = requireName(body);
    return name === null ? null : pickItemFields(body, name);
  },
  verifyItem: templateRepo.verifyItemBelongsToCategory,
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
     } */
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
     } */
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
