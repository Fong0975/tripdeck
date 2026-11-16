import { describe, expect, it } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';
import type { DayPlan } from '@/types';

import { CONTENT_WIDTH_PX } from '../constants';

import {
  AXIS_WIDTH,
  DAY_WIDTH,
  HEADER_HEIGHT,
  MAX_DISPLAY_HEIGHT_PX,
  UNSCHEDULED_PADDING,
  UNSCHEDULED_ROW_HEIGHT,
  chunkDays,
  planTimelineImages,
} from './timelineImageLayout';

function timedDay(id: number, start = '09:00', end = '10:00'): DayPlan {
  return makeDay({
    id,
    day: id,
    attractions: [
      makeAttraction({ id: id * 10, startTime: start, endTime: end }),
    ],
  });
}

describe('chunkDays', () => {
  it.each([
    { count: 0, expected: [] },
    { count: 1, expected: [1] },
    { count: 4, expected: [4] },
    { count: 5, expected: [3, 2] },
    { count: 7, expected: [4, 3] },
    { count: 8, expected: [4, 4] },
    { count: 9, expected: [3, 3, 3] },
  ])('splits $count days into groups of $expected', ({ count, expected }) => {
    const items = Array.from({ length: count }, (_, i) => i);

    expect(chunkDays(items).map(group => group.length)).toEqual(expected);
  });

  it('keeps the original order', () => {
    expect(chunkDays([1, 2, 3, 4, 5])).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });
});

describe('planTimelineImages', () => {
  it.each([
    { description: 'there are no days', days: [] },
    {
      description: 'no attraction has a time',
      days: [makeDay({ attractions: [makeAttraction()] })],
    },
  ])('returns no plans when $description', ({ days }) => {
    expect(planTimelineImages(days)).toEqual([]);
  });

  it.each([
    { days: 1, expectedWidth: AXIS_WIDTH + DAY_WIDTH },
    { days: 3, expectedWidth: AXIS_WIDTH + 3 * DAY_WIDTH },
    { days: 4, expectedWidth: AXIS_WIDTH + 4 * DAY_WIDTH },
  ])('sizes an image of $days days', ({ days, expectedWidth }) => {
    const plans = planTimelineImages(
      Array.from({ length: days }, (_, i) => timedDay(i + 1)),
    );

    expect(plans).toHaveLength(1);
    expect(plans[0].width).toBe(expectedWidth);
  });

  it('splits more than four days into several images sharing one range', () => {
    const plans = planTimelineImages([
      timedDay(1, '08:00', '09:00'),
      timedDay(2),
      timedDay(3),
      timedDay(4),
      timedDay(5, '20:00', '21:00'),
    ]);

    expect(plans.map(p => p.timelines.length)).toEqual([3, 2]);
    expect(plans[0].range).toBe(plans[1].range);
    expect(plans[0].range).toMatchObject({ startHour: 8, endHour: 21 });
  });

  it.each([
    { unscheduled: 0, expected: 0 },
    {
      unscheduled: 1,
      expected: UNSCHEDULED_PADDING * 2 + UNSCHEDULED_ROW_HEIGHT,
    },
    {
      unscheduled: 3,
      expected: UNSCHEDULED_PADDING * 2 + 3 * UNSCHEDULED_ROW_HEIGHT,
    },
  ])(
    'reserves $expected px for $unscheduled unscheduled attractions',
    ({ unscheduled, expected }) => {
      const day = timedDay(1);
      day.attractions.push(
        ...Array.from({ length: unscheduled }, (_, i) =>
          makeAttraction({ id: 100 + i }),
        ),
      );

      const [plan] = planTimelineImages([day]);

      expect(plan.unscheduledHeight).toBe(expected);
      expect(plan.height).toBeGreaterThanOrEqual(HEADER_HEIGHT + expected);
    },
  );

  it('fits every image within the page width and height', () => {
    const plans = planTimelineImages([
      timedDay(1, '00:00', '23:30'),
      timedDay(2),
      timedDay(3),
      timedDay(4),
    ]);

    plans.forEach(plan => {
      expect(plan.displayWidth).toBeLessThanOrEqual(CONTENT_WIDTH_PX);
      expect(plan.displayHeight).toBeLessThanOrEqual(MAX_DISPLAY_HEIGHT_PX);
    });
  });

  it('keeps the same text scale for a full-width image', () => {
    const [plan] = planTimelineImages([
      timedDay(1),
      timedDay(2),
      timedDay(3),
      timedDay(4),
    ]);

    expect(plan.displayWidth).toBe(CONTENT_WIDTH_PX);
  });
});
