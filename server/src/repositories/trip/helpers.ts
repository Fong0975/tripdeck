import type { ImageResponse, TripResponse } from '../../types/trip';

import { TripRow } from './types';

export function toDateString(d: Date | string): string {
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toISOString(d: Date | string): string {
  if (typeof d === 'string') {
    return new Date(d).toISOString();
  }
  return d.toISOString();
}

export function toTripResponse(
  row: TripRow,
  images: ImageResponse[] = [],
): TripResponse {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    description: row.description,
    createdAt: toISOString(row.created_at),
    images,
  };
}

/**
 * Returns all dates between startDate and endDate inclusive, as YYYY-MM-DD strings.
 * Used to auto-generate trip days on creation.
 *
 * Date-only strings are parsed as UTC midnight, so stepping must also use the
 * UTC accessors; local `setDate` would shift by the host's DST offset and can
 * skip or repeat a date.
 *
 * @param startDate - First date, `YYYY-MM-DD`.
 * @param endDate - Last date, `YYYY-MM-DD`.
 * @returns Every date in the range, or an empty array when end < start.
 */
export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
