import type { Request, Response } from 'express';

import type { Logger } from '../../../logger';
import type { CreateItemBody } from '../../../types/checklist';
import { idParams } from '../params';

import { rejectInvalidName, rejectNotFound } from './responses';
import { pickItemFields, requireName } from './validation';

/**
 * Storage operations and log settings that let the template and trip
 * checklists share the same item request flows.
 */
export interface ItemStore<TUpdate extends object> {
  logger: Logger;
  /** Log label for the resource, e.g. `'Template item'`. */
  label: string;
  /** Route param scoping item ownership: `'catId'` or `'tripId'`. */
  parentParam: string;
  /**
   * Optional ownership check for the target category, run before the body
   * is validated. Without it, `create` reports a missing category as null.
   */
  verifyCategory?: (catId: number, parentId: number) => Promise<boolean>;
  create(catId: number, data: CreateItemBody): Promise<{ id: number } | null>;
  /** Validates an update body, returning null when the name is invalid. */
  parseUpdate(body: unknown): TUpdate | null;
  verifyItem(itemId: number, parentId: number): Promise<boolean>;
  update(itemId: number, data: TUpdate): Promise<object | null>;
  remove(itemId: number): Promise<boolean>;
}

/**
 * Creates an item in the `:catId` category, responding 201 with the item,
 * 400 for an invalid name or 404 when the category is missing.
 *
 * @param store - Template or trip item storage.
 * @param req - Incoming request.
 * @param res - Outgoing response.
 */
export async function handleAddItem<TUpdate extends object>(
  store: ItemStore<TUpdate>,
  req: Request,
  res: Response,
): Promise<void> {
  const { logger } = store;
  const meta = idParams(req, store.parentParam, 'catId');
  const catId = meta.catId;
  const categoryMissingMessage = 'Add-item rejected: category not found';
  if (
    store.verifyCategory &&
    !(await store.verifyCategory(catId, meta[store.parentParam]))
  ) {
    rejectNotFound(res, logger, 'Category', categoryMissingMessage, meta);
    return;
  }
  const name = requireName(req.body);
  if (name === null) {
    rejectInvalidName(res, logger, 'add-item', meta);
    return;
  }
  const item = await store.create(catId, pickItemFields(req.body, name));
  if (!item) {
    rejectNotFound(res, logger, 'Category', categoryMissingMessage, meta);
    return;
  }
  logger.info(`${store.label} created`, { ...meta, itemId: item.id });
  res.status(201).json(item);
}

/**
 * Updates the `:itemId` item, responding 200 with the item, 400 when
 * `parseUpdate` rejects the body or 404 when the item is missing.
 *
 * @param store - Template or trip item storage.
 * @param req - Incoming request.
 * @param res - Outgoing response.
 */
export async function handleUpdateItem<TUpdate extends object>(
  store: ItemStore<TUpdate>,
  req: Request,
  res: Response,
): Promise<void> {
  const { logger } = store;
  const meta = idParams(req, store.parentParam, 'itemId');
  const itemId = meta.itemId;
  const data = store.parseUpdate(req.body);
  if (data === null) {
    rejectInvalidName(res, logger, 'update-item', meta);
    return;
  }
  if (!(await store.verifyItem(itemId, meta[store.parentParam]))) {
    const message = 'Update-item rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  const item = await store.update(itemId, data);
  if (!item) {
    const message = 'Update-item rejected: item not found on update';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  logger.info(`${store.label} updated`, {
    ...meta,
    fields: Object.keys(data),
  });
  res.json(item);
}

/**
 * Deletes the `:itemId` item, responding 204 or 404 when the item is missing.
 *
 * @param store - Template or trip item storage.
 * @param req - Incoming request.
 * @param res - Outgoing response.
 */
export async function handleDeleteItem<TUpdate extends object>(
  store: ItemStore<TUpdate>,
  req: Request,
  res: Response,
): Promise<void> {
  const { logger } = store;
  const meta = idParams(req, store.parentParam, 'itemId');
  const itemId = meta.itemId;
  if (!(await store.verifyItem(itemId, meta[store.parentParam]))) {
    const message = 'Delete-item rejected: item not found';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  if (!(await store.remove(itemId))) {
    const message = 'Delete-item rejected: item not found on delete';
    rejectNotFound(res, logger, 'Item', message, meta);
    return;
  }
  logger.info(`${store.label} deleted`, meta);
  res.status(204).send();
}
