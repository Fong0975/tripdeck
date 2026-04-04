import type { Request, Response } from 'express';

import * as templateRepo from '../repositories/checklistTemplateRepository';
import * as tripRepo from '../repositories/checklistTripRepository';

// ── Template ─────────────────────────────────────────────────────────────────

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
                     sortOrder: { type: 'integer', example: 0 },
                     items: {
                       type: 'array',
                       items: {
                         type: 'object',
                         properties: {
                           id: { type: 'integer', example: 1 },
                           name: { type: 'string', example: '護照' },
                           sortOrder: { type: 'integer', example: 0 }
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
  } catch {
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
               sortOrder: { type: 'integer', example: 6 },
               items: { type: 'array', items: {}, example: [] }
             }
           }
         }
       }
     } */
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    res.status(201).json(await templateRepo.createCategory(name));
  } catch {
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
               sortOrder: { type: 'integer', example: 0 },
               items: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '護照' },
                     sortOrder: { type: 'integer', example: 0 }
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
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const category = await templateRepo.updateCategory(catId, name);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch {
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
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

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
               sortOrder: { type: 'integer', example: 5 }
             }
           }
         }
       }
     } */
  try {
    const catId = Number(req.params.catId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const item = await templateRepo.createItem(catId, name);
    if (!item) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Failed to add item' });
  }
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Update a template item name'
     #swagger.responses[200] = {
       description: 'Item updated',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               id: { type: 'integer', example: 1 },
               name: { type: 'string', example: '電子簽證' },
               sortOrder: { type: 'integer', example: 0 }
             }
           }
         }
       }
     } */
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const item = await templateRepo.updateItem(itemId, name);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch {
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
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const deleted = await templateRepo.deleteItem(itemId);
    if (!deleted) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete item' });
  }
}

// ── Trip checklist ────────────────────────────────────────────────────────────

export async function getTripChecklist(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Get the packing checklist for a trip'
     #swagger.description = 'Returns the trip checklist. Automatically initialized from the global template if it does not exist yet.'
     #swagger.responses[200] = {
       description: 'Trip checklist',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               tripId: { type: 'integer', example: 1 },
               categories: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '證件' },
                     sortOrder: { type: 'integer', example: 0 },
                     items: {
                       type: 'array',
                       items: {
                         type: 'object',
                         properties: {
                           id: { type: 'integer', example: 1 },
                           name: { type: 'string', example: '護照' },
                           sortOrder: { type: 'integer', example: 0 }
                         }
                       }
                     }
                   }
                 }
               },
               occasions: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '收拾' },
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
         }
       }
     } */
  try {
    const tripId = Number(req.params.tripId);
    res.json(await tripRepo.findOrInitChecklist(tripId));
  } catch {
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
}

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
     } */
  try {
    const tripId = Number(req.params.tripId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    res.status(201).json(await tripRepo.createOccasion(tripId, name));
  } catch {
    res.status(500).json({ error: 'Failed to add occasion' });
  }
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
     } */
  try {
    const tripId = Number(req.params.tripId);
    const occId = Number(req.params.occId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await tripRepo.verifyOccasionBelongsToTrip(occId, tripId);
    if (!belongs) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const occasion = await tripRepo.updateOccasion(occId, name);
    if (!occasion) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    res.json(occasion);
  } catch {
    res.status(500).json({ error: 'Failed to update occasion' });
  }
}

export async function deleteOccasion(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete an occasion'
     #swagger.description = 'Rejected with 409 if this is the last remaining occasion.' */
  try {
    const tripId = Number(req.params.tripId);
    const occId = Number(req.params.occId);
    const belongs = await tripRepo.verifyOccasionBelongsToTrip(occId, tripId);
    if (!belongs) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const count = await tripRepo.getOccasionCount(tripId);
    if (count <= 1) {
      res.status(409).json({ error: 'Cannot delete the last occasion' });
      return;
    }
    const deleted = await tripRepo.deleteOccasion(occId);
    if (!deleted) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete occasion' });
  }
}

export async function setCheck(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Set the checked state of an item within an occasion' */
  try {
    const tripId = Number(req.params.tripId);
    const occId = Number(req.params.occId);
    const itemId = Number(req.params.itemId);
    const { checked } = req.body;
    if (typeof checked !== 'boolean') {
      res.status(400).json({ error: 'checked must be a boolean' });
      return;
    }
    const occBelongs = await tripRepo.verifyOccasionBelongsToTrip(
      occId,
      tripId,
    );
    if (!occBelongs) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const itemBelongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!itemBelongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    await tripRepo.setCheck(occId, itemId, checked);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to set check' });
  }
}
