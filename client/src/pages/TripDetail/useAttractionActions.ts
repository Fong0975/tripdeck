import type { Attraction, Trip, TripContent } from '@/types';
import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  updateAttraction,
  uploadAttractionImage,
} from '@/utils/storage';

/**
 * Attraction CRUD handlers for the trip board, bound to the current
 * trip/content and reload/close-modal callbacks from the page.
 */
export function useAttractionActions(
  trip: Trip | null,
  content: TripContent | null,
  reloadContent: () => Promise<void>,
  closeModal: () => void,
) {
  const handleSaveAttraction = async (
    dayIndex: number,
    attraction: Attraction,
    stagedImages?: { file: File; title: string }[],
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    if (attraction.id === 0) {
      const created = await addAttraction(trip.id, day.id, {
        name: attraction.name,
        googleMapUrl: attraction.googleMapUrl ?? undefined,
        notes: attraction.notes ?? undefined,
        nearbyAttractions: attraction.nearbyAttractions ?? undefined,
        startTime: attraction.startTime ?? undefined,
        endTime: attraction.endTime ?? undefined,
        referenceWebsites: attraction.referenceWebsites,
      });
      if (stagedImages?.length) {
        for (const { file, title } of stagedImages) {
          await uploadAttractionImage(trip.id, created.id, file, title);
        }
      }
    } else {
      await updateAttraction(trip.id, attraction.id, {
        name: attraction.name,
        googleMapUrl: attraction.googleMapUrl ?? null,
        notes: attraction.notes ?? null,
        nearbyAttractions: attraction.nearbyAttractions ?? null,
        startTime: attraction.startTime ?? null,
        endTime: attraction.endTime ?? null,
        referenceWebsites: attraction.referenceWebsites,
      });
    }
    await reloadContent();
    closeModal();
  };

  const handleDeleteAttraction = async (
    _dayIndex: number,
    attractionId: number,
  ) => {
    if (!trip) {
      return;
    }
    await deleteAttraction(trip.id, attractionId);
    await reloadContent();
  };

  const handleDuplicateAttraction = async (
    _dayIndex: number,
    attraction: Attraction,
  ) => {
    if (!trip) {
      return;
    }
    await duplicateAttraction(trip.id, attraction.id);
    await reloadContent();
  };

  return {
    handleSaveAttraction,
    handleDeleteAttraction,
    handleDuplicateAttraction,
  };
}
