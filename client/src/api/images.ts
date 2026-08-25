import type { AttractionImage } from '@/types';

import { api } from './client';

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

export async function uploadTripImage(
  tripId: number,
  file: File,
  title: string,
): Promise<AttractionImage> {
  const form = new FormData();
  form.append('image', file);
  form.append('title', title);
  return api<AttractionImage>(`/api/trips/${tripId}/images`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteTripImage(
  tripId: number,
  imageId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/images/${imageId}`, {
    method: 'DELETE',
  });
}

export async function uploadDayImage(
  tripId: number,
  dayId: number,
  file: File,
  title: string,
): Promise<AttractionImage> {
  const form = new FormData();
  form.append('image', file);
  form.append('title', title);
  return api<AttractionImage>(`/api/trips/${tripId}/days/${dayId}/images`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteDayImage(
  tripId: number,
  dayId: number,
  imageId: number,
): Promise<void> {
  await api<void>(`/api/trips/${tripId}/days/${dayId}/images/${imageId}`, {
    method: 'DELETE',
  });
}
