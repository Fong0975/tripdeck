import { describe, expect, it } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';
import type { DayPlan } from '@/types';

import { CONTENT_WIDTH_PX } from '../constants';
import type { DaysPerImage } from '../exportOptions';

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
    { count: 0, perImage: 4 as DaysPerImage, expected: [] },
    { count: 1, perImage: 4 as DaysPerImage, expected: [1] },
    { count: 4, perImage: 4 as DaysPerImage, expected: [4] },
    { count: 5, perImage: 4 as DaysPerImage, expected: [3, 2] },
    { count: 7, perImage: 4 as DaysPerImage, expected: [4, 3] },
    { count: 8, perImage: 4 as DaysPerImage, expected: [4, 4] },
    { count: 9, perImage: 4 as DaysPerImage, expected: [3, 3, 3] },
    { count: 3, perImage: 1 as DaysPerImage, expected: [1, 1, 1] },
    { count: 5, perImage: 2 as DaysPerImage, expected: [2, 2, 1] },
    { count: 7, perImage: 3 as DaysPerImage, expected: [3, 3, 1] },
    { count: 7, perImage: 'all' as DaysPerImage, expected: [7] },
    { count: 0, perImage: 'all' as DaysPerImage, expected: [] },
  ])(
    'splits $count days at $perImage per image into groups of $expected',
    ({ count, perImage, expected }) => {
      const items = Array.from({ length: count }, (_, i) => i);

      expect(chunkDays(items, perImage).map(group => group.length)).toEqual(
        expected,
      );
    },
  );

  it('keeps the original order', () => {
    expect(chunkDays([1, 2, 3, 4, 5], 4)).toEqual([
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
    expect(planTimelineImages(days, 4)).toEqual([]);
  });

  it.each([
    { days: 1, expectedWidth: AXIS_WIDTH + DAY_WIDTH },
    { days: 3, expectedWidth: AXIS_WIDTH + 3 * DAY_WIDTH },
    { days: 4, expectedWidth: AXIS_WIDTH + 4 * DAY_WIDTH },
  ])('sizes an image of $days days', ({ days, expectedWidth }) => {
    const plans = planTimelineImages(
      Array.from({ length: days }, (_, i) => timedDay(i + 1)),
      4,
    );

    expect(plans).toHaveLength(1);
    expect(plans[0].width).toBe(expectedWidth);
  });

  it('splits more than four days into several images sharing one range', () => {
    const plans = planTimelineImages(
      [
        timedDay(1, '08:00', '09:00'),
        timedDay(2),
        timedDay(3),
        timedDay(4),
        timedDay(5, '20:00', '21:00'),
      ],
      4,
    );

    expect(plans.map(p => p.timelines.length)).toEqual([3, 2]);
    expect(plans[0].range).toBe(plans[1].range);
    expect(plans[0].range).toMatchObject({ startHour: 8, endHour: 21 });
  });

  it.each([
    { perImage: 1 as DaysPerImage, expected: [1, 1, 1, 1, 1] },
    { perImage: 2 as DaysPerImage, expected: [2, 2, 1] },
    { perImage: 3 as DaysPerImage, expected: [3, 2] },
    { perImage: 'all' as DaysPerImage, expected: [5] },
  ])(
    'groups five days as $expected when set to $perImage per image',
    ({ perImage, expected }) => {
      const plans = planTimelineImages(
        Array.from({ length: 5 }, (_, i) => timedDay(i + 1)),
        perImage,
      );

      expect(plans.map(p => p.timelines.length)).toEqual(expected);
    },
  );

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

      const [plan] = planTimelineImages([day], 4);

      expect(plan.unscheduledHeight).toBe(expected);
      expect(plan.height).toBeGreaterThanOrEqual(HEADER_HEIGHT + expected);
    },
  );

  it.each([4, 7, 10])(
    'fits every image of %i days within the page width and height',
    count => {
      const plans = planTimelineImages(
        [
          timedDay(1, '00:00', '23:30'),
          ...Array.from({ length: count - 1 }, (_, i) => timedDay(i + 2)),
        ],
        'all',
      );

      plans.forEach(plan => {
        expect(plan.displayWidth).toBeLessThanOrEqual(CONTENT_WIDTH_PX);
        expect(plan.displayHeight).toBeLessThanOrEqual(MAX_DISPLAY_HEIGHT_PX);
      });
    },
  );

  it('keeps the same text scale for a full-width image', () => {
    const [plan] = planTimelineImages(
      [timedDay(1), timedDay(2), timedDay(3), timedDay(4)],
      4,
    );

    expect(plan.displayWidth).toBe(CONTENT_WIDTH_PX);
  });

  it('shrinks an image wider than a full one to the page width', () => {
    const [plan] = planTimelineImages(
      Array.from({ length: 6 }, (_, i) => timedDay(i + 1)),
      'all',
    );

    expect(plan.displayWidth).toBe(CONTENT_WIDTH_PX);
  });
});
