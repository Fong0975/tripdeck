import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as templateRepo from '../../repositories/checklist/template';

const logger = createLogger('checklist-template');

export async function getTemplate(_req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Get the global packing checklist template'
     #swagger.responses[200] = {
       description: 'Full template with all categories and items',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               categories: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '證件' },
                     items: {
                       type: 'array',
                       items: {
                         type: 'object',
                         properties: {
                           id: { type: 'integer', example: 1 },
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
               }
             }
           }
         }
       }
     } */
  try {
    res.json(await templateRepo.findTemplate());
  } catch (err) {
    logger.error('Failed to fetch template', undefined, err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Add a category to the template'
     #swagger.responses[201] = {
       description: 'Category created',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 7 },
               name: { type: 'string', example: '運動用品' },
               items: { type: 'array', items: {}, example: [] }
             }
           }
         }
       }
     } */
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected add-category request with an invalid name');
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const category = await templateRepo.createCategory(name);
    logger.info('Template category created', { catId: category.id, name });
    res.status(201).json(category);
  } catch (err) {
    logger.error('Failed to add category', undefined, err);
    res.status(500).json({ error: 'Failed to add category' });
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Update a template category name'
     #swagger.responses[200] = {
       description: 'Category updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               name: { type: 'string', example: '重要證件' },
               items: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '護照' },
                     quantity: { type: 'integer', nullable: true, example: 1 },
                     notes: { type: 'string', nullable: true, example: null },
                     storage_location: { type: 'string', nullable: true, example: '隨身包' },
                     specs: { type: 'array', items: {}, example: [] }
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
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected update-category request with an invalid name', {
        catId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const category = await templateRepo.updateCategory(catId, name);
    if (!category) {
      logger.warn('Update-category rejected: category not found', { catId });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch (err) {
    logger.error('Failed to update category', { catId: req.params.catId }, err);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Delete a template category and all its items' */
  try {
    const catId = Number(req.params.catId);
    const deleted = await templateRepo.deleteCategory(catId);
    if (!deleted) {
      logger.warn('Delete-category rejected: category not found', { catId });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    logger.info('Template category deleted', { catId });
    res.status(204).send();
  } catch (err) {
    logger.error('Failed to delete category', { catId: req.params.catId }, err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}
