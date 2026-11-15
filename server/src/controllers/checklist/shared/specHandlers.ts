import type { ChecklistSpecBody, ItemSpec } from '@tripdeck/shared';
import type { Request, Response } from 'express';

import type { Logger } from '../../../logger';
import { idParams } from '../params';

import { rejectInvalidBody, rejectNotFound } from './responses';
import { parseSpecFields } from './validation';

/**
 * Storage operations and log settings that let the template and trip
 * checklists share the same item spec request flows.
 */
export interface SpecStore {
  logger: Logger;
  /** Log label for the resource, e.g. `'Template item spec'`. */
  label: string;
  /** Route param scoping item ownership: `'catId'` or `'tripId'`. */
  parentParam: string;
  verifyItem(itemId: number, parentId: number): Promise<boolean>;
  verifySpec(specId: number, itemId: number): Promise<boolean>;
  create(itemId: number, data: ChecklistSpecBody): Promise<ItemSpec | null>;
  update(specId: number, data: ChecklistSpecBody): Promise<ItemSpec | null>;
  remove(specId: number): Promise<boolean>;
}

/**
 * Responds 404 unless the item belongs to its parent and the spec belongs to
 * the item.
 *
 * @param store - Template or trip spec storage.
 * @param res - Response to send the 404 on.
 * @param action - Capitalised request name for the log (e.g. `'Update-spec'`).
 * @param meta - Route ids: the parent param, `itemId` and `specId`.
 * @returns True when both checks pass, false when a 404 has been sent.
 */
async function ensureSpecInItem(
  store: SpecStore,
  res: Response,
  action: string,
  meta: Record<string, number>,
): Promise<boolean> {
  const { logger } = store;
  if (!(await store.verifyItem(meta.itemId, meta[store.parentParam]))) {
    const message = `${action} rejected: item not found`;
    rejectNotFound(res, logger, 'Item', message, meta);
    return false;
  }
  if (!(await store.verifySpec(meta.specId, meta.itemId))) {
    const message = `${action} rejected: spec not found`;
    rejectNotFound(res, logger, 'Spec', message, meta);
    return false;
  }
  return true;
}

/**
 * Creates a spec on the `:itemId` item, responding 201 with the spec, 400 for
 * an invalid body or 404 when the item is missing.
 *
 * @param store - Template or trip spec storage.
 * @param req - Incoming request.
 * @param res - Outgoing response.
 */
export async function handleAddSpec(
  store: SpecStore,
  req: Request,
  res: Response,
): Promise<void> {
  const { logger } = store;
  const meta = idParams(req, store.parentParam, 'itemId');
  const itemId = meta.itemId;
  const fields = parseSpecFields(req.body);
  if (!fields.ok) {
    rejectInvalidBody(res, logger, 'add-spec', fields.error, meta);
    return;
  }
  if (!(await store.verifyItem(itemId, meta[store.parentParam]))) {
    const message = 'Add-spec rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  const spec = await store.create(itemId, fields.value);
  if (!spec) {
    const message = 'Add-spec rejected: item not found on create';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  logger.info(`${store.label} created`, { ...meta, specId: spec.id });
  res.status(201).json(spec);
}

/**
 * Updates the `:specId` spec, responding 200 with the spec, 400 for an
 * invalid body or 404 when the item or spec is missing.
 *
 * @param store - Template or trip spec storage.
 * @param req - Incoming request.
 * @param res - Outgoing response.
 */
export async function handleUpdateSpec(
  store: SpecStore,
  req: Request,
  res: Response,
): Promise<void> {
  const { logger } = store;
  const meta = idParams(req, store.parentParam, 'itemId', 'specId');
  const fields = parseSpecFields(req.body);
  if (!fields.ok) {
    rejectInvalidBody(res, logger, 'update-spec', fields.error, meta);
    return;
  }
  if (!(await ensureSpecInItem(store, res, 'Update-spec', meta))) {
    return;
  }
  const spec = await store.update(meta.specId, fields.value);
  if (!spec) {
    const message = 'Update-spec rejected: spec not found on update';
    rejectNotFound(res, logger, 'Spec', message, meta);
    return;
  }
  logger.info(`${store.label} updated`, meta);
  res.json(spec);
}

/**
 * Deletes the `:specId` spec, responding 204 or 404 when the item or spec is
 * missing.
 *
 * @param store - Template or trip spec storage.
 * @param req - Incoming request.
 * @param res - Outgoing response.
 */
export async function handleDeleteSpec(
  store: SpecStore,
  req: Request,
  res: Response,
): Promise<void> {
  const { logger } = store;
  const meta = idParams(req, store.parentParam, 'itemId', 'specId');
  if (!(await ensureSpecInItem(store, res, 'Delete-spec', meta))) {
    return;
  }
  if (!(await store.remove(meta.specId))) {
    const message = 'Delete-spec rejected: spec not found on delete';
    rejectNotFound(res, logger, 'Spec', message, meta);
    return;
  }
  logger.info(`${store.label} deleted`, meta);
  res.status(204).send();
}
