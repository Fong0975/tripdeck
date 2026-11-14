import { describe, expect, it } from 'vitest';

import { isPlausibleDaysFromToday, parseIsoDateUtc } from './daysFromToday';

describe('parseIsoDateUtc', () => {
  it.each([
    { input: '2026-08-20', expected: Date.parse('2026-08-20T00:00:00Z') },
    { input: '2028-02-29', expected: Date.parse('2028-02-29T00:00:00Z') },
    { input: '2026-02-29', expected: null },
    { input: '2026-13-01', expected: null },
    { input: '2026-04-31', expected: null },
    { input: '2026/08/20', expected: null },
    { input: '2026-8-20', expected: null },
    { input: '', expected: null },
  ])('parses "$input" as $expected', ({ input, expected }) => {
    expect(parseIsoDateUtc(input)).toBe(expected);
  });
});

describe('isPlausibleDaysFromToday', () => {
  const NOW = new Date('2026-08-17T10:00:00Z');

  it.each([
    {
      description: 'the exact UTC difference',
      date: '2026-08-20',
      days: 3,
      expected: true,
    },
    {
      description: 'a client one day ahead (UTC+14)',
      date: '2026-08-20',
      days: 2,
      expected: true,
    },
    {
      description: 'a client one day behind (UTC-12)',
      date: '2026-08-20',
      days: 4,
      expected: true,
    },
    {
      description: 'a past date',
      date: '2026-08-15',
      days: -2,
      expected: true,
    },
    {
      description: 'days two below the UTC difference',
      date: '2026-08-20',
      days: 1,
      expected: false,
    },
    {
      description: 'days spoofed into the past',
      date: '2026-08-20',
      days: -30,
      expected: false,
    },
    {
      description: 'days spoofed far ahead',
      date: '2026-08-20',
      days: 100,
      expected: false,
    },
    {
      description: 'a non-existent date',
      date: '2026-02-30',
      days: 0,
      expected: false,
    },
    {
      description: 'a non-integer days value',
      date: '2026-08-20',
      days: 3.5,
      expected: false,
    },
    {
      description: 'an unsafe integer days value',
      date: '2026-08-20',
      days: 2 ** 60,
      expected: false,
    },
  ])('is $expected for $description', ({ date, days, expected }) => {
    expect(isPlausibleDaysFromToday(date, days, NOW)).toBe(expected);
  });
});
