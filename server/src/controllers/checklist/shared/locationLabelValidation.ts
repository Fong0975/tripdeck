import { FIELD_LIMITS } from '@tripdeck/shared';

import { findTooLongField } from '../../../validation/fieldLimits';

import { NAME_REQUIRED_ERROR, type Validated } from './validation';

export const LABEL_NAME_CHARACTERS_ERROR = 'name must not contain "," or "|"';
export const SHOW_AS_GROUP_REQUIRED_ERROR = 'show_as_group must be a boolean';
export const UNKNOWN_LOCATION_ERROR =
  'storage_location contains a location label that is not defined';
export const LABEL_EXISTS_ERROR = 'a location label with this name exists';

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/**
 * Validates the body of a create-location-label request.
 *
 * @param body - Raw request body.
 * @returns The trimmed name and `show_as_group` (default true), or the
 *   client-facing error. `,` and `|` are rejected because they separate
 *   locations in `storage_location` and check keys.
 */
export function parseLocationLabelCreate(
  body: unknown,
): Validated<{ name: string; showAsGroup: boolean }> {
  const { name, show_as_group } = asRecord(body);
  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, error: NAME_REQUIRED_ERROR };
  }
  const trimmed = name.trim();
  if (/[,|]/.test(trimmed)) {
    return { ok: false, error: LABEL_NAME_CHARACTERS_ERROR };
  }
  const tooLong = findTooLongField([
    ['name', trimmed, FIELD_LIMITS.locationLabel],
  ]);
  if (tooLong) {
    return { ok: false, error: tooLong };
  }
  if (show_as_group !== undefined && typeof show_as_group !== 'boolean') {
    return { ok: false, error: SHOW_AS_GROUP_REQUIRED_ERROR };
  }
  return {
    ok: true,
    value: { name: trimmed, showAsGroup: show_as_group ?? true },
  };
}

/**
 * Validates the body of an update-location-label request.
 *
 * @param body - Raw request body.
 * @returns The new `show_as_group` value, or the client-facing error.
 */
export function parseLocationLabelUpdate(body: unknown): Validated<boolean> {
  const { show_as_group } = asRecord(body);
  if (typeof show_as_group !== 'boolean') {
    return { ok: false, error: SHOW_AS_GROUP_REQUIRED_ERROR };
  }
  return { ok: true, value: show_as_group };
}
