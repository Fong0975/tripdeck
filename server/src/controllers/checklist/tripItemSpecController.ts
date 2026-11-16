import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as checklistRepo from '../../repositories/checklist/trip';

import { idParams } from './params';
import { rejectNotFound } from './shared/responses';
import {
  handleAddSpec,
  handleDeleteSpec,
  handleUpdateSpec,
  type SpecStore,
} from './shared/specHandlers';

/** Trip item specs are scoped by the item's `:tripId` trip. */
const logger = createLogger('checklist-trip');

const tripSpecs: SpecStore = {
  logger,
  label: 'Trip checklist item spec',
  parentParam: 'tripId',
  verifyItem: checklistRepo.verifyItemBelongsToTrip,
  verifySpec: checklistRepo.verifyTripSpecBelongsToItem,
  create: checklistRepo.createTripItemSpec,
  update: checklistRepo.updateTripItemSpec,
  remove: checklistRepo.deleteTripItemSpec,
};

export async function addTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add a spec to a trip checklist item'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name, or too long storage_location' } */
  await handleAddSpec(tripSpecs, req, res);
}

export async function updateTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update a trip checklist item spec'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name, or too long storage_location' } */
  await handleUpdateSpec(tripSpecs, req, res);
}

export async function deleteTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete a trip checklist item spec' */
  await handleDeleteSpec(tripSpecs, req, res);
}

export async function setSpecCheck(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Set the checked state of an item spec within an occasion' */
  const meta = idParams(req, 'tripId', 'occId', 'itemId', 'specId');
  const { tripId, occId, itemId, specId } = meta;
  const { checked } = req.body as { checked?: unknown };
  if (typeof checked !== 'boolean') {
    logger.warn(
      'Rejected set-spec-check request with a non-boolean value',
      meta,
    );
    res.status(400).json({ error: 'checked must be a boolean' });
    return;
  }
  if (!(await checklistRepo.verifyOccasionBelongsToTrip(occId, tripId))) {
    const message = 'Set-spec-check rejected: occasion not found';
    rejectNotFound(res, logger, 'Occasion', message, meta);
    return;
  }
  if (!(await checklistRepo.verifyItemBelongsToTrip(itemId, tripId))) {
    const message = 'Set-spec-check rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  if (!(await checklistRepo.verifyTripSpecBelongsToItem(specId, itemId))) {
    const message = 'Set-spec-check rejected: spec not found';
    rejectNotFound(res, logger, 'Spec', message, meta);
    return;
  }
  await checklistRepo.setSpecCheck(occId, specId, checked);
  logger.debug('Trip checklist spec check toggled', { ...meta, checked });
  res.status(204).send();
}
