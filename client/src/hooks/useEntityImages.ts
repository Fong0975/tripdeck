import { useState } from 'react';

import { showToast } from '@/components/ui/toast';
import type { UploadedImage } from '@/types';

interface Options {
  initialImages: UploadedImage[];
  /** Undefined when the entity isn't persisted yet — upload is then a no-op. */
  upload: ((file: File, title: string) => Promise<UploadedImage>) | undefined;
  /** Undefined when the entity isn't persisted yet — delete is then a no-op. */
  remove: ((imageId: number) => Promise<void>) | undefined;
  /**
   * Called after each successful upload or delete. Both persist server-side
   * immediately, so the owner can refresh its view even if the editing modal
   * is later cancelled instead of saved.
   */
  onImagesChanged?: () => void;
}

/**
 * Manages the uploaded-image list for an entity (attraction or travel
 * connection) that already exists server-side, wrapping the upload/delete
 * API calls with the matching local state update and notifying the owner
 * through `onImagesChanged`.
 */
export function useEntityImages({
  initialImages,
  upload,
  remove,
  onImagesChanged,
}: Options) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);

  const handleUpload = async (file: File, title: string) => {
    if (!upload) {
      return;
    }
    const image = await upload(file, title);
    setImages(prev => [...prev, image]);
    onImagesChanged?.();
  };

  const handleDelete = async (imageId: number) => {
    if (!remove) {
      return;
    }
    try {
      await remove(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      onImagesChanged?.();
      showToast('success', '已刪除圖片。');
    } catch {
      showToast('error', '刪除圖片失敗，請稍後再試');
    }
  };

  return { images, handleUpload, handleDelete };
}
