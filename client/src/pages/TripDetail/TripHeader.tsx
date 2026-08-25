import { ArrowLeft, ChevronDown, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { Trip } from '@/types';

import TripHeaderSummary from './TripHeaderSummary';

interface Props {
  trip: Trip;
  onBack: () => void;
  onExport: () => void;
  onEdit: () => void;
  exporting?: boolean;
}

export default function TripHeader({
  trip,
  onBack,
  onExport,
  onEdit,
  exporting = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='border-border bg-card/50 relative border-b'>
      <div className='mx-auto flex max-w-screen-xl items-center gap-4 p-4'>
        <button
          onClick={onBack}
          className='text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors'
          aria-label='返回首頁'
        >
          <ArrowLeft size={20} />
        </button>

        <TripHeaderSummary
          trip={trip}
          expanded={expanded}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          onEdit={onEdit}
        />

        <button
          onClick={onExport}
          disabled={exporting}
          className='text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:opacity-50'
          title='匯出行程'
        >
          {exporting ? (
            <Loader2 size={16} className='animate-spin' />
          ) : (
            <Download size={16} />
          )}
          <span className='hidden sm:inline'>
            {exporting ? '匯出中…' : '匯出'}
          </span>
        </button>
      </div>

      <button
        type='button'
        onClick={() => setExpanded(v => !v)}
        aria-label={expanded ? '收合旅程詳細資訊' : '展開旅程詳細資訊'}
        title={expanded ? '收合旅程詳細資訊' : '展開旅程詳細資訊'}
        className='border-border bg-card text-muted-foreground hover:text-foreground absolute bottom-0 left-1/2 z-10 flex size-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors'
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
