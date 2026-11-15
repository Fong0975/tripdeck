import { describe, expect, it } from 'vitest';

import { selectLocalDay, toLocalDateTime } from './localForecastDay';

const UTC_PLUS_9 = 9 * 3600;
const UTC_MINUS_5 = -5 * 3600;

function dtOf(isoUtc: string): number {
  return Date.parse(isoUtc) / 1000;
}

/** OWM-style 3-hourly entries spanning 2025-12-31 12:00Z to 2026-01-02 09:00Z. */
const THREE_HOURLY = Array.from({ length: 16 }, (_, i) => ({
  dt: dtOf('2025-12-31T12:00:00Z') + i * 3 * 3600,
}));

function utcIsoOf(entry: { dt: number }): string {
  return new Date(entry.dt * 1000).toISOString();
}

describe('toLocalDateTime', () => {
  it.each([
    {
      description: 'UTC stays unchanged',
      iso: '2026-01-01T12:00:00Z',
      offset: 0,
      expected: { date: '2026-01-01', minutesOfDay: 720 },
    },
    {
      description: 'UTC+9 rolls into the next local day',
      iso: '2025-12-31T15:00:00Z',
      offset: UTC_PLUS_9,
      expected: { date: '2026-01-01', minutesOfDay: 0 },
    },
    {
      description: 'UTC-5 rolls back to the previous local day',
      iso: '2026-01-01T03:00:00Z',
      offset: UTC_MINUS_5,
      expected: { date: '2025-12-31', minutesOfDay: 22 * 60 },
    },
    {
      description: 'a half-hour offset keeps the minutes',
      iso: '2026-01-01T06:00:00Z',
      offset: 5.5 * 3600,
      expected: { date: '2026-01-01', minutesOfDay: 11 * 60 + 30 },
    },
  ])('$description', ({ iso, offset, expected }) => {
    expect(toLocalDateTime(dtOf(iso), offset)).toEqual(expected);
  });
});

describe('selectLocalDay', () => {
  it.each([
    {
      description: 'UTC+9 groups by the Tokyo date and picks 12:00 local',
      offset: UTC_PLUS_9,
      expectedDayUtc: [
        '2025-12-31T15:00:00.000Z',
        '2025-12-31T18:00:00.000Z',
        '2025-12-31T21:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T03:00:00.000Z',
        '2026-01-01T06:00:00.000Z',
        '2026-01-01T09:00:00.000Z',
        '2026-01-01T12:00:00.000Z',
      ],
      expectedMiddayUtc: '2026-01-01T03:00:00.000Z',
    },
    {
      description:
        'UTC-5 groups by the New York date and picks the entry nearest noon',
      offset: UTC_MINUS_5,
      expectedDayUtc: [
        '2026-01-01T06:00:00.000Z',
        '2026-01-01T09:00:00.000Z',
        '2026-01-01T12:00:00.000Z',
        '2026-01-01T15:00:00.000Z',
        '2026-01-01T18:00:00.000Z',
        '2026-01-01T21:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-01-02T03:00:00.000Z',
      ],
      // 18:00Z is 13:00 local, one hour from noon versus two for 15:00Z.
      expectedMiddayUtc: '2026-01-01T18:00:00.000Z',
    },
    {
      description: 'UTC uses the UTC calendar day',
      offset: 0,
      expectedDayUtc: [
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T03:00:00.000Z',
        '2026-01-01T06:00:00.000Z',
        '2026-01-01T09:00:00.000Z',
        '2026-01-01T12:00:00.000Z',
        '2026-01-01T15:00:00.000Z',
        '2026-01-01T18:00:00.000Z',
        '2026-01-01T21:00:00.000Z',
      ],
      expectedMiddayUtc: '2026-01-01T12:00:00.000Z',
    },
  ])('$description', ({ offset, expectedDayUtc, expectedMiddayUtc }) => {
    const selection = selectLocalDay(THREE_HOURLY, '2026-01-01', offset);

    expect(selection?.dayEntries.map(utcIsoOf)).toEqual(expectedDayUtc);
    expect(selection && utcIsoOf(selection.midday)).toBe(expectedMiddayUtc);
  });

  it.each([
    {
      description: 'no entry falls on the local date',
      entries: THREE_HOURLY,
      date: '2026-01-05',
    },
    { description: 'there are no entries', entries: [], date: '2026-01-01' },
  ])('returns null when $description', ({ entries, date }) => {
    expect(selectLocalDay(entries, date, UTC_PLUS_9)).toBeNull();
  });

  it('keeps the first entry in list order when two are equally far from noon', () => {
    const entries = [
      { id: 'first', dt: dtOf('2026-01-01T13:30:00Z') },
      { id: 'second', dt: dtOf('2026-01-01T10:30:00Z') },
    ];

    expect(selectLocalDay(entries, '2026-01-01', 0)?.midday.id).toBe('first');
  });
});
