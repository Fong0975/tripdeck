import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as templateRepo from '../../repositories/checklist/template';

import {
  handleAddSpec,
  handleDeleteSpec,
  handleUpdateSpec,
  type SpecStore,
} from './shared/specHandlers';

/** Template item specs are scoped by the item's `:catId` category. */
const templateSpecs: SpecStore = {
  logger: createLogger('checklist-template'),
  label: 'Template item spec',
  parentParam: 'catId',
  verifyItem: templateRepo.verifyItemBelongsToCategory,
  verifySpec: templateRepo.verifySpecBelongsToItem,
  create: templateRepo.createItemSpec,
  update: templateRepo.updateItemSpec,
  remove: templateRepo.deleteItemSpec,
};

export async function addTemplateItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Add a spec to a template item'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name, or too long storage_location' } */
  await handleAddSpec(templateSpecs, req, res);
}

export async function updateTemplateItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Update a template item spec'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name, or too long storage_location' } */
  await handleUpdateSpec(templateSpecs, req, res);
}

export async function deleteTemplateItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Template']
     #swagger.summary = 'Delete a template item spec' */
  await handleDeleteSpec(templateSpecs, req, res);
}
