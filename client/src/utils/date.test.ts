import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addDaysToDateString,
  daysFromToday,
  getTripTotalDays,
  isPastDate,
} from './date';

describe('addDaysToDateString', () => {
  it.each([
    {
      description: 'a plain shift',
      date: '2026-08-20',
      days: 3,
      expected: '2026-08-23',
    },
    {
      description: 'a zero shift',
      date: '2026-08-20',
      days: 0,
      expected: '2026-08-20',
    },
    {
      description: 'a negative shift',
      date: '2026-08-20',
      days: -1,
      expected: '2026-08-19',
    },
    {
      description: 'a month boundary',
      date: '2026-08-30',
      days: 3,
      expected: '2026-09-02',
    },
    {
      description: 'a year boundary',
      date: '2026-12-30',
      days: 3,
      expected: '2027-01-02',
    },
    {
      description: 'a leap year February',
      date: '2028-02-27',
      days: 3,
      expected: '2028-03-01',
    },
    {
      description: 'the US spring DST change',
      date: '2026-03-07',
      days: 3,
      expected: '2026-03-10',
    },
    {
      description: 'the US autumn DST change',
      date: '2026-10-31',
      days: 3,
      expected: '2026-11-03',
    },
  ])('returns $expected for $description', ({ date, days, expected }) => {
    expect(addDaysToDateString(date, days)).toBe(expected);
  });
});

describe('daysFromToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-20T15:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { date: '2026-08-20', expected: 0, description: 'today' },
    { date: '2026-08-21', expected: 1, description: 'tomorrow' },
    { date: '2026-08-19', expected: -1, description: 'yesterday' },
    {
      date: '2026-09-19',
      expected: 30,
      description: 'a month in the future',
    },
  ])('returns $expected for $description ("$date")', ({ date, expected }) => {
    expect(daysFromToday(date)).toBe(expected);
  });
});

describe('isPastDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-20T15:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { date: '2026-08-19', expected: true, description: 'yesterday' },
    { date: '2026-08-20', expected: false, description: 'today' },
    { date: '2026-08-21', expected: false, description: 'tomorrow' },
  ])('returns $expected for $description', ({ date, expected }) => {
    expect(isPastDate(date)).toBe(expected);
  });
});

describe('getTripTotalDays', () => {
  it.each([
    {
      description: 'a single-day trip',
      startDate: '2026-08-20',
      endDate: '2026-08-20',
      expected: 1,
    },
    {
      description: 'a trip spanning multiple days',
      startDate: '2026-08-20',
      endDate: '2026-08-22',
      expected: 3,
    },
    {
      description: 'a trip spanning a month boundary',
      startDate: '2026-08-30',
      endDate: '2026-09-02',
      expected: 4,
    },
    {
      description: 'a trip spanning a year boundary',
      startDate: '2025-12-30',
      endDate: '2026-01-02',
      expected: 4,
    },
  ])(
    'returns $expected for $description',
    ({ startDate, endDate, expected }) => {
      expect(getTripTotalDays({ startDate, endDate })).toBe(expected);
    },
  );
});
