import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';
import type { CreateSpecBody, UpdateSpecBody } from '../../types/checklist';

const logger = createLogger('checklist-trip');

export async function addTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add a spec to a trip checklist item' */
  try {
    const tripId = Number(req.params.tripId);
    const itemId = Number(req.params.itemId);
    const { name, storage_location } = req.body as CreateSpecBody;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected add-spec request with an invalid name', {
        tripId,
        itemId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!belongs) {
      logger.warn('Add-spec rejected: item not found', { tripId, itemId });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const spec = await tripRepo.createTripItemSpec(itemId, {
      name,
      storage_location,
    });
    if (!spec) {
      logger.warn('Add-spec rejected: item not found on create', {
        tripId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    logger.info('Trip checklist item spec created', {
      tripId,
      itemId,
      specId: spec.id,
    });
    res.status(201).json(spec);
  } catch (err) {
    logger.error(
      'Failed to add spec',
      { tripId: req.params.tripId, itemId: req.params.itemId },
      err,
    );
    res.status(500).json({ error: 'Failed to add spec' });
  }
}

export async function updateTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update a trip checklist item spec' */
  try {
    const tripId = Number(req.params.tripId);
    const itemId = Number(req.params.itemId);
    const specId = Number(req.params.specId);
    const { name, storage_location } = req.body as UpdateSpecBody;
    if (!name || typeof name !== 'string') {
      logger.warn('Rejected update-spec request with an invalid name', {
        tripId,
        itemId,
        specId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const itemBelongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!itemBelongs) {
      logger.warn('Update-spec rejected: item not found', {
        tripId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await tripRepo.verifyTripSpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      logger.warn('Update-spec rejected: spec not found', {
        tripId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const spec = await tripRepo.updateTripItemSpec(specId, {
      name,
      storage_location,
    });
    if (!spec) {
      logger.warn('Update-spec rejected: spec not found on update', {
        tripId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    res.json(spec);
  } catch (err) {
    logger.error(
      'Failed to update spec',
      {
        tripId: req.params.tripId,
        itemId: req.params.itemId,
        specId: req.params.specId,
      },
      err,
    );
    res.status(500).json({ error: 'Failed to update spec' });
  }
}

export async function deleteTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete a trip checklist item spec' */
  try {
    const tripId = Number(req.params.tripId);
    const itemId = Number(req.params.itemId);
    const specId = Number(req.params.specId);
    const itemBelongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!itemBelongs) {
      logger.warn('Delete-spec rejected: item not found', {
        tripId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await tripRepo.verifyTripSpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      logger.warn('Delete-spec rejected: spec not found', {
        tripId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const deleted = await tripRepo.deleteTripItemSpec(specId);
    if (!deleted) {
      logger.warn('Delete-spec rejected: spec not found on delete', {
        tripId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    logger.info('Trip checklist item spec deleted', {
      tripId,
      itemId,
      specId,
    });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete spec',
      {
        tripId: req.params.tripId,
        itemId: req.params.itemId,
        specId: req.params.specId,
      },
      err,
    );
    res.status(500).json({ error: 'Failed to delete spec' });
  }
}
