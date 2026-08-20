import type { DayLocation } from '@/types';

import { api, json } from './client';

export async function addDayLocation(
  tripId: number,
  dayId: number,
  name: string,
): Promise<DayLocation> {
  return api<DayLocation>(`/api/trips/${tripId}/days/${dayId}/locations`, {
    method: 'POST',
    ...json({ name }),
  });
}

export async function updateDayLocation(
  tripId: number,
  locationId: number,
  name: string,
): Promise<DayLocation> {
  return api<DayLocation>(`/api/trips/${tripId}/locations/${locationId}`, {
    method: 'PUT',
    ...json({ name }),
  });
}

export async function deleteDayLocation(
  tripId: number,
  locationId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/locations/${locationId}`, {
    method: 'DELETE',
  });
}
