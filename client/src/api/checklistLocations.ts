import type {
  CreateLocationLabelBody,
  LocationLabel,
  LocationLabelsResponse,
  UpdateLocationLabelBody,
} from '@tripdeck/shared';

import { api, json } from './client';

export async function getLocationLabels(): Promise<LocationLabelsResponse> {
  return api<LocationLabelsResponse>('/api/checklist-locations/');
}

export async function addLocationLabel(
  data: CreateLocationLabelBody,
): Promise<LocationLabel> {
  return api<LocationLabel>('/api/checklist-locations/', {
    method: 'POST',
    ...json(data),
  });
}

export async function updateLocationLabel(
  labelId: number,
  data: UpdateLocationLabelBody,
): Promise<LocationLabel> {
  return api<LocationLabel>(`/api/checklist-locations/${labelId}`, {
    method: 'PUT',
    ...json(data),
  });
}

export async function deleteLocationLabel(labelId: number): Promise<void> {
  await api<void>(`/api/checklist-locations/${labelId}`, { method: 'DELETE' });
}

export async function reorderLocationLabels(
  orderedIds: number[],
): Promise<void> {
  await api<void>('/api/checklist-locations/order', {
    method: 'PATCH',
    ...json({ orderedIds }),
  });
}
