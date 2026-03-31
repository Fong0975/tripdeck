import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

import type { Attraction } from '@/types';

interface Props {
  attraction: Attraction;
  onEdit: (attraction: Attraction) => void;
  onDelete: (id: string) => void;
}

export default function AttractionCard({
  attraction,
  onEdit,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(attraction.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='group rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md'
    >
      <div className='flex items-start gap-2'>
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className='mt-0.5 shrink-0 cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing'
          aria-label='拖曳排序'
        >
          <GripVertical size={16} />
        </button>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <h4 className='truncate text-sm font-semibold text-foreground'>
              {attraction.name}
            </h4>
            <div className='flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
              {attraction.googleMapUrl && (
                <a
                  href={attraction.googleMapUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={e => e.stopPropagation()}
                  className='rounded p-1 text-muted-foreground transition-colors hover:text-primary'
                  title='Google Maps'
                >
                  <MapPin size={14} />
                </a>
              )}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit(attraction);
                }}
                className='rounded p-1 text-muted-foreground transition-colors hover:text-foreground'
                title='編輯'
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                className={`rounded p-1 transition-colors ${
                  confirmDelete
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:text-destructive'
                }`}
                title={confirmDelete ? '再次點擊確認' : '刪除'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {attraction.notes && (
            <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
              {attraction.notes}
            </p>
          )}

          {(attraction.referenceWebsites ?? []).length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1'>
              {attraction.referenceWebsites!.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={e => e.stopPropagation()}
                  className='flex items-center gap-0.5 text-xs text-primary hover:underline'
                >
                  <ExternalLink size={10} />
                  <span>參考 {i + 1}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
