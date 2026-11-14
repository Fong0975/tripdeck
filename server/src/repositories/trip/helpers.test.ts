import { describe, expect, it } from 'vitest';

import { getDatesInRange } from './helpers';

describe('getDatesInRange', () => {
  const tests = [
    {
      name: 'returns a single date when start equals end',
      start: '2026-05-10',
      end: '2026-05-10',
      expected: ['2026-05-10'],
    },
    {
      name: 'returns every date of a multi-day range inclusively',
      start: '2026-05-10',
      end: '2026-05-13',
      expected: ['2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13'],
    },
    {
      name: 'crosses a month boundary',
      start: '2026-04-29',
      end: '2026-05-02',
      expected: ['2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02'],
    },
    {
      name: 'crosses a year boundary',
      start: '2026-12-30',
      end: '2027-01-02',
      expected: ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'],
    },
    {
      name: 'includes a leap day',
      start: '2024-02-28',
      end: '2024-03-01',
      expected: ['2024-02-28', '2024-02-29', '2024-03-01'],
    },
    {
      name: 'spans a US DST transition without skipping or repeating dates',
      start: '2026-03-07',
      end: '2026-03-10',
      expected: ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'],
    },
    {
      name: 'returns an empty array when end is before start',
      start: '2026-05-12',
      end: '2026-05-10',
      expected: [],
    },
  ];

  it.each(tests)('$name', ({ start, end, expected }) => {
    expect(getDatesInRange(start, end)).toEqual(expected);
  });
});
