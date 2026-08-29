import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as templateRepo from '../../repositories/checklist/template';

const logger = createLogger('checklist-template');

export async function addItem(req: Request, res: Response): Promise<void> {
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
  try {
    const catId = Number(req.params.catId);
    const { name, quantity, notes, storage_location } = req.body as {
      name: string;
      quantity?: number | null;
      notes?: string | null;
      storage_location?: string | null;
    };
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected add-item request with an invalid name', {
        catId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const item = await templateRepo.createItem(catId, {
      name,
      quantity,
      notes,
      storage_location,
    });
    if (!item) {
      logger.warn('Add-item rejected: category not found', { catId });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    logger.info('Template item created', { catId, itemId: item.id });
    res.status(201).json(item);
  } catch (err) {
    logger.error('Failed to add item', { catId: req.params.catId }, err);
    res.status(500).json({ error: 'Failed to add item' });
  }
}

export async function updateItem(req: Request, res: Response): Promise<void> {
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
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const { name, quantity, notes, storage_location } = req.body as {
      name: string;
      quantity?: number | null;
      notes?: string | null;
      storage_location?: string | null;
    };
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected update-item request with an invalid name', {
        catId,
        itemId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!belongs) {
      logger.warn('Update-item rejected: item not found', { catId, itemId });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const item = await templateRepo.updateItem(itemId, {
      name,
      quantity,
      notes,
      storage_location,
    });
    if (!item) {
      logger.warn('Update-item rejected: item not found after update', {
        catId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch (err) {
    logger.error(
      'Failed to update item',
      { catId: req.params.catId, itemId: req.params.itemId },
      err,
    );
    res.status(500).json({ error: 'Failed to update item' });
  }
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Delete a template item' */
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const belongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!belongs) {
      logger.warn('Delete-item rejected: item not found', { catId, itemId });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const deleted = await templateRepo.deleteItem(itemId);
    if (!deleted) {
      logger.warn('Delete-item rejected: item not found after check', {
        catId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    logger.info('Template item deleted', { catId, itemId });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete item',
      { catId: req.params.catId, itemId: req.params.itemId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete item' });
  }
}
