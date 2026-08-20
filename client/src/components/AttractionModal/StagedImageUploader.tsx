import { ImagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [stagingError, setStagingError] = useState('');
  const stageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onImagesChange(stagedImages.map(({ file, title }) => ({ file, title })));
    // Only notify the parent when the confirmed list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedImages]);

  useEffect(() => {
    return () => {
      stagedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      if (pendingPreview) {
        URL.revokeObjectURL(pendingPreview);
      }
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
    }
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setPendingTitle('');
    setStagingError('');
    if (stageFileInputRef.current) {
      stageFileInputRef.current.value = '';
    }
  };

  const clearPendingStage = () => {
    setPendingFile(null);
    setPendingTitle('');
    setStagingError('');
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
      setPendingPreview(null);
    }
  };

  const confirmStage = () => {
    if (!pendingFile || !pendingPreview) {
      return;
    }
    const title = pendingTitle.trim();
    if (!title) {
      setStagingError('請輸入圖片標題');
      return;
    }
    setStagedImages(prev => [
      ...prev,
      {
        localId: generateId(),
        file: pendingFile,
        title,
        previewUrl: pendingPreview,
      },
    ]);
    setPendingFile(null);
    setPendingTitle('');
    setPendingPreview(null);
    setStagingError('');
  };

  const removeStagedImage = (localId: string) => {
    setStagedImages(prev => {
      const target = prev.find(i => i.localId === localId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(i => i.localId !== localId);
    });
  };

  return (
    <div className='space-y-3'>
      {stagedImages.length > 0 && (
        <div className='grid grid-cols-2 gap-2'>
          {stagedImages.map(img => (
            <div
              key={img.localId}
              className='border-border group relative overflow-hidden rounded-lg border'
            >
              <img
                src={img.previewUrl}
                alt={img.title}
                className='h-24 w-full object-cover'
              />
              <div className='absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100'>
                <p className='truncate text-xs font-medium text-white'>
                  {img.title}
                </p>
              </div>
              <button
                type='button'
                tabIndex={-1}
                onClick={() => removeStagedImage(img.localId)}
                className='hover:bg-destructive absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100'
                title='移除圖片'
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pendingFile ? (
        <div className='border-border space-y-2 rounded-lg border border-dashed p-3'>
          {pendingPreview && (
            <div className='relative'>
              <img
                src={pendingPreview}
                alt='預覽'
                className='h-32 w-full rounded-lg object-cover'
              />
              <button
                type='button'
                tabIndex={-1}
                onClick={clearPendingStage}
                className='absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white hover:bg-black/70'
              >
                <X size={12} />
              </button>
            </div>
          )}
          <input
            value={pendingTitle}
            onChange={e => {
              setPendingTitle(e.target.value);
              setStagingError('');
            }}
            placeholder='圖片標題（必填）'
            className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2'
          />
          {stagingError && (
            <p className='text-destructive text-xs'>{stagingError}</p>
          )}
          <button
            type='button'
            onClick={confirmStage}
            className='bg-primary text-primary-foreground w-full rounded-lg py-2 text-sm font-medium transition-all hover:opacity-90'
          >
            加入圖片
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => stageFileInputRef.current?.click()}
          className='border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm transition-colors'
        >
          <ImagePlus size={16} />
          新增圖片
        </button>
      )}
      <input
        ref={stageFileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/gif,image/webp'
        onChange={handleStageFileSelect}
        className='hidden'
      />
    </div>
  );
}
