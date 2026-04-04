import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { AttractionImage } from '@/types';

interface Props {
  images: AttractionImage[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const prev = () => setIndex(i => i - 1);
  const next = () => setIndex(i => i + 1);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowLeft' && hasPrev) {
        prev();
      }
      if (e.key === 'ArrowRight' && hasNext) {
        next();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [hasPrev, hasNext, onClose]);

  const current = images[index];

  return createPortal(
    <div className='fixed inset-0 z-[60] flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/85 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className='absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20'
      >
        <X size={20} />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={e => {
            e.stopPropagation();
            prev();
          }}
          className='absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20'
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image */}
      <div
        className='relative z-10 flex max-h-[85vh] max-w-[90vw] flex-col items-center gap-3'
        onClick={e => e.stopPropagation()}
      >
        <img
          key={current.id}
          src={`/uploads/${current.filename}`}
          alt={current.title}
          className='max-h-[78vh] max-w-[90vw] rounded-xl object-contain shadow-2xl'
        />
        <div className='flex items-center gap-2 text-sm text-white/80'>
          <span>{current.title}</span>
          {images.length > 1 && (
            <span className='text-white/40'>
              {index + 1} / {images.length}
            </span>
          )}
        </div>
      </div>

      {/* Next */}
      {hasNext && (
        <button
          onClick={e => {
            e.stopPropagation();
            next();
          }}
          className='absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20'
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>,
    document.body,
  );
}
