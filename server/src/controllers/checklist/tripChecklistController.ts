import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as checklistRepo from '../../repositories/checklist/trip';

import { idParam } from './params';
import { rejectNotFound } from './shared/responses';
import { ensureTripExists } from './shared/tripGuards';

const logger = createLogger('checklist-trip');

export async function getTripChecklist(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Get the packing checklist for a trip'
     #swagger.description = 'Returns the trip checklist, which is built from the global template when the trip is created. Read-only: a trip without a checklist (e.g. created before this behaviour) returns empty categories and occasions.'
     #swagger.responses[200] = {
       description: 'Trip checklist',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               tripId: { type: 'integer', example: 1 },
               categories: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '3C 電子' },
                     items: {
                       type: 'array',
                       items: {
                         type: 'object',
                         properties: {
                           id: { type: 'integer', example: 7 },
                           name: { type: 'string', example: '充電器' },
                           quantity: { type: 'integer', nullable: true, example: 2 },
                           notes: { type: 'string', nullable: true, example: '手機＋相機充電器各一' },
                           storage_location: { type: 'string', nullable: true, example: '後背包' },
                           specs: {
                             type: 'array',
                             items: {
                               type: 'object',
                               properties: {
                                 id: { type: 'integer', example: 1 },
                                 name: { type: 'string', example: 'Type-C 充電器' },
                                 storage_location: { type: 'string', nullable: true, example: '後背包' }
                               }
                             }
                           }
                         }
                       }
                     }
                   }
                 }
               },
               occasions: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     id: { type: 'integer', example: 1 },
                     name: { type: 'string', example: '收拾' },
                     checks: {
                       type: 'object',
                       description: 'Keys are `<itemId>|<location>` (location is the name of a location label, including a deleted one the unit still carries, or empty for an item without a storage location); only checked entries are present.',
                       additionalProperties: { type: 'boolean' },
                       example: { '3|託運': true, '3|隨身': true, '7|': true }
                     },
                     specChecks: {
                       type: 'object',
                       description: 'Keys are `<specId>|<location>`; only checked entries are present.',
                       additionalProperties: { type: 'boolean' },
                       example: { '11|託運': true }
                     }
                   }
                 }
               }
             }
           }
         }
       }
     } */
  const tripId = idParam(req, 'tripId');
  const checklist = await checklistRepo.findChecklist(tripId);
  if (checklist) {
    res.json(checklist);
    return;
  }
  if (!(await ensureTripExists(tripId, res, logger, 'Get-checklist'))) {
    return;
  }
  res.json({ tripId, categories: [], occasions: [] });
}

export async function syncTripChecklist(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trip Checklist']
     #swagger.summary = 'Copy the global template into a trip that has no checklist categories'
     #swagger.description = 'Used by trips without a checklist (created before checklists were built at trip creation, or whose categories were all deleted). Returns the resulting checklist, same shape as GET. Rejected with 409 when the trip already has categories, so the template can only be synced into an empty checklist.'
     #swagger.responses[200] = { description: 'Template synced; the trip checklist' }
     #swagger.responses[404] = { description: 'Trip not found' }
     #swagger.responses[409] = { description: 'The trip checklist already has categories' } */
  const tripId = idParam(req, 'tripId');
  const result = await checklistRepo.syncChecklistFromTemplate(tripId);
  if (result === 'not_found') {
    const message = 'Sync-checklist rejected: trip not found';
    rejectNotFound(res, logger, 'Trip', message, { tripId });
    return;
  }
  if (result === 'has_categories') {
    logger.warn('Sync-checklist rejected: checklist already has categories', {
      tripId,
    });
    res.status(409).json({ error: 'Checklist already has categories' });
    return;
  }
  res.json(await checklistRepo.findChecklist(tripId));
}
