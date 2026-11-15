import {
  type ChecklistItemBody,
  type ChecklistSpecBody,
  FIELD_LIMITS,
  type UpdateTripChecklistItemBody,
} from '@tripdeck/shared';

import { findTooLongField } from '../../../validation/fieldLimits';

export const NAME_REQUIRED_ERROR = 'name is required';
export const INVALID_QUANTITY_ERROR = 'quantity must be a non-negative integer';

/** Largest value a signed MySQL `INT` column (checklist `quantity`) holds. */
const MAX_QUANTITY = 2_147_483_647;

/** Outcome of validating a request body: the parsed value or a client-facing error. */
export type Validated<T> =
  { ok: true; value: T } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

function isValidQuantity(quantity: unknown): boolean {
  return (
    quantity === undefined ||
    quantity === null ||
    (typeof quantity === 'number' &&
      Number.isInteger(quantity) &&
      quantity >= 0 &&
      quantity <= MAX_QUANTITY)
  );
}

/**
 * Checks the optional item/spec fields shared by every checklist write.
 *
 * @param quantity - Raw `quantity`; must be omitted, null or a non-negative integer.
 * @param storageLocation - Raw `storage_location`; must fit its VARCHAR column.
 * @returns A client-facing error, or null when both fields are acceptable.
 */
function findOptionalFieldError(
  quantity: unknown,
  storageLocation: unknown,
): string | null {
  if (!isValidQuantity(quantity)) {
    return INVALID_QUANTITY_ERROR;
  }
  return findTooLongField([
    ['storage_location', storageLocation, FIELD_LIMITS.storageLocation],
  ]);
}

/**
 * Extracts a required `name` from a request body.
 *
 * @param body - Raw request body.
 * @returns The name (unmodified) when it is a string containing at least one
 *   non-whitespace character and fits its VARCHAR column; otherwise the
 *   client-facing error (`name is required` or a too-long message).
 */
export function requireName(body: unknown): Validated<string> {
  const { name } = asRecord(body);
  if (typeof name !== 'string' || name.trim() === '') {
    return invalid(NAME_REQUIRED_ERROR);
  }
  const tooLong = findTooLongField([['name', name, FIELD_LIMITS.name]]);
  return tooLong ? invalid(tooLong) : { ok: true, value: name };
}

/**
 * Validates a full checklist item body (create, or template-item update).
 * Optional fields are always present as keys so the repository treats an
 * omitted field as "clear it".
 *
 * @param body - Raw request body.
 * @returns The item fields, or the first client-facing validation error.
 */
export function parseItemFields(body: unknown): Validated<ChecklistItemBody> {
  const name = requireName(body);
  if (!name.ok) {
    return name;
  }
  const { quantity, notes, storage_location } = asRecord(
    body,
  ) as Partial<ChecklistItemBody>;
  const error = findOptionalFieldError(quantity, storage_location);
  if (error) {
    return invalid(error);
  }
  return {
    ok: true,
    value: { name: name.value, quantity, notes, storage_location },
  };
}

/**
 * Validates an item spec body (create or update). `storage_location` is
 * always present as a key so the repository treats an omitted value as
 * "clear it".
 *
 * @param body - Raw request body.
 * @returns The spec fields, or the first client-facing validation error.
 */
export function parseSpecFields(body: unknown): Validated<ChecklistSpecBody> {
  const name = requireName(body);
  if (!name.ok) {
    return name;
  }
  const { storage_location } = asRecord(body) as Partial<ChecklistSpecBody>;
  const error = findOptionalFieldError(undefined, storage_location);
  if (error) {
    return invalid(error);
  }
  return { ok: true, value: { name: name.value, storage_location } };
}

/**
 * Validates a partial trip-item update. Only the fields present in the body
 * are copied, so the repository leaves omitted fields unchanged; a present
 * `name` must still be a non-blank string.
 *
 * @param body - Raw request body.
 * @returns The fields to update, or the first client-facing validation error.
 */
export function parseTripItemPatch(
  body: unknown,
): Validated<UpdateTripChecklistItemBody> {
  const record = asRecord(body);
  const { quantity, notes, storage_location } =
    record as Partial<UpdateTripChecklistItemBody>;
  const patch: UpdateTripChecklistItemBody = {};

  if ('name' in record) {
    const name = requireName(record);
    if (!name.ok) {
      return name;
    }
    patch.name = name.value;
  }
  const error = findOptionalFieldError(quantity, storage_location);
  if (error) {
    return invalid(error);
  }
  if ('quantity' in record) {
    patch.quantity = quantity;
  }
  if ('notes' in record) {
    patch.notes = notes;
  }
  if ('storage_location' in record) {
    patch.storage_location = storage_location;
  }
  return { ok: true, value: patch };
}
