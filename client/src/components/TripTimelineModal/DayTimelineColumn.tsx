import type { DayTimeline } from './buildDayTimeline';
import { PX_PER_MINUTE, layoutDay } from './layoutCards';
import TimelineBlockView, { LANE_WIDTH } from './TimelineBlockView';
import type { TimelineRange } from './timelineRange';

interface Props {
  timeline: DayTimeline;
  range: TimelineRange;
  /** Explicit grid column, so the cell lines up with the header. */
  column: number;
}

/**
 * The time area of one day: hour grid lines, the lane track of color bars and
 * the cards beside it. Placed in the timeline grid's third row.
 */
export default function DayTimelineColumn({ timeline, range, column }: Props) {
  const { items, height } = layoutDay(timeline.blocks, range);
  const laneCount = Math.max(1, ...timeline.blocks.map(b => b.laneCount));
  const trackWidth = laneCount * LANE_WIDTH + 2;
  const hours = range.endHour - range.startHour;

  return (
    <div
      style={{ gridColumn: column, gridRow: 3, height }}
      className='relative border-l border-border'
    >
      {Array.from({ length: hours }, (_, i) => (
        <div
          key={i}
          aria-hidden='true'
          style={{ top: i * 60 * PX_PER_MINUTE }}
          className='absolute inset-x-0 border-t border-border/50'
        />
      ))}
      {items.map(item => (
        <TimelineBlockView
          key={item.block.key}
          item={item}
          trackWidth={trackWidth}
        />
      ))}
    </div>
  );
}
