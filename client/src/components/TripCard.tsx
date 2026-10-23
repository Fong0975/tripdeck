import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MapPin, Calendar, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Trip } from '@/types';
import { getTripTotalDays } from '@/utils/date';

import ConfirmDialog from './ui/ConfirmDialog';

interface Props {
  trip: Trip;
  onDelete: (id: number) => void;
  onEdit: (trip: Trip) => void;
}

export default function TripCard({ trip, onDelete, onEdit }: Props) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const totalDays = getTripTotalDays(trip);

  const formatDate = (iso: string) =>
    format(parseISO(iso), 'yyyy/MM/dd', { locale: zhTW });

  return (
    <div
      onClick={() => navigate(`/trip/${trip.id}`)}
      className='group relative card-hover cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6'
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
          <h3 className='pr-8 text-lg leading-tight font-bold text-foreground'>
            {trip.title}
          </h3>
          <div className='absolute top-0 right-0 flex gap-1'>
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(trip);
              }}
              className='rounded-lg p-1.5 text-muted-foreground transition-all group-hover:opacity-100 hover:bg-accent hover:text-foreground can-hover:opacity-0'
              title='編輯旅程'
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className='rounded-lg p-1.5 text-muted-foreground transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive can-hover:opacity-0'
              title='刪除旅程'
            >
              <Trash2 size={16} />
            </button>
          </div>
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

      {showDeleteConfirm && (
        <div onClick={e => e.stopPropagation()}>
          <ConfirmDialog
            title={`確定要刪除「${trip.title}」嗎？`}
            message='刪除後將無法復原，此旅程的所有資料都會一併移除。'
            confirmLabel='刪除'
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={() => {
              setShowDeleteConfirm(false);
              onDelete(trip.id);
            }}
          />
        </div>
      )}
    </div>
  );
}
