import { describe, expect, it } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { buildDayTimeline } from './buildDayTimeline';
import {
  CARD_GAP,
  CARD_HEIGHT,
  MIN_BAR_HEIGHT,
  POINT_MARKER_HEIGHT,
  layoutDay,
} from './layoutCards';

const RANGE = { startHour: 9, endHour: 13 };

function layout(times: [string | null, string | null][]) {
  const { blocks } = buildDayTimeline(
    makeDay({
      attractions: times.map(([startTime, endTime], i) =>
        makeAttraction({ id: i + 1, startTime, endTime }),
      ),
    }),
  );
  return layoutDay(blocks, RANGE);
}

describe('layoutDay', () => {
  it.each([
    {
      description: 'a range bar spans its duration from the range origin',
      times: [['10:00', '11:30']] as [string, string][],
      expected: { barTop: 60, barHeight: 90, cardTop: 60 },
    },
    {
      description: 'a point uses the marker height',
      times: [['09:00', null]] as [string, string | null][],
      expected: { barTop: 0, barHeight: POINT_MARKER_HEIGHT, cardTop: 0 },
    },
    {
      description: 'a very short range keeps a minimum bar height',
      times: [['09:00', '09:02']] as [string, string][],
      expected: { barTop: 0, barHeight: MIN_BAR_HEIGHT, cardTop: 0 },
    },
  ])('$description', ({ times, expected }) => {
    const { items } = layout(times);

    expect(items[0]).toMatchObject(expected);
  });

  it('pushes a card down when it would overlap the previous one', () => {
    const { items } = layout([
      ['09:00', '11:00'],
      ['09:10', '10:00'],
    ]);

    expect(items[1].barTop).toBe(10);
    expect(items[1].cardTop).toBe(CARD_HEIGHT + CARD_GAP);
  });

  it.each([
    {
      description: 'the axis height when cards fit',
      times: [['09:00', '10:00']] as [string, string][],
      expected: 240,
    },
    {
      description: 'the card stack when it runs past the axis',
      times: Array.from({ length: 6 }, () => ['12:30', '13:00']) as [
        string,
        string,
      ][],
      expected: 210 + 6 * (CARD_HEIGHT + CARD_GAP),
    },
  ])('sizes the area to $description', ({ times, expected }) => {
    expect(layout(times).height).toBe(expected);
  });
});
