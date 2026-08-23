import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, GripVertical } from 'lucide-react';
import { useState } from 'react';

import type { Attraction } from '@/types';

import ImageLightbox from '../ImageLightbox';

import AttractionCardHeader from './AttractionCardHeader';
import AttractionImageStrip from './AttractionImageStrip';
import AttractionReferenceLinks from './AttractionReferenceLinks';
import ClampedMarkdownSection from './ClampedMarkdownSection';

interface Props {
  attraction: Attraction;
  onEdit: (attraction: Attraction) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (attraction: Attraction) => void;
}

export default function AttractionCard({
  attraction,
  onEdit,
  onDelete,
  onDuplicate,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const hasImages = (attraction.images ?? []).length > 0;
  const hasReferences = (attraction.referenceWebsites ?? []).length > 0;
  const hasNearby = !!attraction.nearbyAttractions?.trim();
  const showNotesBottomDivider =
    !!attraction.notes && !hasNearby && (hasImages || hasReferences);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: attraction.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='border-border bg-card hover:border-primary/30 group rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md'
    >
      <div className='flex items-start gap-2'>
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className='text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-grab transition-colors active:cursor-grabbing'
          aria-label='拖曳排序'
        >
          <GripVertical size={16} />
        </button>

        <div className='min-w-0 flex-1'>
          <AttractionCardHeader
            attraction={attraction}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />

          {(attraction.startTime || attraction.endTime) && (
            <p className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
              <Clock size={11} className='shrink-0' />
              {attraction.startTime ?? '–'}
              {' ～ '}
              {attraction.endTime ?? '–'}
            </p>
          )}

          {attraction.notes && (
            <ClampedMarkdownSection
              content={attraction.notes}
              showBottomDivider={showNotesBottomDivider}
            />
          )}

          {hasNearby && (
            <ClampedMarkdownSection
              content={attraction.nearbyAttractions!}
              label='附近景點'
              showBottomDivider={hasImages || hasReferences}
            />
          )}

          {hasImages && (
            <AttractionImageStrip
              images={attraction.images!}
              onOpenLightbox={() => setLightboxIndex(0)}
            />
          )}

          {hasReferences && (
            <AttractionReferenceLinks
              referenceWebsites={attraction.referenceWebsites!}
              showTopDivider={hasImages}
            />
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={attraction.images!}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
