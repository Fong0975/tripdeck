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
      className='card-hover border-border bg-card group relative cursor-pointer overflow-hidden rounded-2xl border p-6'
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
          <h3 className='text-foreground pr-8 text-lg font-bold leading-tight'>
            {trip.title}
          </h3>
          <div className='absolute right-0 top-0 flex gap-1'>
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(trip);
              }}
              className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 opacity-0 transition-all group-hover:opacity-100'
              title='編輯旅程'
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg p-1.5 opacity-0 transition-all group-hover:opacity-100'
              title='刪除旅程'
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {trip.destination && (
          <div className='text-muted-foreground mb-3 flex items-center gap-1.5 text-sm'>
            <MapPin size={14} />
            <span>{trip.destination}</span>
          </div>
        )}

        <div className='text-muted-foreground mb-4 flex items-center gap-1.5 text-sm'>
          <Calendar size={14} />
          <span>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </span>
        </div>

        {trip.description && (
          <p className='text-muted-foreground mb-4 line-clamp-2 text-sm'>
            {trip.description}
          </p>
        )}

        <div className='flex items-center justify-between'>
          <span className='bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold'>
            {totalDays} 天
          </span>
          <span className='text-muted-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100'>
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
