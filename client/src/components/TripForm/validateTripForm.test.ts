import { describe, expect, it } from 'vitest';

import { validateTripForm, type TripFormValues } from './validateTripForm';

const valid: TripFormValues = {
  title: 'My Trip',
  destination: '',
  startDate: '2026-01-01',
  endDate: '2026-01-04',
  description: '',
};

describe('validateTripForm', () => {
  it.each([
    { name: 'valid values', values: valid, expected: null },
    {
      name: 'a same-day trip',
      values: { ...valid, endDate: valid.startDate },
      expected: null,
    },
    {
      name: 'a blank title',
      values: { ...valid, title: '   ' },
      expected: '請輸入旅程名稱',
    },
    {
      name: 'a missing start date',
      values: { ...valid, startDate: '' },
      expected: '請選擇旅遊期間',
    },
    {
      name: 'a missing end date',
      values: { ...valid, endDate: '' },
      expected: '請選擇旅遊期間',
    },
    {
      name: 'an end date before the start date',
      values: { ...valid, startDate: '2026-01-10', endDate: '2026-01-05' },
      expected: '結束日期不能早於開始日期',
    },
    {
      name: 'a blank title and missing dates (title reported first)',
      values: { ...valid, title: '', startDate: '', endDate: '' },
      expected: '請輸入旅程名稱',
    },
  ])('returns $expected for $name', ({ values, expected }) => {
    expect(validateTripForm(values)).toBe(expected);
  });
});
