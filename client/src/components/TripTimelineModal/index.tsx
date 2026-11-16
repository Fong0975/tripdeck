import { X } from 'lucide-react';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import type { DayPlan } from '@/types';
import { formatDayDate } from '@/utils/dayLabel';

import { buildDayTimeline } from './buildDayTimeline';
import DayTimelineColumn from './DayTimelineColumn';
import TimelineAxis from './TimelineAxis';
import { computeTimelineRange } from './timelineRange';
import UnscheduledSection from './UnscheduledSection';

interface Props {
  days: DayPlan[];
  onClose: () => void;
}

const AXIS_WIDTH = '3.5rem';

/**
 * Near-full-screen modal showing every trip day side by side against a shared
 * vertical time axis. Closes on Escape, backdrop click and the close button.
 */
export default function TripTimelineModal({ days, onClose }: Props) {
  useEscapeToClose(onClose);

  const timelines = useMemo(() => days.map(buildDayTimeline), [days]);
  const range = useMemo(() => computeTimelineRange(timelines), [timelines]);
  const hasUnscheduled = timelines.some(t => t.unscheduled.length > 0);

  return createPortal(
    <div className='fixed inset-0 z-50 p-3 sm:p-6'>
      <div
        data-testid='timeline-backdrop'
        className='absolute inset-0 bg-black/50 backdrop-blur-xs'
        onClick={onClose}
      />

      <div
        role='dialog'
        aria-modal='true'
        aria-label='行程時間軸'
        className='relative flex size-full animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl'
      >
        <div className='flex items-center justify-between px-5 py-4'>
          <h2 className='text-xl font-bold text-foreground'>行程時間軸</h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='關閉時間軸'
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        {days.length === 0 ? (
          <p className='px-5 pb-6 text-muted-foreground'>尚無行程可顯示</p>
        ) : (
          <div className='min-h-0 flex-1 overflow-auto'>
            <div
              className='grid min-w-full'
              style={{
                gridTemplateColumns: `${AXIS_WIDTH} repeat(${days.length}, minmax(15rem, 1fr))`,
              }}
            >
              <div className='sticky top-0 left-0 z-30 border-b border-border bg-card' />
              {timelines.map(({ day }, i) => (
                <div
                  key={day.id}
                  style={{ gridColumn: i + 2, gridRow: 1 }}
                  className='sticky top-0 z-20 border-b border-l border-border bg-card px-3 py-2 text-center'
                >
                  <p className='text-xs text-muted-foreground'>
                    {formatDayDate(day.date, 'M/d (EEE)')}
                  </p>
                  <p className='text-lg font-semibold text-foreground'>
                    Day {day.day}
                  </p>
                </div>
              ))}

              {hasUnscheduled && (
                <>
                  <div
                    style={{ gridColumn: 1, gridRow: 2 }}
                    className='sticky left-0 z-10 bg-card px-1 pt-2 text-right text-xs text-muted-foreground'
                  >
                    未排時間
                  </div>
                  {timelines.map(({ day, unscheduled }, i) => (
                    <div
                      key={day.id}
                      style={{ gridColumn: i + 2, gridRow: 2 }}
                      className='border-b border-l border-border'
                    >
                      {unscheduled.length > 0 && (
                        <UnscheduledSection attractions={unscheduled} />
                      )}
                    </div>
                  ))}
                </>
              )}

              {range && (
                <>
                  <div
                    style={{ gridColumn: 1, gridRow: 3 }}
                    className='sticky left-0 z-10 bg-card'
                  >
                    <TimelineAxis range={range} />
                  </div>
                  {timelines.map((timeline, i) => (
                    <DayTimelineColumn
                      key={timeline.day.id}
                      timeline={timeline}
                      range={range}
                      column={i + 2}
                    />
                  ))}
                </>
              )}
            </div>
            {!range && (
              <p className='px-5 py-6 text-muted-foreground'>
                尚未為任何景點設定時間
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
