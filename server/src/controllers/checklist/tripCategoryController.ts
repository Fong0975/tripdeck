import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/checklist/trip';

import { idParam, idParams } from './params';
import { rejectInvalidBody, rejectNotFound } from './shared/responses';
import { ensureTripExists } from './shared/tripGuards';
import { requireName } from './shared/validation';

const logger = createLogger('checklist-trip');

export async function addTripCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Add a category to a trip checklist'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name' } */
  const tripId = idParam(req, 'tripId');
  const name = requireName(req.body);
  if (!name.ok) {
    rejectInvalidBody(res, logger, 'add-category', name.error, { tripId });
    return;
  }
  if (!(await ensureTripExists(tripId, res, logger, 'Add-category'))) {
    return;
  }
  const category = await tripRepo.createTripCategory(tripId, name.value);
  logger.info('Trip checklist category created', {
    tripId,
    catId: category.id,
  });
  res.status(201).json(category);
}

export async function updateTripCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Update a trip checklist category name'
     #swagger.responses[400] = { description: 'Missing, blank, or too long name' } */
  const meta = idParams(req, 'tripId', 'catId');
  const { tripId, catId } = meta;
  const name = requireName(req.body);
  if (!name.ok) {
    rejectInvalidBody(res, logger, 'update-category', name.error, meta);
    return;
  }
  if (!(await tripRepo.verifyCategoryBelongsToTrip(catId, tripId))) {
    const message = 'Update-category rejected: category not found';
    rejectNotFound(res, logger, 'Category', message, meta);
    return;
  }
  if (!(await tripRepo.updateTripCategory(catId, name.value))) {
    const message = 'Update-category rejected: category not found on update';
    rejectNotFound(res, logger, 'Category', message, meta);
    return;
  }
  res.status(204).send();
}

export async function deleteTripCategory(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Delete a trip checklist category and all its items' */
  const meta = idParams(req, 'tripId', 'catId');
  const { tripId, catId } = meta;
  if (!(await tripRepo.verifyCategoryBelongsToTrip(catId, tripId))) {
    const message = 'Delete-category rejected: category not found';
    rejectNotFound(res, logger, 'Category', message, meta);
    return;
  }
  if (!(await tripRepo.deleteTripCategory(catId))) {
    const message = 'Delete-category rejected: category not found on delete';
    rejectNotFound(res, logger, 'Category', message, meta);
    return;
  }
  logger.info('Trip checklist category deleted', meta);
  res.status(204).send();
}
