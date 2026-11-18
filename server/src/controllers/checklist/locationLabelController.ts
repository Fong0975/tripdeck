import type { LocationLabelsResponse } from '@tripdeck/shared';
import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as labelRepo from '../../repositories/checklist/locationLabelRepository';

import { idParams } from './params';
import {
  LABEL_EXISTS_ERROR,
  parseLocationLabelCreate,
  parseLocationLabelUpdate,
} from './shared/locationLabelValidation';
import { handleReorder } from './shared/orderHandlers';
import { rejectInvalidBody, rejectNotFound } from './shared/responses';

const logger = createLogger('checklist-location');

export async function getLocationLabels(
  _req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Locations']
     #swagger.summary = 'List the location labels and the deleted labels that trips still use'
     #swagger.description = 'orphans lists names that trip checklist units are still filed under although no label with that name exists; re-creating a label with the same name makes them refer to it again.'
     #swagger.responses[200] = {
       description: 'Labels in display order and the still-used deleted names',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               labels: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '託運' },
                     show_as_group: { type: 'boolean', example: true },
                     sort_order: { type: 'integer', example: 0 }
                   }
                 }
               },
               orphans: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     name: { type: 'string', example: '手提' },
                     trip_count: { type: 'integer', example: 2 }
                   }
                 }
               }
             }
           }
         }
       }
     } */
  const labels = await labelRepo.listLocationLabels();
  const orphans = await labelRepo.listOrphanLocations(
    labels.map(label => label.name),
  );
  const body: LocationLabelsResponse = { labels, orphans };
  res.json(body);
}

export async function addLocationLabel(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Locations']
     #swagger.summary = 'Add a location label'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['name'],
             properties: {
               name: { type: 'string', example: '手提' },
               show_as_group: { type: 'boolean', example: true }
             }
           }
         }
       }
     }
     #swagger.responses[201] = { description: 'Label created' }
     #swagger.responses[400] = { description: 'Missing, blank or too long name, name containing "," or "|", or show_as_group not a boolean' }
     #swagger.responses[409] = { description: 'A label with this name already exists' } */
  const parsed = parseLocationLabelCreate(req.body);
  if (!parsed.ok) {
    rejectInvalidBody(res, logger, 'add-location-label', parsed.error);
    return;
  }
  const result = await labelRepo.createLocationLabel(
    parsed.value.name,
    parsed.value.showAsGroup,
  );
  if (result.status === 'duplicate') {
    logger.warn('Add-location-label rejected: name exists', {
      name: parsed.value.name,
    });
    res.status(409).json({ error: LABEL_EXISTS_ERROR });
    return;
  }
  logger.info('Location label created', { labelId: result.label.id });
  res.status(201).json(result.label);
}

export async function updateLocationLabel(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Locations']
     #swagger.summary = 'Change whether a location label is its own group in the storage view'
     #swagger.description = 'Labels cannot be renamed: delete the label and add one with the new name instead.'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             required: ['show_as_group'],
             properties: { show_as_group: { type: 'boolean', example: false } }
           }
         }
       }
     }
     #swagger.responses[200] = { description: 'Label updated' }
     #swagger.responses[400] = { description: 'show_as_group is not a boolean' }
     #swagger.responses[404] = { description: 'Label not found' } */
  const meta = idParams(req, 'labelId');
  const parsed = parseLocationLabelUpdate(req.body);
  if (!parsed.ok) {
    rejectInvalidBody(res, logger, 'update-location-label', parsed.error, meta);
    return;
  }
  const label = await labelRepo.setLocationLabelShowAsGroup(
    meta.labelId,
    parsed.value,
  );
  if (!label) {
    rejectNotFound(
      res,
      logger,
      'Location label',
      'Update-location-label rejected: label not found',
      meta,
    );
    return;
  }
  logger.info('Location label updated', meta);
  res.json(label);
}

export async function reorderLocationLabels(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Locations']
     #swagger.summary = 'Reorder the location labels'
     #swagger.description = 'orderedIds must list every label exactly once.'
     #swagger.responses[204] = { description: 'Labels reordered' }
     #swagger.responses[400] = { description: 'orderedIds is not an array of positive integers, or does not list every label exactly once' } */
  await handleReorder(
    {
      logger,
      label: 'Location labels',
      body: req.body,
      meta: {},
      reorder: labelRepo.reorderLocationLabels,
    },
    res,
  );
}

export async function deleteLocationLabel(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Checklist Locations']
     #swagger.summary = 'Delete a location label'
     #swagger.description = 'The name is removed from the checklist template. Trip checklists keep it: their units stay filed under the name and keep their checks, but the name cannot be added to a unit again unless a label with the same name is re-created.'
     #swagger.responses[204] = { description: 'Label deleted' }
     #swagger.responses[404] = { description: 'Label not found' } */
  const meta = idParams(req, 'labelId');
  if (!(await labelRepo.deleteLocationLabel(meta.labelId))) {
    rejectNotFound(
      res,
      logger,
      'Location label',
      'Delete-location-label rejected: label not found',
      meta,
    );
    return;
  }
  logger.info('Location label deleted', meta);
  res.status(204).send();
}
