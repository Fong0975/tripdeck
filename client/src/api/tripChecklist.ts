import type {
  ChecklistItemBody,
  ChecklistSpecBody,
  UpdateTripChecklistItemBody,
} from '@tripdeck/shared';

import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  ItemSpec,
  TripChecklist,
} from '@/types';

import { api, json } from './client';

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
  data: ChecklistItemBody,
): Promise<ChecklistItem> {
  return api<ChecklistItem>(
    `/api/trips/${tripId}/checklist/categories/${catId}/items`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTripItem(
  tripId: number,
  itemId: number,
  data: UpdateTripChecklistItemBody,
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
  data: ChecklistSpecBody,
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
  data: ChecklistSpecBody,
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

/** Persists the order of every category of a trip checklist. */
export async function reorderTripCategories(
  tripId: number,
  orderedIds: number[],
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/categories/order`, {
    method: 'PATCH',
    ...json({ orderedIds }),
  });
}

/** Persists the order of every item of a trip checklist category. */
export async function reorderTripItems(
  tripId: number,
  catId: number,
  orderedIds: number[],
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/checklist/categories/${catId}/items/order`,
    { method: 'PATCH', ...json({ orderedIds }) },
  );
}

/** Moves a trip checklist item to the end of another category of the trip. */
export async function moveTripItem(
  tripId: number,
  itemId: number,
  targetCategoryId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/checklist/items/${itemId}/move`, {
    method: 'PATCH',
    ...json({ targetCategoryId }),
  });
}

// --- Occasions / checks ---

export async function getTripChecklist(tripId: number): Promise<TripChecklist> {
  return api<TripChecklist>(`/api/trips/${tripId}/checklist/`);
}

/**
 * Copies the global template into a trip whose checklist has no categories.
 *
 * @returns The resulting checklist.
 * @throws {ApiError} with status 409 when the trip already has categories.
 */
export async function syncTripChecklistFromTemplate(
  tripId: number,
): Promise<TripChecklist> {
  return api<TripChecklist>(`/api/trips/${tripId}/checklist/sync-template`, {
    method: 'POST',
  });
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
  location: string,
  checked: boolean,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/checklist/occasions/${occId}/items/${itemId}/check`,
    { method: 'PUT', ...json({ checked, location }) },
  );
}

export async function setSpecCheck(
  tripId: number,
  occId: number,
  itemId: number,
  specId: number,
  location: string,
  checked: boolean,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/checklist/occasions/${occId}/items/${itemId}/specs/${specId}/check`,
    { method: 'PUT', ...json({ checked, location }) },
  );
}
