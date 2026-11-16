import { describe, expect, it } from 'vitest';

import { makeAttraction, makeConnection, makeDay } from '@/test-utils/fixtures';

import { blockTimeLabel, travelLabel } from './blockLabel';
import { buildDayTimeline } from './buildDayTimeline';

function firstBlock(startTime: string | null, endTime: string | null) {
  return buildDayTimeline(
    makeDay({ attractions: [makeAttraction({ startTime, endTime })] }),
  ).blocks[0];
}

describe('blockTimeLabel', () => {
  it.each([
    {
      description: 'a range',
      start: '09:00',
      end: '10:30',
      expected: '09:00–10:30',
    },
    {
      description: 'a start-only point',
      start: '09:05',
      end: null,
      expected: '09:05',
    },
    {
      description: 'an end-only point',
      start: null,
      end: '10:30',
      expected: '10:30 結束',
    },
  ])('labels $description', ({ start, end, expected }) => {
    expect(blockTimeLabel(firstBlock(start, end))).toBe(expected);
  });
});

describe('travelLabel', () => {
  it.each([
    { mode: 'walk' as const, expected: '🚶 步行 30 分鐘' },
    { mode: null, expected: '🗺️ 其他 30 分鐘' },
  ])('labels a $mode leg', ({ mode, expected }) => {
    const { blocks } = buildDayTimeline(
      makeDay({
        attractions: [
          makeAttraction({ id: 1, startTime: '09:00', endTime: '10:00' }),
          makeAttraction({ id: 2 }),
        ],
        connections: [
          makeConnection({
            fromAttractionId: 1,
            toAttractionId: 2,
            transportMode: mode,
            duration: '30',
          }),
        ],
      }),
    );
    const travel = blocks.find(b => b.kind === 'travel');

    expect(travel && travel.kind === 'travel' && travelLabel(travel)).toBe(
      expected,
    );
  });
});
