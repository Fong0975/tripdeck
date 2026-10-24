import { useRef, type KeyboardEvent } from 'react';

import type { DayPlan } from '@/types';
import { formatDayDate } from '@/utils/dayLabel';

import { dayTabId } from './dayTabId';

interface Props {
  days: DayPlan[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Id of the tabpanel these tabs control. */
  panelId: string;
}

const ARROW_STEPS: Partial<Record<string, number>> = {
  ArrowRight: 1,
  ArrowLeft: -1,
};

/**
 * One tab per trip day, following the WAI-ARIA tabs pattern: only the
 * selected tab is in the tab order, and Left/Right arrows move the selection
 * (and focus) with wrap-around.
 */
export default function DayTabs({
  days,
  activeIndex,
  onSelect,
  panelId,
}: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectTab = (index: number) => {
    onSelect(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[e.key];
    if (step === undefined) {
      return;
    }
    e.preventDefault();
    selectTab((activeIndex + step + days.length) % days.length);
  };

  return (
    <div
      role='tablist'
      aria-label='選擇日期'
      onKeyDown={handleKeyDown}
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
            id={dayTabId(day)}
            type='button'
            role='tab'
            aria-selected={selected}
            aria-controls={panelId}
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
  );
}
