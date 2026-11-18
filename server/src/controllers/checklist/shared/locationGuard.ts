import type { Response } from 'express';

import type { Logger, LogMeta } from '../../../logger';

import { UNKNOWN_LOCATION_ERROR } from './locationLabelValidation';
import { rejectInvalidBody } from './responses';

/**
 * Responds 400 when a write files a unit under a location name it may not
 * use (see `findDisallowedLocation`).
 *
 * @param res - Response to send the 400 on.
 * @param logger - Logger of the calling controller.
 * @param action - Kebab-case request name for the log (e.g. `'add-item'`).
 * @param meta - Ids identifying the request.
 * @param location - Raw `storage_location` of the write.
 * @param findDisallowed - Store lookup returning the first disallowed name.
 * @returns True when a 400 has been sent.
 */
export async function rejectDisallowedLocation(
  res: Response,
  logger: Logger,
  action: string,
  meta: LogMeta,
  location: string | null | undefined,
  findDisallowed: (
    location: string | null | undefined,
  ) => Promise<string | null>,
): Promise<boolean> {
  const disallowed = await findDisallowed(location);
  if (!disallowed) {
    return false;
  }
  rejectInvalidBody(
    res,
    logger,
    action,
    `${UNKNOWN_LOCATION_ERROR}: ${disallowed}`,
    meta,
  );
  return true;
}
