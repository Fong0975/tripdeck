import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useObjectUrls } from '@/hooks/useObjectUrls';

import PendingImageForm from './PendingImageForm';

interface StagedImage {
  localId: string;
  file: File;
  title: string;
  previewUrl: string;
}

interface Props {
  onImagesChange: (images: { file: File; title: string }[]) => void;
}

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Local (not-yet-uploaded) image staging UI for a brand-new attraction that
 * doesn't have a server-side id yet. Reports the confirmed staged image list
 * to the parent via onImagesChange so it can be submitted alongside the form.
 */
export default function StagedImageUploader({ onImagesChange }: Props) {
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const objectUrls = useObjectUrls();

  useEffect(() => {
    onImagesChange(stagedImages.map(({ file, title }) => ({ file, title })));
    // Only notify the parent when the confirmed list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedImages]);

  const stageImage = (file: File, title: string) => {
    setStagedImages(prev => [
      ...prev,
      {
        localId: generateId(),
        file,
        title,
        previewUrl: objectUrls.create(file),
      },
    ]);
  };

  const removeStagedImage = (target: StagedImage) => {
    objectUrls.revoke(target.previewUrl);
    setStagedImages(prev => prev.filter(i => i.localId !== target.localId));
  };

  return (
    <div className='space-y-3'>
      {stagedImages.length > 0 && (
        <div className='grid grid-cols-2 gap-2'>
          {stagedImages.map(img => (
            <div
              key={img.localId}
              className='group relative overflow-hidden rounded-lg border border-border'
            >
              <img
                src={img.previewUrl}
                alt={img.title}
                className='h-24 w-full object-cover'
              />
              <div className='absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100'>
                <p className='truncate text-xs font-medium text-white'>
                  {img.title}
                </p>
              </div>
              <button
                type='button'
                tabIndex={-1}
                onClick={() => removeStagedImage(img)}
                className='absolute top-1 right-1 rounded-md bg-black/50 p-1 text-white transition-opacity group-hover:opacity-100 hover:bg-destructive can-hover:opacity-0'
                title='移除圖片'
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <PendingImageForm confirmLabel='加入圖片' onConfirm={stageImage} />
    </div>
  );
}
