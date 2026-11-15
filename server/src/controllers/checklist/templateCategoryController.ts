import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as templateRepo from '../../repositories/checklist/template';

import { idParam } from './params';
import { rejectInvalidBody, rejectNotFound } from './shared/responses';
import { requireName } from './shared/validation';

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
  res.json(await templateRepo.findTemplate());
}

export async function addTemplateCategory(
  req: Request,
  res: Response,
): Promise<void> {
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
     }
     #swagger.responses[400] = { description: 'Missing, blank, or too long name' } */
  const name = requireName(req.body);
  if (!name.ok) {
    rejectInvalidBody(res, logger, 'add-category', name.error);
    return;
  }
  const category = await templateRepo.createCategory(name.value);
  logger.info('Template category created', {
    catId: category.id,
    name: name.value,
  });
  res.status(201).json(category);
}

export async function updateTemplateCategory(
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
     }
     #swagger.responses[400] = { description: 'Missing, blank, or too long name' } */
  const catId = idParam(req, 'catId');
  const name = requireName(req.body);
  if (!name.ok) {
    rejectInvalidBody(res, logger, 'update-category', name.error, { catId });
    return;
  }
  const category = await templateRepo.updateCategory(catId, name.value);
  if (!category) {
    const message = 'Update-category rejected: category not found';
    rejectNotFound(res, logger, 'Category', message, { catId });
    return;
  }
  res.json(category);
}

export async function deleteTemplateCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Delete a template category and all its items' */
  const catId = idParam(req, 'catId');
  if (!(await templateRepo.deleteCategory(catId))) {
    const message = 'Delete-category rejected: category not found';
    rejectNotFound(res, logger, 'Category', message, { catId });
    return;
  }
  logger.info('Template category deleted', { catId });
  res.status(204).send();
}
