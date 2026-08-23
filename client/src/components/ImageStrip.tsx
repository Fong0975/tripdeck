import { Images } from 'lucide-react';

import type { AttractionImage } from '@/types';

interface ImageStripProps {
  images: AttractionImage[];
  onOpenLightbox: () => void;
}

/** Renders up to 3 overlapping image thumbnails plus an overflow count, opening the lightbox on click. */
export default function ImageStrip({
  images,
  onOpenLightbox,
}: ImageStripProps) {
  return (
    <button
      type='button'
      onClick={e => {
        e.stopPropagation();
        onOpenLightbox();
      }}
      className='mt-2 flex items-center gap-1.5 transition-opacity hover:opacity-80'
    >
      <div className='flex -space-x-2'>
        {images.slice(0, 3).map(img => (
          <img
            key={img.id}
            src={`/uploads/${img.filename}`}
            alt={img.title}
            title={img.title}
            className='border-card size-7 rounded-md border-2 object-cover'
          />
        ))}
      </div>
      {images.length > 3 && (
        <span className='text-muted-foreground flex items-center gap-0.5 text-sm'>
          <Images size={10} />+{images.length - 3}
        </span>
      )}
    </button>
  );
}
