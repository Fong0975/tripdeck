import { Copy, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { Attraction } from '@/types';

import ConfirmDialog from '../ui/ConfirmDialog';

interface AttractionCardHeaderProps {
  attraction: Attraction;
  onEdit: (attraction: Attraction) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (attraction: Attraction) => void;
}

export default function AttractionCardHeader({
  attraction,
  onEdit,
  onDelete,
  onDuplicate,
}: AttractionCardHeaderProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className='relative'>
      <h4 className='text-base font-semibold text-foreground'>
        {attraction.name}
        {attraction.googleMapUrl && (
          <a
            href={attraction.googleMapUrl}
            target='_blank'
            rel='noopener noreferrer'
            onClick={e => e.stopPropagation()}
            className='ml-1.5 inline-flex align-middle text-primary/60 transition-colors hover:text-primary'
            title='Google Maps'
          >
            <MapPin size={14} />
          </a>
        )}
      </h4>
      <div className='absolute top-0 right-0 flex items-center gap-1 rounded-sm bg-card transition-opacity group-hover:opacity-100 can-hover:opacity-0'>
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit(attraction);
          }}
          className='rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground'
          title='編輯'
        >
          <Pencil size={14} />
        </button>
        {onDuplicate && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDuplicate(attraction);
            }}
            className='rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground'
            title='複製'
          >
            <Copy size={14} />
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className='rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive'
          title='刪除'
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showDeleteConfirm && (
        <div onClick={e => e.stopPropagation()}>
          <ConfirmDialog
            title={`確定要刪除「${attraction.name}」嗎？`}
            message='刪除後將無法復原。'
            confirmLabel='刪除'
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={() => {
              setShowDeleteConfirm(false);
              onDelete(attraction.id);
            }}
          />
        </div>
      )}
    </div>
  );
}
