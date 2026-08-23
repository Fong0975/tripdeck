import type { Request, Response } from 'express';

import * as tripRepo from '../../repositories/checklist/trip';
import type { CreateSpecBody, UpdateSpecBody } from '../../types/checklist';

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
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!belongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const spec = await tripRepo.createTripItemSpec(itemId, {
      name,
      storage_location,
    });
    if (!spec) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(201).json(spec);
  } catch {
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
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const itemBelongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!itemBelongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await tripRepo.verifyTripSpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const spec = await tripRepo.updateTripItemSpec(specId, {
      name,
      storage_location,
    });
    if (!spec) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    res.json(spec);
  } catch {
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
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await tripRepo.verifyTripSpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const deleted = await tripRepo.deleteTripItemSpec(specId);
    if (!deleted) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete spec' });
  }
}
