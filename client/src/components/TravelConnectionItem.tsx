import { Images, Pencil, Trash2 } from 'lucide-react';

import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import type { TravelConnection, TransportMode } from '@/types';
import { formatDurationDisplay } from '@/utils/duration';

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
  const durationDisplay = formatDurationDisplay(connection.duration);
  const { confirming: confirmDelete, handleClick: handleDelete } =
    useConfirmDelete(() => onDelete(connection.id));

  return (
    <div className='group my-1 flex items-center gap-2 px-3'>
      {/* Vertical line */}
      <div className='flex w-6 shrink-0 flex-col items-center'>
        <div className='bg-border h-3 w-px' />
        <div className='bg-primary/50 size-1.5 rounded-full' />
        <div className='bg-border h-3 w-px' />
      </div>

      {/* Connection info */}
      <div
        onClick={() => onEdit(connection)}
        className='bg-muted/50 hover:border-border hover:bg-muted flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-all'
      >
        <div className='flex items-center gap-2'>
          <span>{TRANSPORT_ICONS[connection.transportMode]}</span>
          <span className='text-muted-foreground'>
            {TRANSPORT_LABELS[connection.transportMode]}
          </span>
          {durationDisplay && (
            <>
              <span className='text-muted-foreground/50'>·</span>
              <span className='text-muted-foreground'>{durationDisplay}</span>
            </>
          )}
          {(connection.images ?? []).length > 0 && (
            <>
              <span className='text-muted-foreground/50'>·</span>
              <span className='text-muted-foreground flex items-center gap-0.5'>
                <Images size={12} />
                {connection.images!.length}
              </span>
            </>
          )}
        </div>
        <div className='flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
          <Pencil size={12} className='text-muted-foreground' />
          <button
            type='button'
            onClick={handleDelete}
            className={`rounded p-0.5 transition-colors ${
              confirmDelete
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:text-destructive'
            }`}
            title={confirmDelete ? '再次點擊確認' : '刪除'}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
