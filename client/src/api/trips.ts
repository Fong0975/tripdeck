import type { Trip, TripContent } from '@/types';

import { api, ApiError, json } from './client';

/** Whether `err` is the error {@link api} throws for an HTTP 404 response. */
function isNotFoundError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

/**
 * Runs `request`, mapping a 404 response to `null` so callers can treat a
 * missing resource as "not found" while every other failure (5xx, network)
 * still propagates.
 */
async function nullIfNotFound<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (err) {
    if (isNotFoundError(err)) {
      return null;
    }
    throw err;
  }
}

export async function getTrips(): Promise<Trip[]> {
  return api<Trip[]>('/api/trips/');
}

/**
 * Fetches a single trip.
 * @returns The trip, or `null` when it doesn't exist (404).
 * @throws For any other failure (server error, network error).
 */
export async function getTrip(id: number): Promise<Trip | null> {
  return nullIfNotFound(api<Trip>(`/api/trips/${id}`));
}

export async function createTrip(data: {
  title: string;
  destination?: string;
  startDate: string;
  endDate: string;
  description?: string;
}): Promise<Trip> {
  return api<Trip>('/api/trips/', { method: 'POST', ...json(data) });
}

export interface UpdateTripData {
  title?: string;
  destination?: string | null;
  startDate?: string;
  endDate?: string;
  description?: string | null;
}

export async function updateTrip(
  id: number,
  data: UpdateTripData,
): Promise<Trip> {
  return api<Trip>(`/api/trips/${id}`, { method: 'PUT', ...json(data) });
}

export async function deleteTrip(id: number): Promise<void> {
  await api<void>(`/api/trips/${id}`, { method: 'DELETE' });
}

/**
 * Fetches a trip's itinerary content.
 * @returns The content, or `null` when the trip doesn't exist (404).
 * @throws For any other failure (server error, network error).
 */
export async function getTripContent(
  tripId: number,
): Promise<TripContent | null> {
  return nullIfNotFound(api<TripContent>(`/api/trips/${tripId}/content`));
}
