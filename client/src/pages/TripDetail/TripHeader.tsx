import {
  ArrowLeft,
  ChartGantt,
  ChevronDown,
  Download,
  Ellipsis,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';

import HoverMenu from '@/components/ui/HoverMenu';
import type { Trip } from '@/types';

import TripHeaderSummary from './TripHeaderSummary';

interface Props {
  trip: Trip;
  onBack: () => void;
  onExport: () => void;
  onOpenTimeline: () => void;
  onEdit: () => void;
  exporting?: boolean;
}

export default function TripHeader({
  trip,
  onBack,
  onExport,
  onOpenTimeline,
  onEdit,
  exporting = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='relative border-b border-border bg-card/50'>
      <div className='mx-auto flex max-w-7xl items-center gap-4 p-4'>
        <button
          onClick={onBack}
          className='flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
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

        <HoverMenu
          ariaLabel='行程選單'
          trigger={<Ellipsis size={20} />}
          triggerClassName='flex size-9 shrink-0 items-center justify-center rounded-lg'
          items={[
            {
              label: '時間軸',
              icon: <ChartGantt size={16} />,
              onSelect: onOpenTimeline,
              title: '檢視行程時間軸',
            },
            {
              label: exporting ? '匯出中…' : '匯出',
              icon: exporting ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <Download size={16} />
              ),
              onSelect: onExport,
              disabled: exporting,
              title: '匯出行程',
            },
          ]}
        />
      </div>

      <button
        type='button'
        onClick={() => setExpanded(v => !v)}
        aria-label={expanded ? '收合旅程詳細資訊' : '展開旅程詳細資訊'}
        title={expanded ? '收合旅程詳細資訊' : '展開旅程詳細資訊'}
        className='absolute bottom-0 left-1/2 z-10 flex size-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:text-foreground'
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
