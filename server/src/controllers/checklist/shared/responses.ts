import type { Response } from 'express';

import type { Logger, LogMeta } from '../../../logger';

/** Checklist resources that can be reported as missing. */
export type ChecklistEntity =
  'Trip' | 'Category' | 'Item' | 'Spec' | 'Occasion';

/**
 * Logs and sends `400 { error }` for a request body that failed validation.
 *
 * @param res - Response to send on.
 * @param logger - Logger of the calling controller.
 * @param action - Kebab-case request name for the log (e.g. `'add-item'`).
 * @param error - Client-facing validation error (e.g. `'name is required'`).
 * @param meta - Ids identifying the request.
 */
export function rejectInvalidBody(
  res: Response,
  logger: Logger,
  action: string,
  error: string,
  meta?: LogMeta,
): void {
  logger.warn(`Rejected ${action} request: ${error}`, meta);
  res.status(400).json({ error });
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
