import { ImagePlus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';

import type { AttractionImage } from '@/types';

import ImageLightbox from './ImageLightbox';

interface Props {
  images: AttractionImage[];
  onUpload: (file: File, title: string) => Promise<void>;
  onDelete: (imageId: number) => Promise<void>;
}

const INPUT_CLS =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm';

export default function ImageUploadSection({
  images,
  onUpload,
  onDelete,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    setPendingFile(file);
    setError('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPending = () => {
    setPendingFile(null);
    setPendingTitle('');
    setError('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) {
      return;
    }
    const title = pendingTitle.trim();
    if (!title) {
      setError('請輸入圖片標題');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await onUpload(pendingFile, title);
      clearPending();
    } catch {
      setError('上傳失敗，請確認檔案格式（支援 JPG、PNG、GIF、WebP）');
    } finally {
      setUploading(false);
    }
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
              className='border-border group relative overflow-hidden rounded-lg border'
            >
              <img
                src={`/uploads/${img.filename}`}
                alt={img.title}
                onClick={() => setLightboxIndex(idx)}
                className='h-24 w-full cursor-zoom-in object-cover'
              />
              <div
                onClick={() => setLightboxIndex(idx)}
                className='absolute inset-0 flex cursor-zoom-in flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100'
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
                className='hover:bg-destructive absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity disabled:opacity-50 group-hover:opacity-100'
                title='刪除圖片'
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      {pendingFile ? (
        <div className='border-border space-y-2 rounded-lg border border-dashed p-3'>
          {previewUrl && (
            <div className='relative'>
              <img
                src={previewUrl}
                alt='預覽'
                className='h-32 w-full rounded-lg object-cover'
              />
              <button
                type='button'
                tabIndex={-1}
                onClick={clearPending}
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
              setError('');
            }}
            placeholder='圖片標題（必填）'
            className={INPUT_CLS}
          />
          {error && <p className='text-destructive text-xs'>{error}</p>}
          <button
            type='button'
            onClick={handleUpload}
            disabled={uploading}
            className='bg-primary text-primary-foreground w-full rounded-lg py-2 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50'
          >
            {uploading ? '上傳中...' : '確認上傳'}
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          className='border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm transition-colors'
        >
          <ImagePlus size={16} />
          新增圖片
        </button>
      )}

      <input
        ref={fileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/gif,image/webp'
        onChange={handleFileChange}
        className='hidden'
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
