import type {
  Attraction,
  AttractionDraft,
  DayPlan,
  Trip,
  TripContent,
} from '@/types';
import {
  showSavedToast,
  uploadStagedImages,
  type StagedImage,
} from '@/utils/stagedImages';
import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  updateAttraction,
  uploadAttractionImage,
} from '@/utils/storage';

import { toAttractionPayload } from './attractionPayload';
import { runMutation } from './runMutation';

/**
 * Creates (id 0, then uploads the staged images) or updates an attraction.
 *
 * @param tripId - Owning trip.
 * @param day - Day the attraction is created in (unused when updating).
 * @param attraction - The attraction as edited in the modal.
 * @param stagedImages - Images to upload after a create.
 * @returns The number of staged images that failed to upload.
 */
async function persistAttraction(
  tripId: number,
  day: DayPlan,
  attraction: AttractionDraft,
  stagedImages?: StagedImage[],
): Promise<number> {
  if (attraction.id !== 0) {
    await updateAttraction(
      tripId,
      attraction.id,
      toAttractionPayload(attraction, null),
    );
    return 0;
  }
  const created = await addAttraction(
    tripId,
    day.id,
    toAttractionPayload(attraction, undefined),
  );
  const { failedCount } = await uploadStagedImages(
    stagedImages,
    (file, title) => uploadAttractionImage(tripId, created.id, file, title),
  );
  return failedCount;
}

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
    attraction: AttractionDraft,
    stagedImages?: StagedImage[],
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    await runMutation(
      () => persistAttraction(trip.id, day, attraction, stagedImages),
      {
        reload: reloadContent,
        onSuccess: failedUploads => {
          closeModal();
          showSavedToast('已儲存景點。', failedUploads);
        },
        error: '儲存景點失敗，請稍後再試',
      },
    );
  };

  const handleDeleteAttraction = async (attractionId: number) => {
    if (!trip) {
      return;
    }
    await runMutation(() => deleteAttraction(trip.id, attractionId), {
      reload: reloadContent,
      success: '已刪除景點。',
      error: '刪除景點失敗，請稍後再試',
    });
  };

  const handleDuplicateAttraction = async (attraction: Attraction) => {
    if (!trip) {
      return;
    }
    await runMutation(() => duplicateAttraction(trip.id, attraction.id), {
      reload: reloadContent,
      success: '已複製景點。',
      error: '複製景點失敗，請稍後再試',
    });
  };

  return {
    handleSaveAttraction,
    handleDeleteAttraction,
    handleDuplicateAttraction,
  };
}
