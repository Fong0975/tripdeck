import { describe, expect, it } from 'vitest';

import { parseId } from './parseId';

describe('parseId', () => {
  const tests: { name: string; input: unknown; expected: number | null }[] = [
    { name: 'positive integer number', input: 7, expected: 7 },
    { name: 'digit string', input: '42', expected: 42 },
    { name: 'zero', input: 0, expected: null },
    { name: 'zero string', input: '0', expected: null },
    { name: 'negative number', input: -3, expected: null },
    { name: 'negative string', input: '-3', expected: null },
    { name: 'fractional number', input: 1.5, expected: null },
    { name: 'fractional string', input: '1.5', expected: null },
    { name: 'NaN', input: Number.NaN, expected: null },
    { name: 'non-numeric string', input: 'abc', expected: null },
    { name: 'empty string', input: '', expected: null },
    { name: 'whitespace-padded string', input: ' 5 ', expected: null },
    { name: 'exponent string', input: '1e3', expected: null },
    {
      name: 'unsafe integer string',
      input: '9007199254740993',
      expected: null,
    },
    { name: 'undefined', input: undefined, expected: null },
    { name: 'null', input: null, expected: null },
    { name: 'object', input: { id: 1 }, expected: null },
  ];

  it.each(tests)('$name', ({ input, expected }) => {
    expect(parseId(input)).toBe(expected);
  });
});
