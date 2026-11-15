import type {
  MapsConfig,
  MapsErrorReportBody,
  MapsQuotaErrorBody,
  MapsStatus,
  ResolveGeoBody,
  ResolveGeoResult,
} from '@tripdeck/shared';

import { api, apiUrl, json } from './client';

/** The 429 body, which may be missing or malformed. */
type QuotaBody = Partial<MapsQuotaErrorBody>;

/** The backend refused to hand out a map key because today's quota is spent. */
export class MapsQuotaError extends Error {
  readonly resetAt: string | null;

  constructor(resetAt: string | null) {
    super('Daily map quota reached');
    this.name = 'MapsQuotaError';
    this.resetAt = resetAt;
  }
}

export async function getMapsStatus(): Promise<MapsStatus> {
  return api<MapsStatus>('/api/maps/status');
}

/**
 * Fetches the browser API key. Each successful call counts as one map load
 * against today's quota on the backend.
 *
 * @throws MapsQuotaError when the backend answers 429.
 */
export async function getMapsConfig(): Promise<MapsConfig> {
  const url = '/api/maps/config';
  const res = await fetch(apiUrl(url));
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as QuotaBody;
    throw new MapsQuotaError(body.resetAt ?? null);
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  return res.json() as Promise<MapsConfig>;
}

/**
 * Asks the backend to fill in missing coordinates for a trip. Only `dayId`'s
 * gaps may trigger a billable name lookup; other days are resolved from their
 * links alone.
 */
export async function resolveTripGeo(
  tripId: number,
  dayId: number,
): Promise<ResolveGeoResult> {
  return api<ResolveGeoResult>('/api/maps/resolve', {
    method: 'POST',
    ...json({ tripId, dayId } satisfies ResolveGeoBody),
  });
}

/** Tells the backend Google rejected the key, so map loads are paused until the daily reset. */
export async function reportMapsError(): Promise<void> {
  return api<void>('/api/maps/report-error', {
    method: 'POST',
    ...json({ reason: 'auth_failure' } satisfies MapsErrorReportBody),
  });
}
