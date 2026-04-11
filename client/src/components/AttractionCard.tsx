import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
  Images,
  Clock,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import type { Attraction } from '@/types';

import ImageLightbox from './ImageLightbox';
import MarkdownContent from './MarkdownContent';

interface Props {
  attraction: Attraction;
  onEdit: (attraction: Attraction) => void;
  onDelete: (id: number) => void;
}

export default function AttractionCard({
  attraction,
  onEdit,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesClamped, setNotesClamped] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = notesRef.current;
    if (el) {
      setNotesClamped(el.scrollHeight > el.clientHeight);
    }
  }, [attraction.notes]);

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
          <div className='flex items-center justify-between gap-2'>
            <h4 className='text-foreground truncate text-base font-semibold'>
              {attraction.name}
            </h4>
            <div className='flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit(attraction);
                }}
                className='text-muted-foreground hover:text-foreground rounded p-1 transition-colors'
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

          {(attraction.startTime || attraction.endTime) && (
            <p className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
              <Clock size={11} className='shrink-0' />
              {attraction.startTime ?? '–'}
              {' ～ '}
              {attraction.endTime ?? '–'}
            </p>
          )}

          {attraction.notes && (
            <div className='my-3'>
              <hr className='border-border mb-3' />
              <div
                ref={notesRef}
                className={`text-muted-foreground text-sm ${notesExpanded ? '' : 'line-clamp-3'}`}
              >
                <MarkdownContent>{attraction.notes}</MarkdownContent>
              </div>
              {(notesClamped || notesExpanded) && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setNotesExpanded(prev => !prev);
                  }}
                  className='text-primary/60 hover:text-primary mt-0.5 text-sm transition-colors'
                >
                  {notesExpanded ? '收起' : '展開'}
                </button>
              )}
              <hr className='border-border mt-3' />
            </div>
          )}

          {(attraction.images ?? []).length > 0 && (
            <button
              type='button'
              onClick={e => {
                e.stopPropagation();
                setLightboxIndex(0);
              }}
              className='mt-2 flex items-center gap-1.5 transition-opacity hover:opacity-80'
            >
              <div className='flex -space-x-2'>
                {attraction.images!.slice(0, 3).map(img => (
                  <img
                    key={img.id}
                    src={`/uploads/${img.filename}`}
                    alt={img.title}
                    title={img.title}
                    className='border-card size-7 rounded-md border-2 object-cover'
                  />
                ))}
              </div>
              {attraction.images!.length > 3 && (
                <span className='text-muted-foreground flex items-center gap-0.5 text-sm'>
                  <Images size={10} />+{attraction.images!.length - 3}
                </span>
              )}
            </button>
          )}

          {(attraction.referenceWebsites ?? []).length > 0 && (
            <>
              <hr className='border-border mt-3' />
              <div className='mt-2 flex flex-wrap gap-1'>
                {attraction.referenceWebsites!.map((site, i) => (
                  <a
                    key={i}
                    href={site.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    onClick={e => e.stopPropagation()}
                    className='text-primary flex items-center gap-0.5 text-sm hover:underline'
                  >
                    <ExternalLink size={10} />
                    <span>{site.title || site.url}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          {attraction.googleMapUrl && (
            <div className='mt-2 flex justify-end'>
              <a
                href={attraction.googleMapUrl}
                target='_blank'
                rel='noopener noreferrer'
                onClick={e => e.stopPropagation()}
                className='text-primary/60 hover:text-primary flex items-center gap-1 text-sm transition-colors'
                title='Google Maps'
              >
                <MapPin size={12} />
                地圖
              </a>
            </div>
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
