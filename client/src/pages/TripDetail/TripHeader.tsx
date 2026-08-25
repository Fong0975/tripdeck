import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ArrowLeft, Download, Loader2, MapPin, Pencil } from 'lucide-react';
import { useState } from 'react';

import type { Trip } from '@/types';
import { getTripTotalDays } from '@/utils/date';

interface Props {
  trip: Trip;
  onBack: () => void;
  onExport: () => void;
  onEdit: () => void;
  exporting?: boolean;
}

export default function TripHeader({
  trip,
  onBack,
  onExport,
  onEdit,
  exporting = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalDays = getTripTotalDays(trip);

  const dateRange = `${format(parseISO(trip.startDate), 'yyyy/MM/dd', { locale: zhTW })} – ${format(parseISO(trip.endDate), 'yyyy/MM/dd', { locale: zhTW })}`;

  return (
    <div className='border-border bg-card/50 border-b'>
      <div className='mx-auto flex max-w-screen-xl items-start gap-4 p-4'>
        <button
          onClick={onBack}
          className='text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors'
          aria-label='返回首頁'
        >
          <ArrowLeft size={20} />
        </button>

        <div
          className='flex min-w-0 flex-1 flex-col gap-2'
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
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
                    <span className='truncate'>{dateRange}</span>
                    {trip.description && (
                      <span className='truncate'>{trip.description}</span>
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
                className={`border-border text-muted-foreground flex flex-col gap-1 border-t pt-2 text-sm transition-opacity duration-200 ${
                  expanded ? 'opacity-100 delay-100' : 'opacity-0'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <span>{dateRange}</span>
                  <span className='text-primary font-medium'>
                    {totalDays} 天
                  </span>
                </div>
                {trip.destination && (
                  <span className='flex items-center gap-1'>
                    <MapPin size={13} /> {trip.destination}
                  </span>
                )}
                {trip.description && (
                  <p className='line-clamp-2'>{trip.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onExport}
          disabled={exporting}
          className='text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:opacity-50'
          title='匯出行程'
        >
          {exporting ? (
            <Loader2 size={16} className='animate-spin' />
          ) : (
            <Download size={16} />
          )}
          <span className='hidden sm:inline'>
            {exporting ? '匯出中…' : '匯出'}
          </span>
        </button>
      </div>
    </div>
  );
}
