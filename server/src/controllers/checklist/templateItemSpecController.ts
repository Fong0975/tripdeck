import type { Request, Response } from 'express';

import * as templateRepo from '../../repositories/checklist/template';
import type { CreateSpecBody, UpdateSpecBody } from '../../types/checklist';

export async function addTemplateItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Add a spec to a template item' */
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const { name, storage_location } = req.body as CreateSpecBody;
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
    const spec = await templateRepo.createItemSpec(itemId, {
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

export async function updateTemplateItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Update a template item spec' */
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const specId = Number(req.params.specId);
    const { name, storage_location } = req.body as UpdateSpecBody;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const itemBelongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!itemBelongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await templateRepo.verifySpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const spec = await templateRepo.updateItemSpec(specId, {
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

export async function deleteTemplateItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Delete a template item spec' */
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const specId = Number(req.params.specId);
    const itemBelongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!itemBelongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await templateRepo.verifySpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const deleted = await templateRepo.deleteItemSpec(specId);
    if (!deleted) {
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete spec' });
  }
}
