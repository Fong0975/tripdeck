import type { Attraction, ReferenceWebsite } from '@/types';

import { api, json } from './client';

export async function addAttraction(
  tripId: number,
  dayId: number,
  data: {
    name: string;
    googleMapUrl?: string;
    notes?: string;
    nearbyAttractions?: string;
    startTime?: string;
    endTime?: string;
    referenceWebsites?: ReferenceWebsite[];
  },
): Promise<Attraction> {
  return api<Attraction>(`/api/trips/${tripId}/days/${dayId}/attractions`, {
    method: 'POST',
    ...json(data),
  });
}

export async function updateAttraction(
  tripId: number,
  attractionId: number,
  data: {
    name?: string;
    googleMapUrl?: string | null;
    notes?: string | null;
    nearbyAttractions?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    referenceWebsites?: ReferenceWebsite[];
  },
): Promise<Attraction> {
  return api<Attraction>(`/api/trips/${tripId}/attractions/${attractionId}`, {
    method: 'PUT',
    ...json(data),
  });
}

export async function deleteAttraction(
  tripId: number,
  attractionId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/attractions/${attractionId}`, {
    method: 'DELETE',
  });
}

export async function duplicateAttraction(
  tripId: number,
  attractionId: number,
): Promise<Attraction> {
  return api<Attraction>(
    `/api/trips/${tripId}/attractions/${attractionId}/duplicate`,
    { method: 'POST' },
  );
}

export async function reorderAttractions(
  tripId: number,
  dayId: number,
  orderedIds: number[],
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/days/${dayId}/attractions/order`, {
    method: 'PATCH',
    ...json({ orderedIds }),
  });
}
