import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';
import type {
  CreateTripItemBody,
  UpdateTripItemBody,
} from '../../types/checklist';

const logger = createLogger('checklist-trip');

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
  try {
    const tripId = Number(req.params.tripId);
    const catId = Number(req.params.catId);

    const belongs = await tripRepo.verifyCategoryBelongsToTrip(catId, tripId);
    if (!belongs) {
      logger.warn('Add-item rejected: category not found', {
        tripId,
        catId,
      });
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const { name, quantity, notes, storage_location } =
      req.body as CreateTripItemBody;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected add-item request with an invalid name', {
        tripId,
        catId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const item = await tripRepo.createTripItem(catId, {
      name,
      quantity,
      notes,
      storage_location,
    });
    logger.info('Trip checklist item created', {
      tripId,
      catId,
      itemId: item.id,
    });
    res.status(201).json(item);
  } catch (err) {
    logger.error(
      'Failed to add item',
      { tripId: req.params.tripId, catId: req.params.catId },
      err,
    );
    res.status(500).json({ error: 'Failed to add item' });
  }
}

export async function deleteTripItem(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete an item from a trip checklist' */
  try {
    const tripId = Number(req.params.tripId);
    const itemId = Number(req.params.itemId);

    const belongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!belongs) {
      logger.warn('Delete-item rejected: item not found', { tripId, itemId });
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const deleted = await tripRepo.deleteTripItem(itemId);
    if (!deleted) {
      logger.warn('Delete-item rejected: item not found on delete', {
        tripId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    logger.info('Trip checklist item deleted', { tripId, itemId });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete item',
      { tripId: req.params.tripId, itemId: req.params.itemId },
      err,
    );
    res.status(500).json({ error: 'Failed to delete item' });
  }
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
  try {
    const tripId = Number(req.params.tripId);
    const itemId = Number(req.params.itemId);

    const belongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!belongs) {
      logger.warn('Update-item rejected: item not found', { tripId, itemId });
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const data = req.body as UpdateTripItemBody;
    const item = await tripRepo.updateTripItem(itemId, data);
    if (!item) {
      logger.warn('Update-item rejected: item not found on update', {
        tripId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    logger.info('Trip checklist item updated', {
      tripId,
      itemId,
      fields: Object.keys(data),
    });
    res.json(item);
  } catch (err) {
    logger.error(
      'Failed to update item',
      { tripId: req.params.tripId, itemId: req.params.itemId },
      err,
    );
    res.status(500).json({ error: 'Failed to update item' });
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
      logger.warn('Rejected set-check request with a non-boolean value', {
        tripId,
        occId,
        itemId,
      });
      res.status(400).json({ error: 'checked must be a boolean' });
      return;
    }
    const occBelongs = await tripRepo.verifyOccasionBelongsToTrip(
      occId,
      tripId,
    );
    if (!occBelongs) {
      logger.warn('Set-check rejected: occasion not found', {
        tripId,
        occId,
        itemId,
      });
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const itemBelongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!itemBelongs) {
      logger.warn('Set-check rejected: item not found', {
        tripId,
        occId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    await tripRepo.setCheck(occId, itemId, checked);
    logger.debug('Trip checklist item check toggled', {
      tripId,
      occId,
      itemId,
      checked,
    });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to set check',
      {
        tripId: req.params.tripId,
        occId: req.params.occId,
        itemId: req.params.itemId,
      },
      err,
    );
    res.status(500).json({ error: 'Failed to set check' });
  }
}
