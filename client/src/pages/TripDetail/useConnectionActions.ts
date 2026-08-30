import { showToast } from '@/lib/toast';
import type { Trip, TravelConnection, TripContent } from '@/types';
import {
  addConnection,
  deleteConnection,
  updateConnection,
  uploadConnectionImage,
} from '@/utils/storage';

/**
 * Travel-connection CRUD handlers for the trip board, bound to the current
 * trip/content and reload/close-modal callbacks from the page.
 */
export function useConnectionActions(
  trip: Trip | null,
  content: TripContent | null,
  reloadContent: () => Promise<void>,
  closeModal: () => void,
  openConnectionModal: (dayIndex: number, connection: TravelConnection) => void,
) {
  const handleAddConnection = (
    dayIndex: number,
    fromId: number,
    toId: number,
  ) => {
    const pending: TravelConnection = {
      id: 0,
      fromAttractionId: fromId,
      toAttractionId: toId,
      transportMode: 'transit',
    };
    openConnectionModal(dayIndex, pending);
  };

  const handleSaveConnection = async (
    dayIndex: number,
    connection: TravelConnection,
    stagedImages?: { file: File; title: string }[],
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    try {
      if (connection.id === 0) {
        const created = await addConnection(trip.id, day.id, {
          fromAttractionId: connection.fromAttractionId,
          toAttractionId: connection.toAttractionId,
          transportMode: connection.transportMode,
          duration: connection.duration ?? undefined,
          route: connection.route ?? undefined,
          notes: connection.notes ?? undefined,
        });
        if (stagedImages?.length) {
          for (const { file, title } of stagedImages) {
            await uploadConnectionImage(trip.id, created.id, file, title);
          }
        }
      } else {
        await updateConnection(trip.id, connection.id, {
          transportMode: connection.transportMode,
          duration: connection.duration ?? null,
          route: connection.route ?? null,
          notes: connection.notes ?? null,
        });
      }
      await reloadContent();
      closeModal();
      showToast('success', '已儲存交通方式。');
    } catch {
      showToast('error', '儲存交通方式失敗，請稍後再試');
    }
  };

  const handleDeleteConnection = async (
    _dayIndex: number,
    connectionId: number,
  ) => {
    if (!trip) {
      return;
    }
    try {
      await deleteConnection(trip.id, connectionId);
      await reloadContent();
      showToast('success', '已刪除交通方式。');
    } catch {
      showToast('error', '刪除交通方式失敗，請稍後再試');
    }
  };

  return { handleAddConnection, handleSaveConnection, handleDeleteConnection };
}
