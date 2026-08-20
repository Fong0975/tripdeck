import type { Trip, TravelConnection, TripContent } from '@/types';
import { addConnection, updateConnection } from '@/utils/storage';

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
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    if (connection.id === 0) {
      await addConnection(trip.id, day.id, {
        fromAttractionId: connection.fromAttractionId,
        toAttractionId: connection.toAttractionId,
        transportMode: connection.transportMode,
        duration: connection.duration ?? undefined,
        route: connection.route ?? undefined,
        notes: connection.notes ?? undefined,
      });
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
  };

  return { handleAddConnection, handleSaveConnection };
}
