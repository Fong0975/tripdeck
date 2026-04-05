import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ArrowLeft, Download, MapPin } from 'lucide-react';

import type { Trip } from '@/types';

interface Props {
  trip: Trip;
  onBack: () => void;
  onExport: () => void;
}

export default function TripHeader({ trip, onBack, onExport }: Props) {
  const totalDays =
    differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate)) +
    1;

  const dateRange = `${format(parseISO(trip.startDate), 'yyyy/MM/dd', { locale: zhTW })} – ${format(parseISO(trip.endDate), 'yyyy/MM/dd', { locale: zhTW })}`;

  return (
    <div className='border-border bg-card/50 border-b'>
      <div className='mx-auto flex max-w-screen-xl items-center gap-4 p-4'>
        <button
          onClick={onBack}
          className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition-colors'
          aria-label='返回首頁'
        >
          <ArrowLeft size={20} />
        </button>

        <div className='min-w-0 flex-1'>
          <h1 className='text-foreground truncate text-xl font-bold'>
            {trip.title}
          </h1>
          <div className='text-muted-foreground mt-0.5 flex items-center gap-3 text-sm'>
            {trip.destination && (
              <span className='flex items-center gap-1'>
                <MapPin size={13} /> {trip.destination}
              </span>
            )}
            <span>{dateRange}</span>
            <span className='text-primary font-medium'>{totalDays} 天</span>
          </div>
        </div>

        <button
          onClick={onExport}
          className='text-muted-foreground hover:bg-accent hover:text-foreground flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors'
          title='匯出行程'
        >
          <Download size={16} />
          <span className='hidden sm:inline'>匯出</span>
        </button>
      </div>
    </div>
  );
}
