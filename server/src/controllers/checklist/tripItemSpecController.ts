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
import {
  INVALID_CHECK_LOCATION_ERROR,
  parseCheckBody,
} from './shared/validation';

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
  const body = parseCheckBody(req.body);
  if (!body.ok) {
    logger.warn('Rejected set-spec-check request with an invalid body', meta);
    res.status(400).json({ error: body.error });
    return;
  }
  const { checked, location } = body.value;
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
  const locations = await checklistRepo.getSpecCheckLocations(specId);
  if (!locations.includes(location)) {
    logger.warn('Set-spec-check rejected: location not stored on spec', {
      ...meta,
      location,
    });
    res.status(400).json({ error: INVALID_CHECK_LOCATION_ERROR });
    return;
  }
  await checklistRepo.setSpecCheck(occId, specId, location, checked);
  logger.debug('Trip checklist spec check toggled', {
    ...meta,
    location,
    checked,
  });
  res.status(204).send();
}
