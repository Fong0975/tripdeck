import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  ItemSpec,
  TripChecklist,
} from '@/types';

import { api, json } from './client';

/**
 * Request body for creating a trip checklist item; on update every field is
 * optional.
 */
export interface TripItemBody {
  name: string;
  quantity?: number | null;
  notes?: string | null;
  storage_location?: string | null;
}

/** Request body for creating or updating a trip checklist item spec. */
export interface TripSpecBody {
  name: string;
  storage_location?: string | null;
}

// --- Categories / Items / Specs (per-trip checklist) ---

export async function addTripCategory(
  tripId: number,
  name: string,
): Promise<ChecklistCategory> {
  return api<ChecklistCategory>(`/api/trips/${tripId}/checklist/categories`, {
    method: 'POST',
    ...json({ name }),
  });
}

export async function updateTripCategory(
  tripId: number,
  catId: number,
  name: string,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/categories/${catId}`, {
    method: 'PUT',
    ...json({ name }),
  });
}

export async function deleteTripCategory(
  tripId: number,
  catId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/categories/${catId}`, {
    method: 'DELETE',
  });
}

export async function addTripItem(
  tripId: number,
  catId: number,
  data: TripItemBody,
): Promise<ChecklistItem> {
  return api<ChecklistItem>(
    `/api/trips/${tripId}/checklist/categories/${catId}/items`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTripItem(
  tripId: number,
  itemId: number,
  data: Partial<TripItemBody>,
): Promise<ChecklistItem> {
  return api<ChecklistItem>(`/api/trips/${tripId}/checklist/items/${itemId}`, {
    method: 'PUT',
    ...json(data),
  });
}

export async function deleteTripItem(
  tripId: number,
  itemId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function addTripItemSpec(
  tripId: number,
  itemId: number,
  data: TripSpecBody,
): Promise<ItemSpec> {
  return api<ItemSpec>(`/api/trips/${tripId}/checklist/items/${itemId}/specs`, {
    method: 'POST',
    ...json(data),
  });
}

export async function updateTripItemSpec(
  tripId: number,
  itemId: number,
  specId: number,
  data: TripSpecBody,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/checklist/items/${itemId}/specs/${specId}`,
    { method: 'PUT', ...json(data) },
  );
}

export async function deleteTripItemSpec(
  tripId: number,
  itemId: number,
  specId: number,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/checklist/items/${itemId}/specs/${specId}`,
    { method: 'DELETE' },
  );
}

// --- Occasions / checks ---

export async function getTripChecklist(tripId: number): Promise<TripChecklist> {
  return api<TripChecklist>(`/api/trips/${tripId}/checklist/`);
}

export async function addOccasion(
  tripId: number,
  name: string,
): Promise<ChecklistOccasion> {
  return api<ChecklistOccasion>(`/api/trips/${tripId}/checklist/occasions`, {
    method: 'POST',
    ...json({ name }),
  });
}

export async function updateOccasion(
  tripId: number,
  occId: number,
  name: string,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/occasions/${occId}`, {
    method: 'PUT',
    ...json({ name }),
  });
}

export async function deleteOccasion(
  tripId: number,
  occId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/occasions/${occId}`, {
    method: 'DELETE',
  });
}

export async function setCheck(
  tripId: number,
  occId: number,
  itemId: number,
  checked: boolean,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/checklist/occasions/${occId}/items/${itemId}/check`,
    { method: 'PUT', ...json({ checked }) },
  );
}
