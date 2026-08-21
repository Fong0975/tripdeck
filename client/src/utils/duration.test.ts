import { describe, expect, it } from 'vitest';

import {
  formatDurationDisplay,
  formatDurationMinutes,
  parseDurationMinutes,
} from './duration';

describe('parseDurationMinutes', () => {
  it.each([
    { input: undefined, expected: null, description: 'undefined input' },
    { input: null, expected: null, description: 'null input' },
    { input: '', expected: null, description: 'empty string' },
    { input: 'abc', expected: null, description: 'non-numeric legacy text' },
    {
      input: '1 小時',
      expected: null,
      description: 'legacy free-text duration',
    },
    { input: '0', expected: 0, description: 'zero minutes' },
    { input: '45', expected: 45, description: 'plain minutes' },
    { input: ' 45 ', expected: 45, description: 'whitespace is trimmed' },
    { input: '-5', expected: null, description: 'negative sign is rejected' },
    { input: '4.5', expected: null, description: 'decimal is rejected' },
  ])('returns $expected for $description ("$input")', ({ input, expected }) => {
    expect(parseDurationMinutes(input)).toBe(expected);
  });
});

describe('formatDurationMinutes', () => {
  it.each([
    {
      totalMinutes: 90,
      expected: '1 小時 30 分鐘',
      description: 'hours and minutes',
    },
    {
      totalMinutes: 120,
      expected: '2 小時',
      description: 'exact hours, no remainder',
    },
    { totalMinutes: 45, expected: '45 分鐘', description: 'minutes only' },
    { totalMinutes: 0, expected: '0 分鐘', description: 'zero minutes' },
  ])(
    'formats $totalMinutes minutes as "$expected" ($description)',
    ({ totalMinutes, expected }) => {
      expect(formatDurationMinutes(totalMinutes)).toBe(expected);
    },
  );
});

describe('formatDurationDisplay', () => {
  it.each([
    { duration: undefined, expected: null, description: 'undefined input' },
    { duration: null, expected: null, description: 'null input' },
    { duration: '', expected: null, description: 'empty string' },
    {
      duration: '90',
      expected: '1 小時 30 分鐘',
      description: 'structured minutes value',
    },
    {
      duration: '半天',
      expected: '半天',
      description: 'legacy free-text falls back to the raw string',
    },
  ])('returns "$expected" for $description', ({ duration, expected }) => {
    expect(formatDurationDisplay(duration)).toBe(expected);
  });
});
