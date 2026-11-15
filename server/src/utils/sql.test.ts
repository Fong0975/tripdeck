import { describe, expect, it } from 'vitest';

import { placeholders } from './sql';

describe('placeholders', () => {
  const tests = [
    { name: 'zero', count: 0, expected: '' },
    { name: 'one', count: 1, expected: '?' },
    { name: 'three', count: 3, expected: '?, ?, ?' },
  ];

  it.each(tests)('$name', ({ count, expected }) => {
    expect(placeholders(count)).toBe(expected);
  });
});
