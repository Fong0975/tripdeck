import { showToast } from '@/lib/toast';
import type { AttractionImage } from '@/types';

/** An image picked in a create form, uploaded only after its entity exists. */
export interface StagedImage {
  file: File;
  title: string;
}

export interface StagedUploadResult {
  uploaded: AttractionImage[];
  failedCount: number;
}

/**
 * Uploads staged images one by one for an entity that has just been created.
 *
 * Failures are counted rather than thrown: the entity already exists
 * server-side, so aborting would leave the create form open and a retry
 * would create a duplicate entity.
 *
 * @param stagedImages - Images picked before the entity existed.
 * @param upload - Uploads one image for the created entity.
 * @returns The successfully uploaded images and the number of failed uploads.
 */
export async function uploadStagedImages(
  stagedImages: StagedImage[] | undefined,
  upload: (file: File, title: string) => Promise<AttractionImage>,
): Promise<StagedUploadResult> {
  const uploaded: AttractionImage[] = [];
  let failedCount = 0;
  for (const { file, title } of stagedImages ?? []) {
    try {
      uploaded.push(await upload(file, title));
    } catch {
      failedCount++;
    }
  }
  return { uploaded, failedCount };
}

export const PARTIAL_IMAGE_UPLOAD_MESSAGE = '已儲存，但部分圖片上傳失敗';

/**
 * Shows the post-save toast: the given success message, or a warning when
 * some staged images failed to upload after the entity was saved.
 *
 * @param successMessage - Toast text when every image uploaded.
 * @param failedCount - Number of staged images that failed to upload.
 */
export function showSavedToast(successMessage: string, failedCount: number) {
  if (failedCount > 0) {
    showToast('warning', PARTIAL_IMAGE_UPLOAD_MESSAGE);
  } else {
    showToast('success', successMessage);
  }
}
