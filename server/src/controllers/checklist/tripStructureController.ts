import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';

const logger = createLogger('checklist-trip');

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
                     name: { type: 'string', example: '3C 電子' },
                     items: {
                       type: 'array',
                       items: {
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
  } catch (err) {
    logger.error(
      'Failed to fetch checklist',
      { tripId: req.params.tripId },
      err,
    );
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
      logger.warn('Rejected add-occasion request with an invalid name', {
        tripId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const occasion = await tripRepo.createOccasion(tripId, name);
    logger.info('Trip checklist occasion created', {
      tripId,
      occId: occasion.id,
    });
    res.status(201).json(occasion);
  } catch (err) {
    logger.error('Failed to add occasion', { tripId: req.params.tripId }, err);
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
      logger.warn('Rejected update-occasion request with an invalid name', {
        tripId,
        occId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await tripRepo.verifyOccasionBelongsToTrip(occId, tripId);
    if (!belongs) {
      logger.warn('Update-occasion rejected: occasion not found', {
        tripId,
        occId,
      });
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const occasion = await tripRepo.updateOccasion(occId, name);
    if (!occasion) {
      logger.warn('Update-occasion rejected: occasion not found on update', {
        tripId,
        occId,
      });
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    res.json(occasion);
  } catch (err) {
    logger.error(
      'Failed to update occasion',
      { tripId: req.params.tripId, occId: req.params.occId },
      err,
    );
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
      logger.warn('Delete-occasion rejected: occasion not found', {
        tripId,
        occId,
      });
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const count = await tripRepo.getOccasionCount(tripId);
    if (count <= 1) {
      logger.warn('Delete-occasion rejected: last remaining occasion', {
        tripId,
        occId,
        occasionCount: count,
      });
      res.status(409).json({ error: 'Cannot delete the last occasion' });
      return;
    }
    const deleted = await tripRepo.deleteOccasion(occId);
    if (!deleted) {
      logger.warn('Delete-occasion rejected: occasion not found on delete', {
        tripId,
        occId,
      });
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    logger.info('Trip checklist occasion deleted', { tripId, occId });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete occasion',
      { tripId: req.params.tripId, occId: req.params.occId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete occasion' });
  }
}

export async function addTripCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add a category to a trip checklist' */
  try {
    const tripId = Number(req.params.tripId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected add-category request with an invalid name', {
        tripId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const category = await tripRepo.createTripCategory(tripId, name);
    logger.info('Trip checklist category created', {
      tripId,
      catId: category.id,
    });
    res.status(201).json(category);
  } catch (err) {
    logger.error('Failed to add category', { tripId: req.params.tripId }, err);
    res.status(500).json({ error: 'Failed to add category' });
  }
}

export async function updateTripCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update a trip checklist category name' */
  try {
    const tripId = Number(req.params.tripId);
    const catId = Number(req.params.catId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected update-category request with an invalid name', {
        tripId,
        catId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await tripRepo.verifyCategoryBelongsToTrip(catId, tripId);
    if (!belongs) {
      logger.warn('Update-category rejected: category not found', {
        tripId,
        catId,
      });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    const updated = await tripRepo.updateTripCategory(catId, name);
    if (!updated) {
      logger.warn('Update-category rejected: category not found on update', {
        tripId,
        catId,
      });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to update category',
      { tripId: req.params.tripId, catId: req.params.catId },
      err,
    );
    res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteTripCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete a trip checklist category and all its items' */
  try {
    const tripId = Number(req.params.tripId);
    const catId = Number(req.params.catId);
    const belongs = await tripRepo.verifyCategoryBelongsToTrip(catId, tripId);
    if (!belongs) {
      logger.warn('Delete-category rejected: category not found', {
        tripId,
        catId,
      });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    const deleted = await tripRepo.deleteTripCategory(catId);
    if (!deleted) {
      logger.warn('Delete-category rejected: category not found on delete', {
        tripId,
        catId,
      });
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    logger.info('Trip checklist category deleted', { tripId, catId });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete category',
      { tripId: req.params.tripId, catId: req.params.catId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete category' });
  }
}
