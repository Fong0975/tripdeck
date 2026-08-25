import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Images, MapPin, Pencil } from 'lucide-react';
import { useState } from 'react';

import ImageLightbox from '@/components/ImageLightbox';
import ImageStrip from '@/components/ImageStrip';
import type { Trip } from '@/types';
import { getTripTotalDays } from '@/utils/date';

interface Props {
  trip: Trip;
  expanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onEdit: () => void;
}

/**
 * The collapsed summary line (title + date range/description) and its
 * hover-revealed details drawer (total days, destination, description,
 * image strip). `expanded` is owned by the parent `TripHeader` so it can be
 * shared with the edge chevron button that also toggles this drawer.
 */
export default function TripHeaderSummary({
  trip,
  expanded,
  onMouseEnter,
  onMouseLeave,
  onEdit,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const totalDays = getTripTotalDays(trip);
  const imageCount = trip.images?.length ?? 0;

  const dateRange = `${format(parseISO(trip.startDate), 'yyyy/MM/dd', { locale: zhTW })} – ${format(parseISO(trip.endDate), 'yyyy/MM/dd', { locale: zhTW })}`;

  const imageCountBadge = imageCount > 0 && (
    <span className='inline-flex shrink-0 items-center gap-0.5 opacity-80'>
      <Images size={11} />
      {imageCount}
    </span>
  );

  return (
    <div
      className='flex min-w-0 flex-1 flex-col'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className='flex min-h-9 items-center gap-2'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <h1 className='text-foreground min-w-0 shrink truncate text-xl font-bold'>
            {trip.title}
          </h1>

          <div
            role='group'
            aria-label='旅程摘要資訊'
            aria-hidden={expanded}
            className={`grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${
              expanded ? 'grid-cols-[0fr]' : 'grid-cols-[1fr]'
            }`}
          >
            <div className='min-w-0 overflow-hidden'>
              <div
                className={`border-border text-muted-foreground flex min-w-0 shrink flex-col justify-center gap-0.5 border-l pl-3 text-xs leading-tight transition-opacity duration-200 ${
                  expanded ? 'opacity-0' : 'opacity-100 delay-100'
                }`}
              >
                <span className='flex min-w-0 items-center gap-1'>
                  <span className='truncate'>{dateRange}</span>
                  {!trip.description && imageCountBadge}
                </span>
                {trip.description && (
                  <span className='flex min-w-0 items-center gap-1'>
                    <span className='truncate'>{trip.description}</span>
                    {imageCountBadge}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onEdit}
          className='text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors'
          aria-label='編輯旅程資訊'
          title='編輯旅程資訊'
        >
          <Pencil size={18} />
        </button>
      </div>

      <div
        role='group'
        aria-label='旅程詳細資訊'
        aria-hidden={!expanded}
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className='overflow-hidden'>
          <div
            className={`border-border text-muted-foreground mt-2 flex flex-col gap-1 border-t pt-2 text-sm transition-opacity duration-200 ${
              expanded ? 'opacity-100 delay-100' : 'opacity-0'
            }`}
          >
            <div className='flex items-center gap-3'>
              <span>{dateRange}</span>
              <span className='text-primary font-medium'>{totalDays} 天</span>
            </div>
            {trip.destination && (
              <span className='flex items-center gap-1'>
                <MapPin size={13} /> {trip.destination}
              </span>
            )}
            {trip.description && (
              <p className='line-clamp-2'>{trip.description}</p>
            )}
            {imageCount > 0 && (
              <ImageStrip
                images={trip.images ?? []}
                onOpenLightbox={() => setLightboxIndex(0)}
              />
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && trip.images && (
        <ImageLightbox
          images={trip.images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
