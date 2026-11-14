import type { Response } from 'express';

import type { Logger, LogMeta } from '../../../logger';

/** Checklist resources that can be reported as missing. */
export type ChecklistEntity =
  'Trip' | 'Category' | 'Item' | 'Spec' | 'Occasion';

/**
 * Logs and sends `400 { error: 'name is required' }`.
 *
 * @param res - Response to send on.
 * @param logger - Logger of the calling controller.
 * @param action - Kebab-case request name for the log (e.g. `'add-item'`).
 * @param meta - Ids identifying the request.
 */
export function rejectInvalidName(
  res: Response,
  logger: Logger,
  action: string,
  meta?: LogMeta,
): void {
  logger.warn(`Rejected ${action} request with an invalid name`, meta);
  res.status(400).json({ error: 'name is required' });
}

/**
 * Logs and sends `404 { error: '<entity> not found' }`.
 *
 * @param res - Response to send on.
 * @param logger - Logger of the calling controller.
 * @param entity - The missing resource.
 * @param message - Log message explaining which check failed.
 * @param meta - Ids identifying the request.
 */
export function rejectNotFound(
  res: Response,
  logger: Logger,
  entity: ChecklistEntity,
  message: string,
  meta?: LogMeta,
): void {
  logger.warn(message, meta);
  res.status(404).json({ error: `${entity} not found` });
}
