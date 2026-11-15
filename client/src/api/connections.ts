import type {
  CreateConnectionBody,
  UpdateConnectionBody,
} from '@tripdeck/shared';

import type { TravelConnection } from '@/types';

import { api, json } from './client';

export async function addConnection(
  tripId: number,
  dayId: number,
  data: CreateConnectionBody,
): Promise<TravelConnection> {
  return api<TravelConnection>(
    `/api/trips/${tripId}/days/${dayId}/connections`,
    {
      method: 'POST',
      ...json(data),
    },
  );
}

export async function updateConnection(
  tripId: number,
  connectionId: number,
  data: UpdateConnectionBody,
): Promise<TravelConnection> {
  return api<TravelConnection>(
    `/api/trips/${tripId}/connections/${connectionId}`,
    {
      method: 'PUT',
      ...json(data),
    },
  );
}

export async function deleteConnection(
  tripId: number,
  connectionId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/connections/${connectionId}`, {
    method: 'DELETE',
  });
}
