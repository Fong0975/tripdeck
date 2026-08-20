import type { Trip, TripContent } from '@/types';

import { api, json } from './client';

export async function getTrips(): Promise<Trip[]> {
  return api<Trip[]>('/api/trips/');
}

export async function getTrip(id: number): Promise<Trip | null> {
  try {
    return await api<Trip>(`/api/trips/${id}`);
  } catch {
    return null;
  }
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

export async function deleteTrip(id: number): Promise<void> {
  await api<void>(`/api/trips/${id}`, { method: 'DELETE' });
}

export async function getTripContent(
  tripId: number,
): Promise<TripContent | null> {
  try {
    return await api<TripContent>(`/api/trips/${tripId}/content`);
  } catch {
    return null;
  }
}
