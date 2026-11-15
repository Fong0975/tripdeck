import type { UploadedImage } from '@/types';

import { api, apiUrl } from './client';

/**
 * Builds the URL an uploaded image is served from, honouring the configured
 * API origin (`VITE_API_DOMAIN`) so images load when the backend lives on a
 * different host than the client.
 *
 * @param filename - The stored image's filename, as returned by the server.
 * @returns The absolute or root-relative URL of the image file.
 */
export function imageUrl(filename: string): string {
  return apiUrl(`/uploads/${filename}`);
}

/**
 * POSTs one image file and its title as a multipart form to `path`.
 *
 * @param path - The owning entity's image collection endpoint.
 * @param file - The image file to upload.
 * @param title - The image's display title.
 * @returns The created image record.
 */
function uploadImage(
  path: string,
  file: File,
  title: string,
): Promise<UploadedImage> {
  const form = new FormData();
  form.append('image', file);
  form.append('title', title);
  return api<UploadedImage>(path, { method: 'POST', body: form });
}

export async function uploadAttractionImage(
  tripId: number,
  attractionId: number,
  file: File,
  title: string,
): Promise<UploadedImage> {
  return uploadImage(
    `/api/trips/${tripId}/attractions/${attractionId}/images`,
    file,
    title,
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
): Promise<UploadedImage> {
  return uploadImage(
    `/api/trips/${tripId}/connections/${connectionId}/images`,
    file,
    title,
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
): Promise<UploadedImage> {
  return uploadImage(`/api/trips/${tripId}/images`, file, title);
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
): Promise<UploadedImage> {
  return uploadImage(`/api/trips/${tripId}/days/${dayId}/images`, file, title);
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
