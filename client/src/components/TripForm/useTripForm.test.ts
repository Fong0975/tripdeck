import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTripForm } from './useTripForm';
import type { TripFormValues } from './validateTripForm';

// Pin the timezone so the startDate -> endDate auto-calculation (which round
// trips through Date/toISOString) produces a deterministic result.
process.env.TZ = 'UTC';

const initial: TripFormValues = {
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  description: '',
};

/** Builds the minimal change event `handleChange` reads. */
function changeEvent(name: string, value: string) {
  return { target: { name, value } } as React.ChangeEvent<HTMLInputElement>;
}

describe('useTripForm', () => {
  it.each([
    {
      name: 'auto-fills the end date when enabled',
      autoFillEndDate: true,
      field: 'startDate',
      value: '2026-01-01',
      expected: { startDate: '2026-01-01', endDate: '2026-01-04' },
    },
    {
      name: 'leaves the end date alone when disabled',
      autoFillEndDate: false,
      field: 'startDate',
      value: '2026-01-01',
      expected: { startDate: '2026-01-01', endDate: '' },
    },
    {
      name: 'does not auto-fill when the start date is cleared',
      autoFillEndDate: true,
      field: 'startDate',
      value: '',
      expected: { startDate: '', endDate: '' },
    },
    {
      name: 'updates any other named field',
      autoFillEndDate: true,
      field: 'title',
      value: 'My Trip',
      expected: { title: 'My Trip', endDate: '' },
    },
  ])('$name', ({ autoFillEndDate, field, value, expected }) => {
    const { result } = renderHook(() =>
      useTripForm(initial, { autoFillEndDate }),
    );

    act(() => result.current.handleChange(changeEvent(field, value)));

    expect(result.current.values).toMatchObject(expected);
  });

  it.each([
    {
      name: 'invalid values',
      values: initial,
      valid: false,
      error: '請輸入旅程名稱',
    },
    {
      name: 'valid values',
      values: {
        ...initial,
        title: 'T',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      },
      valid: true,
      error: '',
    },
  ])('validate reports $name', ({ values, valid, error }) => {
    const { result } = renderHook(() => useTripForm(values));

    let isValid!: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid).toBe(valid);
    expect(result.current.error).toBe(error);
  });

  it('clears the error on the next edit', () => {
    const { result } = renderHook(() => useTripForm(initial));
    act(() => {
      result.current.validate();
    });

    act(() => result.current.handleChange(changeEvent('title', 'T')));

    expect(result.current.error).toBe('');
  });
});
