import { api, json } from './client';

export async function updateDayNotes(
  tripId: number,
  dayId: number,
  notes: string | null,
): Promise<{ id: number; notes: string | null }> {
  return api<{ id: number; notes: string | null }>(
    `/api/trips/${tripId}/days/${dayId}/notes`,
    { method: 'PUT', ...json({ notes }) },
  );
}
