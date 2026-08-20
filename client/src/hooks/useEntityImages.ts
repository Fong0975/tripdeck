import { useState } from 'react';

import type { AttractionImage } from '@/types';

interface Options {
  initialImages: AttractionImage[];
  /** Undefined when the entity isn't persisted yet — upload is then a no-op. */
  upload: ((file: File, title: string) => Promise<AttractionImage>) | undefined;
  /** Undefined when the entity isn't persisted yet — delete is then a no-op. */
  remove: ((imageId: number) => Promise<void>) | undefined;
}

/**
 * Manages the uploaded-image list for an entity (attraction or travel
 * connection) that already exists server-side, wrapping the upload/delete
 * API calls with the matching local state update.
 */
export function useEntityImages({ initialImages, upload, remove }: Options) {
  const [images, setImages] = useState<AttractionImage[]>(initialImages);

  const handleUpload = async (file: File, title: string) => {
    if (!upload) {
      return;
    }
    const image = await upload(file, title);
    setImages(prev => [...prev, image]);
  };

  const handleDelete = async (imageId: number) => {
    if (!remove) {
      return;
    }
    await remove(imageId);
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  return { images, handleUpload, handleDelete };
}
