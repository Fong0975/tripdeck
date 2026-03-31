import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MapPin, Calendar, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Trip } from '@/types';

interface Props {
  trip: Trip;
  onDelete: (id: string) => void;
}

export default function TripCard({ trip, onDelete }: Props) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const totalDays =
    differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate)) +
    1;

  const formatDate = (iso: string) =>
    format(parseISO(iso), 'yyyy/MM/dd', { locale: zhTW });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onDelete(trip.id);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <div
      onClick={() => navigate(`/trip/${trip.id}`)}
      className='card-hover group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6'
    >
      {/* Glow accent */}
      <div
        className='pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100'
        style={{
          background:
            'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
        }}
      />

      <div className='relative'>
        <div className='mb-3 flex items-start justify-between'>
          <h3 className='pr-8 text-lg font-bold leading-tight text-foreground'>
            {trip.title}
          </h3>
          <button
            onClick={handleDelete}
            className={`absolute right-0 top-0 rounded-lg p-1.5 transition-all ${
              confirming
                ? 'scale-110 bg-destructive text-white'
                : 'text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100'
            }`}
            title={confirming ? '再次點擊確認刪除' : '刪除旅程'}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {trip.destination && (
          <div className='mb-3 flex items-center gap-1.5 text-sm text-muted-foreground'>
            <MapPin size={14} />
            <span>{trip.destination}</span>
          </div>
        )}

        <div className='mb-4 flex items-center gap-1.5 text-sm text-muted-foreground'>
          <Calendar size={14} />
          <span>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </span>
        </div>

        {trip.description && (
          <p className='mb-4 line-clamp-2 text-sm text-muted-foreground'>
            {trip.description}
          </p>
        )}

        <div className='flex items-center justify-between'>
          <span className='rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'>
            {totalDays} 天
          </span>
          <span className='text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100'>
            點擊進入 →
          </span>
        </div>
      </div>
    </div>
  );
}
