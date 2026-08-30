import { showToast } from '@/lib/toast';
import type { Trip, TripContent } from '@/types';
import { updateDayNotes } from '@/utils/storage';

/**
 * Save handler for a day's notes, bound to the current trip/content and
 * reload/close callbacks from the page.
 */
export function useDayNoteActions(
  trip: Trip | null,
  content: TripContent | null,
  reloadContent: () => Promise<void>,
  closeModal: () => void,
) {
  const handleSaveDayNotes = async (dayIndex: number, notes: string | null) => {
    if (!trip || !content) {
      return;
    }
    try {
      await updateDayNotes(trip.id, content.days[dayIndex].id, notes);
      await reloadContent();
      closeModal();
      showToast('success', '已儲存每日備註。');
    } catch {
      showToast('error', '儲存每日備註失敗，請稍後再試');
    }
  };

  return { handleSaveDayNotes };
}
