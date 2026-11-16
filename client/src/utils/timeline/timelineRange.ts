import { occupiedEnd, type DayTimeline } from './buildDayTimeline';
import { MINUTES_PER_DAY } from './parseTime';

/** Fewest hours the visible range spans, so sparse days stay readable. */
export const MIN_RANGE_HOURS = 4;

/** The visible hour range of the timeline axis. */
export interface TimelineRange {
  /** First visible hour (inclusive), 0-23. */
  startHour: number;
  /** Last visible hour boundary (exclusive end), 1-24. */
  endHour: number;
}

/**
 * Computes the shared hour range covering every block of every day, rounded
 * outward to whole hours and widened to at least {@link MIN_RANGE_HOURS}.
 *
 * @param timelines - The laid-out days.
 * @returns The range, or null when no day has a scheduled block.
 */
export function computeTimelineRange(
  timelines: DayTimeline[],
): TimelineRange | null {
  const blocks = timelines.flatMap(t => t.blocks);
  if (blocks.length === 0) {
    return null;
  }
  const minStart = Math.min(...blocks.map(b => b.start));
  const maxEnd = Math.min(
    MINUTES_PER_DAY,
    Math.max(...blocks.map(b => occupiedEnd(b))),
  );

  let startHour = Math.floor(minStart / 60);
  let endHour = Math.ceil(maxEnd / 60);

  if (endHour - startHour < MIN_RANGE_HOURS) {
    endHour = Math.min(24, startHour + MIN_RANGE_HOURS);
    startHour = Math.max(0, endHour - MIN_RANGE_HOURS);
  }
  return { startHour, endHour };
}
