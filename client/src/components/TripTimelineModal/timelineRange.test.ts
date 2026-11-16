import { describe, expect, it } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { buildDayTimeline } from './buildDayTimeline';
import { computeTimelineRange } from './timelineRange';

function rangeOf(...times: [string | null, string | null][][]) {
  const timelines = times.map(dayTimes =>
    buildDayTimeline(
      makeDay({
        attractions: dayTimes.map(([startTime, endTime], i) =>
          makeAttraction({ id: i + 1, startTime, endTime }),
        ),
      }),
    ),
  );
  return computeTimelineRange(timelines);
}

describe('computeTimelineRange', () => {
  it.each([
    {
      description: 'rounds outward to whole hours',
      days: [[['09:20', '13:10']]] as [string | null, string | null][][],
      expected: { startHour: 9, endHour: 14 },
    },
    {
      description: 'covers every day',
      days: [[['09:00', '12:00']], [['15:00', '20:00']]] as [
        string | null,
        string | null,
      ][][],
      expected: { startHour: 9, endHour: 20 },
    },
    {
      description: 'widens a short range to the minimum span',
      days: [[['10:00', '11:00']]] as [string | null, string | null][][],
      expected: { startHour: 10, endHour: 14 },
    },
    {
      description: 'counts the minimum span of a point marker',
      days: [[['09:00', null]]] as [string | null, string | null][][],
      expected: { startHour: 9, endHour: 13 },
    },
    {
      description: 'widens backwards when the end hits midnight',
      days: [[['22:00', '23:59']]] as [string | null, string | null][][],
      expected: { startHour: 20, endHour: 24 },
    },
  ])('$description', ({ days, expected }) => {
    expect(rangeOf(...days)).toEqual(expected);
  });

  it('returns null when nothing is scheduled', () => {
    expect(rangeOf([[null, null]])).toBeNull();
    expect(computeTimelineRange([])).toBeNull();
  });
});
