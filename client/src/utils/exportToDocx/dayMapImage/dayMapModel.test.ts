import { describe, expect, it } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { buildDayMapModel, formatMapTimeRange } from './dayMapModel';

const HOTEL = { latitude: 25.0, longitude: 121.5 };
const PARK = { latitude: 25.1, longitude: 121.6 };

describe('formatMapTimeRange', () => {
  it.each([
    { start: '09:00', end: '10:30', expected: '09:00–10:30' },
    { start: '9:05', end: '10:00', expected: '09:05–10:00' },
    { start: '09:00', end: null, expected: '09:00' },
    { start: null, end: '18:00', expected: '18:00 結束' },
    { start: null, end: null, expected: null },
    { start: 'soon', end: '', expected: null },
  ])('formats $start / $end as $expected', ({ start, end, expected }) => {
    expect(formatMapTimeRange(start, end)).toBe(expected);
  });
});

describe('buildDayMapModel', () => {
  it('returns no stops when no attraction has coordinates', () => {
    const day = makeDay({ attractions: [makeAttraction({ id: 1 })] });

    expect(buildDayMapModel(day)).toEqual({ stops: [], route: [] });
  });

  it('keeps itinerary numbering when an attraction has no coordinates', () => {
    const day = makeDay({
      attractions: [
        makeAttraction({ id: 1, name: 'Hotel', ...HOTEL }),
        makeAttraction({ id: 2, name: 'Unknown' }),
        makeAttraction({ id: 3, name: 'Park', ...PARK }),
      ],
    });

    const { stops, route } = buildDayMapModel(day);

    expect(stops.map(stop => stop.label)).toEqual(['1', '3']);
    expect(route).toEqual([0, 1]);
  });

  it('carries the title and normalized time range of each attraction', () => {
    const day = makeDay({
      attractions: [
        makeAttraction({
          id: 1,
          name: 'Park',
          startTime: '9:00',
          endTime: '10:00',
          ...PARK,
        }),
      ],
    });

    expect(buildDayMapModel(day).stops[0].entries).toEqual([
      { order: 1, name: 'Park', timeLabel: '09:00–10:00' },
    ]);
  });

  it('merges attractions sharing a coordinate into one stop', () => {
    const day = makeDay({
      attractions: [
        makeAttraction({ id: 1, name: 'Hotel', ...HOTEL }),
        makeAttraction({ id: 2, name: 'Park', ...PARK }),
        makeAttraction({ id: 3, name: 'Hotel again', ...HOTEL }),
      ],
    });

    const { stops, route } = buildDayMapModel(day);

    expect(stops).toHaveLength(2);
    expect(stops[0].label).toBe('1·3');
    expect(stops[0].entries.map(entry => entry.name)).toEqual([
      'Hotel',
      'Hotel again',
    ]);
    expect(route).toEqual([0, 1, 0]);
  });

  it('collapses consecutive visits to the same spot in the route', () => {
    const day = makeDay({
      attractions: [
        makeAttraction({ id: 1, ...HOTEL }),
        makeAttraction({ id: 2, ...HOTEL }),
        makeAttraction({ id: 3, ...PARK }),
      ],
    });

    expect(buildDayMapModel(day).route).toEqual([0, 1]);
  });

  it('only includes the given day', () => {
    const other = makeDay({
      id: 2,
      attractions: [makeAttraction({ id: 9, ...PARK })],
    });
    const day = makeDay({
      id: 1,
      attractions: [makeAttraction({ id: 1, ...HOTEL })],
    });

    expect(buildDayMapModel(day).stops).toHaveLength(1);
    expect(buildDayMapModel(other).stops[0].lat).toBe(PARK.latitude);
  });
});
