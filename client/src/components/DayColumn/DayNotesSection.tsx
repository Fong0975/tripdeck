import { ChevronDown, FileText, Images, Pencil } from 'lucide-react';
import { useState } from 'react';

import ImageLightbox from '@/components/ImageLightbox';
import ImageStrip from '@/components/ImageStrip';
import type { DayPlan } from '@/types';

interface Props {
  day: DayPlan;
  onEdit: () => void;
}

/**
 * Shows an edit-notes icon button next to each day's date. When the day has
 * notes and/or images, a summary row (icon counts + chevron) appears beside
 * it, and hovering over the whole row opens a drawer-style panel with the
 * full notes text and image thumbnails.
 */
export default function DayNotesSection({ day, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const hasNotes = Boolean(day.notes?.trim());
  const images = day.images ?? [];
  const hasSummary = hasNotes || images.length > 0;

  return (
    <div
      className='mt-1.5'
      onMouseEnter={() => hasSummary && setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className='flex items-center justify-center gap-1'>
        <button
          type='button'
          onClick={onEdit}
          aria-label='編輯日備註'
          title='編輯日備註'
          className='flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
        >
          <Pencil size={14} />
        </button>

        {hasSummary && (
          <div className='flex items-center gap-1.5 border-l border-border pl-1.5 text-xs text-muted-foreground'>
            {hasNotes && <FileText size={12} aria-label='含備註文字' />}
            {images.length > 0 && (
              <span className='flex items-center gap-0.5'>
                <Images size={12} />
                {images.length}
              </span>
            )}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        )}
      </div>

      {hasSummary && (
        <div
          role='group'
          aria-label='該日備註與圖片'
          aria-hidden={!expanded}
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className='overflow-hidden'>
            <div
              className={`mt-2 space-y-2 rounded-xl border border-border bg-muted/60 p-3 text-left shadow-inner transition-opacity duration-200 ${
                expanded ? 'opacity-100 delay-100' : 'opacity-0'
              }`}
            >
              {hasNotes && (
                <p className='text-xs whitespace-pre-wrap text-foreground'>
                  {day.notes}
                </p>
              )}
              {images.length > 0 && (
                <ImageStrip
                  images={images}
                  onOpenLightbox={() => setLightboxIndex(0)}
                />
              )}
            </div>
          </div>
        </div>
      )}

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
