import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { TravelConnection, TransportMode } from '@/types';
import { formatDurationDisplay } from '@/utils/duration';

import ClampedTextSection from './ClampedTextSection';
import ImageLightbox from './ImageLightbox';
import ImageStrip from './ImageStrip';
import ConfirmDialog from './ui/ConfirmDialog';

interface Props {
  connection: TravelConnection;
  onEdit: (connection: TravelConnection) => void;
  onDelete: (connectionId: number) => void;
}

const TRANSPORT_ICONS: Record<TransportMode, string> = {
  walk: '🚶',
  transit: '🚇',
  drive: '🚗',
  bike: '🚲',
  taxi: '🚕',
  flight: '✈️',
  other: '🗺️',
};

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: '步行',
  transit: '大眾運輸',
  drive: '開車',
  bike: '騎車',
  taxi: '計程車／Uber',
  flight: '飛機',
  other: '其他',
};

export default function TravelConnectionItem({
  connection,
  onEdit,
  onDelete,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const durationDisplay = formatDurationDisplay(connection.duration);
  const hasRoute = !!connection.route?.trim();
  const hasNotes = !!connection.notes?.trim();
  const hasImages = (connection.images ?? []).length > 0;

  return (
    <div className='group my-1 flex items-center gap-2 px-3'>
      {/* Vertical line */}
      <div className='flex w-6 shrink-0 flex-col items-center'>
        <div className='h-3 w-px bg-border' />
        <div className='size-1.5 rounded-full bg-primary/50' />
        <div className='h-3 w-px bg-border' />
      </div>

      {/* Connection info */}
      <div
        onClick={() => onEdit(connection)}
        className='flex flex-1 cursor-pointer flex-col gap-1 rounded-lg border border-transparent bg-muted/50 px-3 py-2 text-sm transition-all hover:border-border hover:bg-muted'
      >
        <div className='flex items-center justify-between gap-2'>
          <div className='flex flex-col'>
            <span className='flex items-center gap-1'>
              <span>{TRANSPORT_ICONS[connection.transportMode]}</span>
              <span className='text-muted-foreground'>
                {TRANSPORT_LABELS[connection.transportMode]}
              </span>
            </span>
            {durationDisplay && (
              <span className='text-xs text-muted-foreground'>
                {durationDisplay}
              </span>
            )}
          </div>
          <div className='flex shrink-0 items-center gap-1 transition-opacity group-hover:opacity-100 can-hover:opacity-0'>
            <Pencil size={12} className='text-muted-foreground' />
            <button
              type='button'
              onClick={e => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className='rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive'
              title='刪除'
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {hasRoute && (
          <ClampedTextSection
            content={connection.route!}
            label='路線說明'
            showBottomDivider={!hasNotes && hasImages}
          />
        )}

        {hasNotes && (
          <ClampedTextSection
            content={connection.notes!}
            label='備註'
            markdown={false}
            showBottomDivider={hasImages}
          />
        )}

        {hasImages && (
          <ImageStrip
            images={connection.images!}
            onOpenLightbox={() => setLightboxIndex(0)}
          />
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={connection.images!}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title='確定要刪除這筆交通方式嗎？'
          message='刪除後將無法復原。'
          confirmLabel='刪除'
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete(connection.id);
          }}
        />
      )}
    </div>
  );
}
