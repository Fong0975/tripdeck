import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as labelRepo from '../../repositories/checklist/locationLabelRepository';
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
  findDisallowedLocation: async (location, specId) =>
    labelRepo.findDisallowedLocation(
      location,
      specId === undefined
        ? []
        : await checklistRepo.getSpecCheckLocations(specId),
    ),
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
     #swagger.responses[400] = { description: 'Missing, blank, or too long name; too long storage_location; or storage_location adding a location label that is not defined (names the spec already carries may be kept)' } */
  await handleAddSpec(tripSpecs, req, res);
}

export async function updateTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update a trip checklist item spec'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name; too long storage_location; or storage_location adding a location label that is not defined (names the spec already carries may be kept)' } */
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
     #swagger.summary = 'Set the checked state of an item spec at one of its storage locations within an occasion'
     #swagger.description = 'Each storage location of a spec is checked independently. A spec never inherits the locations of its item.'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['checked', 'location'],
             properties: {
               checked: { type: 'boolean', example: true },
               location: {
                 type: 'string',
                 description: 'One of the storage locations of the spec, i.e. a location label name (including a deleted one the spec still carries); an empty string when it has none.',
                 example: '託運'
               }
             }
           }
         }
       }
     }
     #swagger.responses[204] = { description: 'Check state stored' }
     #swagger.responses[400] = { description: 'checked is not a boolean, or location is not a string or not one of the locations of the spec' }
     #swagger.responses[404] = { description: 'Occasion, item, or spec not found' } */
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
