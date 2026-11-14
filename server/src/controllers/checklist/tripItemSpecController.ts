import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';

import {
  handleAddSpec,
  handleDeleteSpec,
  handleUpdateSpec,
  type SpecStore,
} from './shared/specHandlers';

/** Trip item specs are scoped by the item's `:tripId` trip. */
const tripSpecs: SpecStore = {
  logger: createLogger('checklist-trip'),
  label: 'Trip checklist item spec',
  parentParam: 'tripId',
  verifyItem: tripRepo.verifyItemBelongsToTrip,
  verifySpec: tripRepo.verifyTripSpecBelongsToItem,
  create: tripRepo.createTripItemSpec,
  update: tripRepo.updateTripItemSpec,
  remove: tripRepo.deleteTripItemSpec,
};

export async function addTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add a spec to a trip checklist item' */
  await handleAddSpec(tripSpecs, req, res);
}

export async function updateTripItemSpec(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update a trip checklist item spec' */
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
