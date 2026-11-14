import { describe, expect, it } from 'vitest';

import {
  MAX_TRIP_DAYS,
  normalizeTripTitle,
  validateTripDates,
} from './tripValidation';

describe('validateTripDates', () => {
  const startFormatError =
    'startDate must be a valid date in YYYY-MM-DD format';
  const endFormatError = 'endDate must be a valid date in YYYY-MM-DD format';
  const spanError = `A trip cannot span more than ${MAX_TRIP_DAYS} days`;

  const tests: Array<{
    name: string;
    start: unknown;
    end: unknown;
    expected: string | null;
  }> = [
    {
      name: 'accepts a single-day trip',
      start: '2026-05-10',
      end: '2026-05-10',
      expected: null,
    },
    {
      name: 'accepts a multi-day trip',
      start: '2026-05-10',
      end: '2026-05-12',
      expected: null,
    },
    {
      name: 'accepts a leap day',
      start: '2024-02-29',
      end: '2024-03-01',
      expected: null,
    },
    {
      name: 'accepts a trip spanning exactly MAX_TRIP_DAYS days',
      start: '2026-01-01',
      end: '2026-12-31',
      expected: null,
    },
    {
      name: 'rejects a trip one day longer than MAX_TRIP_DAYS',
      start: '2026-01-01',
      end: '2027-01-01',
      expected: spanError,
    },
    {
      name: 'rejects endDate before startDate',
      start: '2026-05-12',
      end: '2026-05-10',
      expected: 'endDate cannot be before startDate',
    },
    {
      name: 'rejects a non-string startDate',
      start: 20260510,
      end: '2026-05-10',
      expected: startFormatError,
    },
    {
      name: 'rejects a missing startDate',
      start: undefined,
      end: '2026-05-10',
      expected: startFormatError,
    },
    {
      name: 'rejects a startDate with a time component',
      start: '2026-05-10T00:00:00Z',
      end: '2026-05-10',
      expected: startFormatError,
    },
    {
      name: 'rejects a startDate without zero padding',
      start: '2026-5-1',
      end: '2026-05-10',
      expected: startFormatError,
    },
    {
      name: 'rejects an impossible calendar day',
      start: '2026-02-30',
      end: '2026-03-01',
      expected: startFormatError,
    },
    {
      name: 'rejects Feb 29 in a non-leap year',
      start: '2026-02-28',
      end: '2026-02-29',
      expected: endFormatError,
    },
    {
      name: 'rejects month 13',
      start: '2026-05-10',
      end: '2026-13-01',
      expected: endFormatError,
    },
    {
      name: 'rejects a free-form endDate',
      start: '2026-05-10',
      end: 'May 12, 2026',
      expected: endFormatError,
    },
  ];

  it.each(tests)('$name', ({ start, end, expected }) => {
    expect(validateTripDates(start, end)).toBe(expected);
  });
});

describe('normalizeTripTitle', () => {
  const tests: Array<{ name: string; input: unknown; expected: string }> = [
    {
      name: 'trims surrounding whitespace',
      input: '  Kyoto  ',
      expected: 'Kyoto',
    },
    { name: 'returns empty for whitespace only', input: '   ', expected: '' },
    { name: 'returns empty for non-strings', input: 42, expected: '' },
    { name: 'returns empty for undefined', input: undefined, expected: '' },
  ];

  it.each(tests)('$name', ({ input, expected }) => {
    expect(normalizeTripTitle(input)).toBe(expected);
  });
});
