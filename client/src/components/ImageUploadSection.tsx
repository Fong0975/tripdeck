import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { imageUrl } from '@/api/images';
import { showToast } from '@/lib/toast';
import type { AttractionImage } from '@/types';

import ImageLightbox from './ImageLightbox';
import PendingImageForm from './PendingImageForm';

interface Props {
  images: AttractionImage[];
  onUpload: (file: File, title: string) => Promise<void>;
  onDelete: (imageId: number) => Promise<void>;
}

/**
 * Image editor for an entity that already exists on the server: shows its
 * uploaded images (with a lightbox and per-image delete) and uploads new ones
 * immediately through `onUpload`.
 */
export default function ImageUploadSection({
  images,
  onUpload,
  onDelete,
}: Props) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleUpload = async (file: File, title: string) => {
    try {
      await onUpload(file, title);
    } catch (err) {
      showToast(
        'error',
        '上傳失敗，請確認檔案格式（支援 JPG、PNG、GIF、WebP）',
      );
      throw err;
    }
    showToast('success', '已上傳圖片。');
  };

  const handleDelete = async (imageId: number) => {
    setDeletingId(imageId);
    try {
      await onDelete(imageId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className='space-y-3'>
      {/* Existing images */}
      {images.length > 0 && (
        <div className='grid grid-cols-2 gap-2'>
          {images.map((img, idx) => (
            <div
              key={img.id}
              className='group relative overflow-hidden rounded-lg border border-border'
            >
              <img
                src={imageUrl(img.filename)}
                alt={img.title}
                onClick={() => setLightboxIndex(idx)}
                className='h-24 w-full cursor-zoom-in object-cover'
              />
              <div
                onClick={() => setLightboxIndex(idx)}
                className='absolute inset-0 flex cursor-zoom-in flex-col justify-end bg-linear-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100'
              >
                <p className='truncate text-xs font-medium text-white'>
                  {img.title}
                </p>
              </div>
              <button
                type='button'
                tabIndex={-1}
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className='absolute top-1 right-1 rounded-md bg-black/50 p-1 text-white transition-opacity group-hover:opacity-100 hover:bg-destructive disabled:opacity-50 can-hover:opacity-0'
                title='刪除圖片'
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <PendingImageForm
        confirmLabel='確認上傳'
        busyLabel='上傳中...'
        onConfirm={handleUpload}
      />

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
