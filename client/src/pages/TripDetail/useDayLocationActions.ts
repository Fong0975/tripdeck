import type { Trip, TripContent } from '@/types';
import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from '@/utils/storage';

import { runMutation } from './runMutation';

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
    await runMutation(
      () => addDayLocation(trip.id, content.days[dayIndex].id, name),
      { reload: reloadContent, error: '新增地點失敗，請稍後再試' },
    );
  };

  const handleUpdateLocation = async (locationId: number, name: string) => {
    if (!trip) {
      return;
    }
    await runMutation(() => updateDayLocation(trip.id, locationId, name), {
      reload: reloadContent,
      error: '更新地點失敗，請稍後再試',
    });
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!trip) {
      return;
    }
    await runMutation(() => deleteDayLocation(trip.id, locationId), {
      reload: reloadContent,
      success: '已刪除地點。',
      error: '刪除地點失敗，請稍後再試',
    });
  };

  return { handleAddLocation, handleUpdateLocation, handleDeleteLocation };
}
