import { FIELD_LIMITS } from '@tripdeck/shared';

import { findTooLongField } from '../../validation/fieldLimits';

import { isMissing } from './connectionValidation';

export const INVALID_WEBSITES_ERROR =
  'referenceWebsites must be an array of { url: string, title: string }';
export const ORDERED_IDS_REQUIRED_ERROR = 'orderedIds array is required';
export const ORDERED_IDS_NOT_POSITIVE_ERROR =
  'orderedIds must contain only positive integers';
export const ORDERED_IDS_MISMATCH_ERROR =
  'orderedIds must list every attraction of the day exactly once';

/**
 * Whether value is a safe integer greater than or equal to `min`.
 *
 * @param value - Raw request value.
 * @param min - Smallest accepted value.
 * @returns True for an integer number (not a numeric string) >= min.
 */
export function isIntegerAtLeast(value: unknown, min: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min
  );
}

/** Whether value is a reference website with string url and title. */
function isReferenceWebsite(
  value: unknown,
): value is { url: string; title: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const site = value as Record<string, unknown>;
  return typeof site.url === 'string' && typeof site.title === 'string';
}

/**
 * Validates the free-form fields shared by attraction create and update
 * bodies: reference website shape and the VARCHAR column lengths.
 *
 * Fields that are absent are not checked, so the same rules serve partial
 * updates; whether `name` is required is decided by the caller.
 *
 * @param body - Raw request body.
 * @returns A client-facing error message, or null when the body is valid.
 */
export function findAttractionBodyError(
  body: Record<string, unknown>,
): string | null {
  const websites = body.referenceWebsites;
  if (
    !isMissing(websites) &&
    (!Array.isArray(websites) || !websites.every(isReferenceWebsite))
  ) {
    return INVALID_WEBSITES_ERROR;
  }
  const sites = (websites ?? []) as { title: string }[];
  const websiteTitles = sites.map((site, i): [string, unknown, number] => [
    `referenceWebsites[${i}].title`,
    site.title,
    FIELD_LIMITS.name,
  ]);

  return findTooLongField([
    ['name', body.name, FIELD_LIMITS.name],
    ['startTime', body.startTime, FIELD_LIMITS.time],
    ['endTime', body.endTime, FIELD_LIMITS.time],
    ...websiteTitles,
  ]);
}

export type OrderedIdsResolution =
  { ok: true; orderedIds: number[] } | { ok: false; error: string };

/**
 * Validates the shape of a reorder request's `orderedIds`. Whether the ids
 * match the day's attractions is checked by the repository inside its
 * transaction.
 *
 * @param orderedIds - Raw `orderedIds` from the request body.
 * @returns The ids when they form an array of positive integers, or the
 *   client-facing error describing why they do not.
 */
export function resolveOrderedIds(orderedIds: unknown): OrderedIdsResolution {
  if (!Array.isArray(orderedIds)) {
    return { ok: false, error: ORDERED_IDS_REQUIRED_ERROR };
  }
  if (!orderedIds.every(id => isIntegerAtLeast(id, 1))) {
    return { ok: false, error: ORDERED_IDS_NOT_POSITIVE_ERROR };
  }
  return { ok: true, orderedIds };
}
