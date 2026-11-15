import type { DayNotes } from '@tripdeck/shared';

import { api, json } from './client';

export async function updateDayNotes(
  tripId: number,
  dayId: number,
  notes: string | null,
): Promise<DayNotes> {
  return api<DayNotes>(`/api/trips/${tripId}/days/${dayId}/notes`, {
    method: 'PUT',
    ...json({ notes }),
  });
}
