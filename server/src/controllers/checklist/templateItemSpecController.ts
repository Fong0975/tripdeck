import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as templateRepo from '../../repositories/checklist/template';
import type { CreateSpecBody, UpdateSpecBody } from '../../types/checklist';

const logger = createLogger('checklist-template');

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
      logger.warn('Rejected add-spec request with an invalid name', {
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
      logger.warn('Add-spec rejected: item not found', { catId, itemId });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const spec = await templateRepo.createItemSpec(itemId, {
      name,
      storage_location,
    });
    if (!spec) {
      logger.warn('Add-spec rejected: item not found on create', {
        catId,
        itemId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    logger.info('Template item spec created', {
      catId,
      itemId,
      specId: spec.id,
    });
    res.status(201).json(spec);
  } catch (err) {
    logger.error(
      'Failed to add spec',
      { catId: req.params.catId, itemId: req.params.itemId },
      err,
    );
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
      logger.warn('Rejected update-spec request with an invalid name', {
        catId,
        itemId,
        specId,
      });
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const itemBelongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!itemBelongs) {
      logger.warn('Update-spec rejected: item not found', {
        catId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await templateRepo.verifySpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      logger.warn('Update-spec rejected: spec not found', {
        catId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const spec = await templateRepo.updateItemSpec(specId, {
      name,
      storage_location,
    });
    if (!spec) {
      logger.warn('Update-spec rejected: spec not found on update', {
        catId,
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
        catId: req.params.catId,
        itemId: req.params.itemId,
        specId: req.params.specId,
      },
      err,
    );
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
      logger.warn('Delete-spec rejected: item not found', {
        catId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const specBelongs = await templateRepo.verifySpecBelongsToItem(
      specId,
      itemId,
    );
    if (!specBelongs) {
      logger.warn('Delete-spec rejected: spec not found', {
        catId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    const deleted = await templateRepo.deleteItemSpec(specId);
    if (!deleted) {
      logger.warn('Delete-spec rejected: spec not found on delete', {
        catId,
        itemId,
        specId,
      });
      res.status(404).json({ error: 'Spec not found' });
      return;
    }
    logger.info('Template item spec deleted', { catId, itemId, specId });
    res.status(204).send();
  } catch (err) {
    logger.error(
      'Failed to delete spec',
      {
        catId: req.params.catId,
        itemId: req.params.itemId,
        specId: req.params.specId,
      },
      err,
    );
    res.status(500).json({ error: 'Failed to delete spec' });
  }
}
