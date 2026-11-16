import { describe, expect, it } from 'vitest';

import { makeAttraction, makeConnection, makeDay } from '@/test-utils/fixtures';

import { buildDayTimeline } from './buildDayTimeline';

function attractionAt(
  id: number,
  startTime: string | null,
  endTime: string | null,
) {
  return makeAttraction({ id, name: `A${id}`, startTime, endTime });
}

describe('buildDayTimeline blocks', () => {
  it.each([
    {
      description: 'both times with a later end is a range',
      start: '09:00',
      end: '10:30',
      kind: 'range',
      span: [540, 630],
    },
    {
      description: 'start only is a point at the start',
      start: '09:00',
      end: null,
      kind: 'point',
      span: [540, 540],
    },
    {
      description: 'end only is a point at the end',
      start: null,
      end: '10:30',
      kind: 'point',
      span: [630, 630],
    },
    {
      description: 'end before start degrades to a point at the start',
      start: '23:00',
      end: '01:00',
      kind: 'point',
      span: [1380, 1380],
    },
    {
      description: 'equal start and end is a point',
      start: '09:00',
      end: '09:00',
      kind: 'point',
      span: [540, 540],
    },
    {
      description: 'a malformed end falls back to a start-only point',
      start: '09:00',
      end: 'later',
      kind: 'point',
      span: [540, 540],
    },
  ])('$description', ({ start, end, kind, span }) => {
    const { blocks, unscheduled } = buildDayTimeline(
      makeDay({ attractions: [attractionAt(1, start, end)] }),
    );

    expect(unscheduled).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      kind,
      start: span[0],
      end: span[1],
      lane: 0,
      laneCount: 1,
    });
  });

  it.each([
    { description: 'both times empty', start: null, end: null },
    { description: 'both times malformed', start: 'x', end: '99:99' },
  ])(
    'puts an attraction with $description in unscheduled',
    ({ start, end }) => {
      const attraction = attractionAt(1, start, end);

      const { blocks, unscheduled } = buildDayTimeline(
        makeDay({ attractions: [attraction] }),
      );

      expect(blocks).toEqual([]);
      expect(unscheduled).toEqual([attraction]);
    },
  );

  it('sorts blocks by start time regardless of attraction order', () => {
    const { blocks } = buildDayTimeline(
      makeDay({
        attractions: [
          attractionAt(1, '14:00', '15:00'),
          attractionAt(2, '09:00', '10:00'),
        ],
      }),
    );

    expect(blocks.map(b => b.key)).toEqual(['attraction-2', 'attraction-1']);
  });
});

describe('buildDayTimeline lanes', () => {
  it.each([
    {
      description: 'back-to-back blocks do not overlap',
      times: [
        ['09:00', '10:00'],
        ['10:00', '11:00'],
      ],
      expected: [
        { lane: 0, laneCount: 1 },
        { lane: 0, laneCount: 1 },
      ],
    },
    {
      description: 'overlapping blocks take separate lanes',
      times: [
        ['09:00', '11:00'],
        ['10:00', '12:00'],
      ],
      expected: [
        { lane: 0, laneCount: 2 },
        { lane: 1, laneCount: 2 },
      ],
    },
    {
      description: 'a freed lane is reused within the same group',
      times: [
        ['09:00', '12:00'],
        ['09:30', '10:30'],
        ['10:30', '11:30'],
      ],
      expected: [
        { lane: 0, laneCount: 2 },
        { lane: 1, laneCount: 2 },
        { lane: 1, laneCount: 2 },
      ],
    },
    {
      description: 'a later separate group starts over',
      times: [
        ['09:00', '11:00'],
        ['10:00', '12:00'],
        ['14:00', '15:00'],
      ],
      expected: [
        { lane: 0, laneCount: 2 },
        { lane: 1, laneCount: 2 },
        { lane: 0, laneCount: 1 },
      ],
    },
    {
      description:
        'a point occupies a minimum span so it collides with a nearby block',
      times: [
        ['09:00', null],
        ['09:10', '10:00'],
      ],
      expected: [
        { lane: 0, laneCount: 2 },
        { lane: 1, laneCount: 2 },
      ],
    },
  ])('$description', ({ times, expected }) => {
    const attractions = times.map(([s, e], i) => attractionAt(i + 1, s, e));

    const { blocks } = buildDayTimeline(makeDay({ attractions }));

    expect(blocks.map(({ lane, laneCount }) => ({ lane, laneCount }))).toEqual(
      expected,
    );
  });

  it('gives consecutive attractions different palette colors', () => {
    const { blocks } = buildDayTimeline(
      makeDay({
        attractions: [
          attractionAt(1, '09:00', '11:00'),
          attractionAt(2, '10:00', '12:00'),
        ],
      }),
    );

    const colors = blocks.map(b => (b.kind === 'travel' ? null : b.colorIndex));
    expect(colors[0]).not.toBe(colors[1]);
  });
});

describe('buildDayTimeline travel', () => {
  const from = attractionAt(1, '09:00', '10:00');
  const to = attractionAt(2, '11:00', '12:00');

  it.each([
    {
      description: 'starts when the previous attraction ends',
      attractions: [from, to],
      duration: '30',
      expected: { start: 600, end: 630 },
    },
    {
      description:
        'is back-calculated from the next start when the previous has no end',
      attractions: [attractionAt(1, '09:00', null), to],
      duration: '30',
      expected: { start: 630, end: 660 },
    },
  ])('$description', ({ attractions, duration, expected }) => {
    const connection = makeConnection({
      id: 7,
      fromAttractionId: 1,
      toAttractionId: 2,
      duration,
    });

    const { blocks } = buildDayTimeline(
      makeDay({ attractions, connections: [connection] }),
    );

    const travel = blocks.find(b => b.kind === 'travel');
    expect(travel).toMatchObject({ key: 'travel-7', ...expected });
  });

  it.each([
    {
      description: 'duration is missing',
      duration: null,
      attractions: [from, to],
    },
    {
      description: 'duration is legacy text',
      duration: '約半小時',
      attractions: [from, to],
    },
    { description: 'duration is zero', duration: '0', attractions: [from, to] },
    {
      description: 'neither neighbour has an anchor time',
      duration: '30',
      attractions: [
        attractionAt(1, '09:00', null),
        attractionAt(2, null, '12:00'),
      ],
    },
    {
      description: 'it would run past midnight',
      duration: '120',
      attractions: [attractionAt(1, '22:30', '23:00'), to],
    },
    {
      description: 'it would start before midnight',
      duration: '120',
      attractions: [
        attractionAt(1, '09:00', null),
        attractionAt(2, '01:00', null),
      ],
    },
  ])('is omitted when $description', ({ duration, attractions }) => {
    const connection = makeConnection({
      fromAttractionId: 1,
      toAttractionId: 2,
      duration,
    });

    const { blocks } = buildDayTimeline(
      makeDay({ attractions, connections: [connection] }),
    );

    expect(blocks.some(b => b.kind === 'travel')).toBe(false);
  });
});
