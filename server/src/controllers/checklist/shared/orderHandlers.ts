import type { Response } from 'express';

import type { Logger, LogMeta } from '../../../logger';
import type { ReorderResult } from '../../../repositories/checklist/shared/siblingOrder';

import { rejectInvalidBody } from './responses';
import {
  ORDERED_IDS_MISMATCH_ERROR,
  parseMoveBody,
  parseReorderBody,
} from './validation';

/** Inputs of {@link handleReorder}. */
interface ReorderRequest {
  logger: Logger;
  /** Log label of the reordered resource, e.g. `'Template categories'`. */
  label: string;
  body: unknown;
  meta: LogMeta;
  reorder(orderedIds: readonly number[]): Promise<ReorderResult>;
}

/**
 * Validates a reorder body and applies it, responding 204 on success or 400
 * when the body is malformed or does not list every sibling exactly once.
 * Ownership of the parent must be verified by the caller beforehand.
 *
 * @param request - Logger, request body and the repository reorder call.
 * @param res - Outgoing response.
 */
export async function handleReorder(
  { logger, label, body, meta, reorder }: ReorderRequest,
  res: Response,
): Promise<void> {
  const parsed = parseReorderBody(body);
  if (!parsed.ok) {
    rejectInvalidBody(res, logger, 'reorder', parsed.error, meta);
    return;
  }
  if ((await reorder(parsed.value)) === 'invalid_order') {
    rejectInvalidBody(res, logger, 'reorder', ORDERED_IDS_MISMATCH_ERROR, meta);
    return;
  }
  logger.info(`${label} reordered`, { ...meta, count: parsed.value.length });
  res.status(204).send();
}

/** Inputs of {@link parseMoveTarget}. */
interface MoveTargetRequest {
  logger: Logger;
  body: unknown;
  meta: LogMeta;
}

/**
 * Validates an item move body, responding 400 itself when it is invalid.
 *
 * @param request - Logger and request body.
 * @param res - Outgoing response.
 * @returns The target category id, or null when a 400 has been sent.
 */
export function parseMoveTarget(
  { logger, body, meta }: MoveTargetRequest,
  res: Response,
): number | null {
  const parsed = parseMoveBody(body);
  if (!parsed.ok) {
    rejectInvalidBody(res, logger, 'move-item', parsed.error, meta);
    return null;
  }
  return parsed.value;
}
