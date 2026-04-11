import type {
  Attraction,
  AttractionImage,
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  ChecklistTemplate,
  ReferenceWebsite,
  TransportMode,
  TravelConnection,
  Trip,
  TripChecklist,
  TripContent,
} from '@/types';

// --- Helpers ---

const _apiDomain = import.meta.env.VITE_API_DOMAIN;
const API_BASE = _apiDomain
  ? `${_apiDomain}:${import.meta.env.VITE_API_PORT}`
  : '';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

function json(body: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// --- Trips ---

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

// --- Attractions ---

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

// --- Connections ---

export async function addConnection(
  tripId: number,
  dayId: number,
  data: {
    fromAttractionId: number;
    toAttractionId: number;
    transportMode: string;
    duration?: string;
    route?: string;
    notes?: string;
  },
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
  data: {
    transportMode?: string;
    duration?: string | null;
    route?: string | null;
    notes?: string | null;
  },
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

// --- Images ---

export async function uploadAttractionImage(
  tripId: number,
  attractionId: number,
  file: File,
  title: string,
): Promise<AttractionImage> {
  const form = new FormData();
  form.append('image', file);
  form.append('title', title);
  return api<AttractionImage>(
    `/api/trips/${tripId}/attractions/${attractionId}/images`,
    { method: 'POST', body: form },
  );
}

export async function deleteAttractionImage(
  tripId: number,
  attractionId: number,
  imageId: number,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/attractions/${attractionId}/images/${imageId}`,
    { method: 'DELETE' },
  );
}

export async function uploadConnectionImage(
  tripId: number,
  connectionId: number,
  file: File,
  title: string,
): Promise<AttractionImage> {
  const form = new FormData();
  form.append('image', file);
  form.append('title', title);
  return api<AttractionImage>(
    `/api/trips/${tripId}/connections/${connectionId}/images`,
    { method: 'POST', body: form },
  );
}

export async function deleteConnectionImage(
  tripId: number,
  connectionId: number,
  imageId: number,
): Promise<void> {
  await api<void>(
    `/api/trips/${tripId}/connections/${connectionId}/images/${imageId}`,
    { method: 'DELETE' },
  );
}

// --- Checklist Template ---

export async function getChecklistTemplate(): Promise<ChecklistTemplate> {
  return api<ChecklistTemplate>('/api/checklist-template/');
}

export async function addTemplateCategory(
  name: string,
): Promise<ChecklistCategory> {
  return api<ChecklistCategory>('/api/checklist-template/categories', {
    method: 'POST',
    ...json({ name }),
  });
}

export async function updateTemplateCategory(
  catId: number,
  name: string,
): Promise<void> {
  await api<void>(`/api/checklist-template/categories/${catId}`, {
    method: 'PUT',
    ...json({ name }),
  });
}

export async function deleteTemplateCategory(catId: number): Promise<void> {
  await api<void>(`/api/checklist-template/categories/${catId}`, {
    method: 'DELETE',
  });
}

export async function addTemplateItem(
  catId: number,
  data: { name: string; quantity?: number | null; notes?: string | null },
): Promise<ChecklistItem> {
  return api<ChecklistItem>(
    `/api/checklist-template/categories/${catId}/items`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTemplateItem(
  catId: number,
  itemId: number,
  data: { name: string; quantity?: number | null; notes?: string | null },
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}`,
    { method: 'PUT', ...json(data) },
  );
}

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
  data: { name: string; quantity?: number | null; notes?: string | null },
): Promise<ChecklistItem> {
  return api<ChecklistItem>(
    `/api/trips/${tripId}/checklist/categories/${catId}/items`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTripItem(
  tripId: number,
  itemId: number,
  data: { name?: string; quantity?: number | null; notes?: string | null },
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

export async function deleteTemplateItem(
  catId: number,
  itemId: number,
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}`,
    { method: 'DELETE' },
  );
}

// --- Trip Checklist ---

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

// Re-export types used by consumers so they don't need to import from two places
export type {
  TransportMode,
  Attraction,
  AttractionImage,
  ReferenceWebsite,
  TravelConnection,
};
