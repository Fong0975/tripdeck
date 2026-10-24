import { describe, expect, it } from 'vitest';

import { formatDayDate } from './dayLabel';

describe('formatDayDate', () => {
  it.each([
    { date: '2026-08-20', pattern: 'M/d (EEE)', expected: '8/20 (週四)' },
    { date: '2026-01-05', pattern: 'M/d', expected: '1/5' },
    { date: 'not-a-date', pattern: 'M/d (EEE)', expected: 'not-a-date' },
    { date: '', pattern: 'M/d', expected: '' },
  ])(
    'formats $date with "$pattern" as "$expected"',
    ({ date, pattern, expected }) => {
      expect(formatDayDate(date, pattern)).toBe(expected);
    },
  );
});
