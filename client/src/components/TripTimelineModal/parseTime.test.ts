import { describe, expect, it } from 'vitest';

import { formatTimeMinutes, parseTimeMinutes } from './parseTime';

describe('parseTimeMinutes', () => {
  it.each([
    { input: null, expected: null, description: 'null' },
    { input: undefined, expected: null, description: 'undefined' },
    { input: '', expected: null, description: 'empty string' },
    { input: '00:00', expected: 0, description: 'midnight' },
    { input: '09:05', expected: 545, description: 'zero-padded time' },
    { input: '9:05', expected: 545, description: 'single-digit hour' },
    { input: ' 13:30 ', expected: 810, description: 'surrounding spaces' },
    { input: '23:59', expected: 1439, description: 'last minute of day' },
    { input: '24:00', expected: null, description: 'hour out of range' },
    { input: '12:60', expected: null, description: 'minute out of range' },
    { input: '12:5', expected: null, description: 'single-digit minute' },
    { input: 'noon', expected: null, description: 'free text' },
    { input: '12:30:00', expected: null, description: 'with seconds' },
  ])('returns $expected for $description', ({ input, expected }) => {
    expect(parseTimeMinutes(input)).toBe(expected);
  });
});

describe('formatTimeMinutes', () => {
  it.each([
    { input: 0, expected: '00:00' },
    { input: 545, expected: '09:05' },
    { input: 810, expected: '13:30' },
    { input: 1440, expected: '24:00' },
  ])('formats $input as $expected', ({ input, expected }) => {
    expect(formatTimeMinutes(input)).toBe(expected);
  });
});
