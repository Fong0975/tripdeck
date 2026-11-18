import { describe, expect, it } from 'vitest';

import { validateLocationLabelName } from './locationLabelName';

describe('validateLocationLabelName', () => {
  const tests = [
    {
      name: 'a valid new name',
      input: '手提',
      existing: ['託運'],
      expected: null,
    },
    {
      name: 'a name of exactly the maximum length',
      input: 'x'.repeat(20),
      existing: [],
      expected: null,
    },
    {
      name: 'a name with surrounding spaces, trimmed before comparing',
      input: ' 手提 ',
      existing: ['託運'],
      expected: null,
    },
    {
      name: 'an empty name',
      input: '',
      existing: [],
      expected: '請輸入位置名稱',
    },
    {
      name: 'a blank name',
      input: '   ',
      existing: [],
      expected: '請輸入位置名稱',
    },
    {
      name: 'a name with a comma',
      input: '託運,隨身',
      existing: [],
      expected: '位置名稱不可包含「,」或「|」',
    },
    {
      name: 'a name with a pipe',
      input: '託|運',
      existing: [],
      expected: '位置名稱不可包含「,」或「|」',
    },
    {
      name: 'a name that is too long',
      input: 'x'.repeat(21),
      existing: [],
      expected: '位置名稱最多 20 個字',
    },
    {
      name: 'a name that already exists',
      input: '託運',
      existing: ['託運', '隨身'],
      expected: '已有同名的位置標籤',
    },
    {
      name: 'a name that already exists after trimming',
      input: ' 託運 ',
      existing: ['託運'],
      expected: '已有同名的位置標籤',
    },
  ];

  it.each(tests)('handles $name', ({ input, existing, expected }) => {
    expect(validateLocationLabelName(input, existing)).toBe(expected);
  });
});
