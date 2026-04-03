import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ArrowLeft, MapPin, RefreshCw } from 'lucide-react';

import type { Trip } from '@/types';

interface Props {
  trip: Trip;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

export default function TripHeader({
  trip,
  refreshing,
  onBack,
  onRefresh,
}: Props) {
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
          onClick={onRefresh}
          disabled={refreshing}
          className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition-colors disabled:opacity-40'
          aria-label='重新整理'
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
