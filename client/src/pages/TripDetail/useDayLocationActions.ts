import type { Trip, TripContent } from '@/types';
import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from '@/utils/storage';

/**
 * Per-day location tag CRUD handlers for the trip board, bound to the
 * current trip/content and reload callback from the page.
 */
export function useDayLocationActions(
  trip: Trip | null,
  content: TripContent | null,
  reloadContent: () => Promise<void>,
) {
  const handleAddLocation = async (dayIndex: number, name: string) => {
    if (!trip || !content) {
      return;
    }
    await addDayLocation(trip.id, content.days[dayIndex].id, name);
    await reloadContent();
  };

  const handleUpdateLocation = async (
    _dayIndex: number,
    locationId: number,
    name: string,
  ) => {
    if (!trip) {
      return;
    }
    await updateDayLocation(trip.id, locationId, name);
    await reloadContent();
  };

  const handleDeleteLocation = async (
    _dayIndex: number,
    locationId: number,
  ) => {
    if (!trip) {
      return;
    }
    await deleteDayLocation(trip.id, locationId);
    await reloadContent();
  };

  return { handleAddLocation, handleUpdateLocation, handleDeleteLocation };
}
