import { FIELD_LIMITS, TRANSPORT_MODES } from '@tripdeck/shared';

import { parseId } from '../../utils/parseId';
import { findTooLongField } from '../../validation/fieldLimits';

export const INVALID_ENDPOINT_IDS_ERROR =
  'fromAttractionId and toAttractionId must be positive integers';
export const SAME_ENDPOINT_ERROR =
  'fromAttractionId and toAttractionId must be different';
export const ENDPOINTS_NOT_IN_DAY_ERROR =
  'fromAttractionId and toAttractionId must be attractions of the same day';
export const INVALID_TRANSPORT_MODE_ERROR = `transportMode must be one of: ${TRANSPORT_MODES.join(', ')}`;

/** Origin and destination attraction ids of a connection. */
export interface EndpointIds {
  fromAttractionId: number;
  toAttractionId: number;
}

/**
 * Whether an optional request body field was left out (undefined or null).
 *
 * @param value - Raw body field.
 * @returns True when the field carries no value.
 */
export function isMissing(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

/**
 * Checks the free-text connection fields that are stored in VARCHAR columns.
 *
 * @param body - Raw request body; only `duration` is length-limited
 *   (`route` and `notes` are TEXT, `transportMode` is an enum).
 * @returns A client-facing error, or null when every field fits.
 */
export function findTooLongConnectionField(body: {
  duration?: unknown;
}): string | null {
  return findTooLongField([['duration', body.duration, FIELD_LIMITS.duration]]);
}

export type EndpointResolution =
  { ok: true; endpoints: EndpointIds } | { ok: false; error: string };

/**
 * Parses and validates the endpoint attraction ids of a connection.
 *
 * @param rawFrom - Raw `fromAttractionId` from the request body.
 * @param rawTo - Raw `toAttractionId` from the request body.
 * @param current - Existing endpoints used for any id that is null/undefined
 *   (partial update). When omitted, a missing id is rejected.
 * @returns The parsed endpoints, or the client-facing error describing why
 *   they are invalid (non-positive-integer ids, or origin equals destination).
 */
export function resolveEndpoints(
  rawFrom: unknown,
  rawTo: unknown,
  current?: EndpointIds,
): EndpointResolution {
  const fromAttractionId = isMissing(rawFrom)
    ? (current?.fromAttractionId ?? null)
    : parseId(rawFrom);
  const toAttractionId = isMissing(rawTo)
    ? (current?.toAttractionId ?? null)
    : parseId(rawTo);

  if (fromAttractionId === null || toAttractionId === null) {
    return { ok: false, error: INVALID_ENDPOINT_IDS_ERROR };
  }
  if (fromAttractionId === toAttractionId) {
    return { ok: false, error: SAME_ENDPOINT_ERROR };
  }
  return { ok: true, endpoints: { fromAttractionId, toAttractionId } };
}
