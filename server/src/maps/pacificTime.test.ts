import { describe, expect, it } from 'vitest';

import { getNextPacificReset, getPacificDay } from './pacificTime';

describe('getPacificDay', () => {
  it.each([
    { utc: '2026-10-24T06:59:00Z', expected: '2026-10-23' }, // PDT, UTC-7
    { utc: '2026-10-24T07:00:00Z', expected: '2026-10-24' },
    { utc: '2026-12-01T07:59:00Z', expected: '2026-11-30' }, // PST, UTC-8
    { utc: '2026-12-01T08:00:00Z', expected: '2026-12-01' },
  ])('maps $utc to $expected', ({ utc, expected }) => {
    expect(getPacificDay(new Date(utc))).toBe(expected);
  });

  it('defaults to the current time', () => {
    expect(getPacificDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getNextPacificReset', () => {
  it.each([
    {
      description: 'during daylight saving time',
      from: '2026-10-24T12:00:00Z',
      expected: '2026-10-25T07:00:00.000Z',
    },
    {
      description: 'during standard time',
      from: '2026-12-01T12:00:00Z',
      expected: '2026-12-02T08:00:00.000Z',
    },
    {
      description: 'one minute before midnight',
      from: '2026-10-25T06:59:30Z',
      expected: '2026-10-25T07:00:00.000Z',
    },
    {
      description: 'on the 25-hour fall-back day',
      from: '2026-11-01T12:00:00Z',
      expected: '2026-11-02T08:00:00.000Z',
    },
    {
      description: 'on the 23-hour spring-forward day',
      from: '2026-03-08T12:00:00Z',
      expected: '2026-03-09T07:00:00.000Z',
    },
  ])('returns the next Pacific midnight $description', ({ from, expected }) => {
    expect(getNextPacificReset(new Date(from)).toISOString()).toBe(expected);
  });

  it('defaults to the current time and lies in the future', () => {
    const reset = getNextPacificReset();

    expect(reset.getTime()).toBeGreaterThan(Date.now());
    expect(reset.getTime() - Date.now()).toBeLessThanOrEqual(25 * 3_600_000);
  });
});
