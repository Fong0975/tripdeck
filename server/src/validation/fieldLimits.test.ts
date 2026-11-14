import { describe, expect, it } from 'vitest';

import { FIELD_LIMITS, findTooLongField } from './fieldLimits';

describe('findTooLongField', () => {
  const max = FIELD_LIMITS.time;
  const tests: {
    name: string;
    fields: [string, unknown, number][];
    expected: string | null;
  }[] = [
    { name: 'no fields', fields: [], expected: null },
    {
      name: 'value exactly at the limit',
      fields: [['startTime', 'x'.repeat(max), max]],
      expected: null,
    },
    {
      name: 'value over the limit',
      fields: [['startTime', 'x'.repeat(max + 1), max]],
      expected: `startTime must be at most ${max} characters`,
    },
    {
      name: 'emoji count as one character each',
      fields: [['startTime', '😀'.repeat(max), max]],
      expected: null,
    },
    {
      name: 'non-string values are skipped',
      fields: [
        ['a', undefined, 1],
        ['b', null, 1],
        ['c', 12345, 1],
      ],
      expected: null,
    },
    {
      name: 'reports the first offending field',
      fields: [
        ['first', 'ok', 5],
        ['second', 'too long', 5],
        ['third', 'also too long', 5],
      ],
      expected: 'second must be at most 5 characters',
    },
  ];

  it.each(tests)('$name', ({ fields, expected }) => {
    expect(findTooLongField(fields)).toBe(expected);
  });
});
