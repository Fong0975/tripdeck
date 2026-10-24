import { X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import type { DayPlan } from '@/types';
import { formatDayDate } from '@/utils/dayLabel';

interface Props {
  days: DayPlan[];
  initialDayIndex: number;
  onClose: () => void;
}

const PANEL_ID = 'day-map-panel';
const ARROW_STEPS: Partial<Record<string, number>> = {
  ArrowRight: 1,
  ArrowLeft: -1,
};

function tabId(day: DayPlan): string {
  return `day-map-tab-${day.id}`;
}

/**
 * Near-full-screen modal with one tab per trip day. Opens on the day whose
 * map button was clicked; the area below the tabs is the map for the selected
 * day. Closes on Escape, backdrop click and the close button; the tabs follow
 * the WAI-ARIA pattern (roving tabindex, Left/Right arrows wrap around).
 */
export default function DayMapModal({ days, initialDayIndex, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(initialDayIndex);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handle = (e: WindowEventMap['keydown']) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const activeDay = days[activeIndex];
  if (!activeDay) {
    return null;
  }

  const selectTab = (index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[e.key];
    if (step === undefined) {
      return;
    }
    e.preventDefault();
    selectTab((activeIndex + step + days.length) % days.length);
  };

  return createPortal(
    <div className='fixed inset-0 z-50 p-3 sm:p-6'>
      <div
        data-testid='day-map-backdrop'
        className='absolute inset-0 bg-black/50 backdrop-blur-xs'
        onClick={onClose}
      />

      <div
        role='dialog'
        aria-modal='true'
        aria-label='行程地圖'
        className='relative flex size-full animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl'
      >
        <div className='flex items-center justify-between px-5 pt-4'>
          <h2 className='text-xl font-bold text-foreground'>行程地圖</h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='關閉地圖'
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        <div
          role='tablist'
          aria-label='選擇日期'
          onKeyDown={handleTabKeyDown}
          className='flex shrink-0 overflow-x-auto border-b border-border px-3'
        >
          {days.map((day, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={day.id}
                ref={el => {
                  tabRefs.current[index] = el;
                }}
                id={tabId(day)}
                type='button'
                role='tab'
                aria-selected={selected}
                aria-controls={PANEL_ID}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(index)}
                className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                第 {day.day} 天
                <span className='ml-1.5 text-xs font-normal opacity-70'>
                  {formatDayDate(day.date, 'M/d')}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id={PANEL_ID}
          role='tabpanel'
          aria-labelledby={tabId(activeDay)}
          className='relative flex min-h-0 flex-1 items-center justify-center bg-muted/30'
        >
          <p className='text-sm text-muted-foreground'>
            第 {activeDay.day} 天 · {activeDay.attractions.length} 個景點
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
