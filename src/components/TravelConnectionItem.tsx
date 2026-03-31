import { Pencil } from 'lucide-react';

import type { TravelConnection, TransportMode } from '@/types';

interface Props {
  connection: TravelConnection;
  onEdit: (connection: TravelConnection) => void;
}

const TRANSPORT_ICONS: Record<TransportMode, string> = {
  walk: '🚶',
  transit: '🚇',
  drive: '🚗',
  bike: '🚲',
  flight: '✈️',
  other: '🗺️',
};

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: '步行',
  transit: '大眾運輸',
  drive: '開車',
  bike: '騎車',
  flight: '飛機',
  other: '其他',
};

export default function TravelConnectionItem({ connection, onEdit }: Props) {
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
        className='flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent bg-muted/50 px-3 py-1.5 text-xs transition-all hover:border-border hover:bg-muted'
      >
        <div className='flex items-center gap-1.5'>
          <span>{TRANSPORT_ICONS[connection.transportMode]}</span>
          <span className='text-muted-foreground'>
            {TRANSPORT_LABELS[connection.transportMode]}
          </span>
          {connection.duration && (
            <>
              <span className='text-muted-foreground/50'>·</span>
              <span className='text-muted-foreground'>
                {connection.duration}
              </span>
            </>
          )}
        </div>
        <Pencil
          size={11}
          className='shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100'
        />
      </div>
    </div>
  );
}
