import type { DayPlan, Trip, TravelConnection, TripContent } from '@/types';
import {
  showSavedToast,
  uploadStagedImages,
  type StagedImage,
} from '@/utils/stagedImages';
import {
  addConnection,
  deleteConnection,
  updateConnection,
  uploadConnectionImage,
} from '@/utils/storage';

import { runMutation } from './runMutation';

/**
 * Creates (id 0, then uploads the staged images) or updates a connection.
 *
 * @param tripId - Owning trip.
 * @param day - Day the connection is created in (unused when updating).
 * @param connection - The connection as edited in the modal.
 * @param stagedImages - Images to upload after a create.
 * @returns The number of staged images that failed to upload.
 */
async function persistConnection(
  tripId: number,
  day: DayPlan,
  connection: TravelConnection,
  stagedImages?: StagedImage[],
): Promise<number> {
  if (connection.id !== 0) {
    await updateConnection(tripId, connection.id, {
      transportMode: connection.transportMode,
      duration: connection.duration ?? null,
      route: connection.route ?? null,
      notes: connection.notes ?? null,
    });
    return 0;
  }
  const created = await addConnection(tripId, day.id, {
    fromAttractionId: connection.fromAttractionId,
    toAttractionId: connection.toAttractionId,
    transportMode: connection.transportMode,
    duration: connection.duration ?? undefined,
    route: connection.route ?? undefined,
    notes: connection.notes ?? undefined,
  });
  const { failedCount } = await uploadStagedImages(
    stagedImages,
    (file, title) => uploadConnectionImage(tripId, created.id, file, title),
  );
  return failedCount;
}

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
    stagedImages?: StagedImage[],
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    await runMutation(
      () => persistConnection(trip.id, day, connection, stagedImages),
      {
        reload: reloadContent,
        onSuccess: failedUploads => {
          closeModal();
          showSavedToast('已儲存交通方式。', failedUploads);
        },
        error: '儲存交通方式失敗，請稍後再試',
      },
    );
  };

  const handleDeleteConnection = async (connectionId: number) => {
    if (!trip) {
      return;
    }
    await runMutation(() => deleteConnection(trip.id, connectionId), {
      reload: reloadContent,
      success: '已刪除交通方式。',
      error: '刪除交通方式失敗，請稍後再試',
    });
  };

  return { handleAddConnection, handleSaveConnection, handleDeleteConnection };
}
