import { showToast } from '@/lib/toast';
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
    try {
      await addDayLocation(trip.id, content.days[dayIndex].id, name);
      await reloadContent();
    } catch {
      showToast('error', '新增地點失敗，請稍後再試');
    }
  };

  const handleUpdateLocation = async (
    _dayIndex: number,
    locationId: number,
    name: string,
  ) => {
    if (!trip) {
      return;
    }
    try {
      await updateDayLocation(trip.id, locationId, name);
      await reloadContent();
    } catch {
      showToast('error', '更新地點失敗，請稍後再試');
    }
  };

  const handleDeleteLocation = async (
    _dayIndex: number,
    locationId: number,
  ) => {
    if (!trip) {
      return;
    }
    try {
      await deleteDayLocation(trip.id, locationId);
      await reloadContent();
      showToast('success', '已刪除地點。');
    } catch {
      showToast('error', '刪除地點失敗，請稍後再試');
    }
  };

  return { handleAddLocation, handleUpdateLocation, handleDeleteLocation };
}
