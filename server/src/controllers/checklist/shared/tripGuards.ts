import type { Response } from 'express';

import type { Logger } from '../../../logger';
import * as checklistRepo from '../../../repositories/checklist/trip';

import { rejectNotFound } from './responses';

/**
 * Responds 404 `Trip not found` when the trip does not exist.
 *
 * @param tripId - Trip id to check.
 * @param res - Response to send the 404 on.
 * @param logger - Logger of the calling controller.
 * @param action - Capitalised request name for the log (e.g. `'Add-occasion'`).
 * @returns True when the trip exists, false when a 404 has been sent.
 */
export async function ensureTripExists(
  tripId: number,
  res: Response,
  logger: Logger,
  action: string,
): Promise<boolean> {
  if (await checklistRepo.tripExists(tripId)) {
    return true;
  }
  const message = `${action} rejected: trip not found`;
  rejectNotFound(res, logger, 'Trip', message, { tripId });
  return false;
}
