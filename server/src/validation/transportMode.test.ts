import { TRANSPORT_MODES } from '@tripdeck/shared';
import { describe, expect, it } from 'vitest';

import { isTransportMode } from './transportMode';

describe('isTransportMode', () => {
  const tests: { name: string; input: unknown; expected: boolean }[] = [
    ...TRANSPORT_MODES.map(mode => ({
      name: `known mode "${mode}"`,
      input: mode,
      expected: true,
    })),
    { name: 'unknown mode', input: 'car', expected: false },
    { name: 'wrong case', input: 'Walk', expected: false },
    { name: 'empty string', input: '', expected: false },
    { name: 'null', input: null, expected: false },
    { name: 'undefined', input: undefined, expected: false },
    { name: 'number', input: 1, expected: false },
    { name: 'array containing a mode', input: ['walk'], expected: false },
  ];

  it.each(tests)('returns $expected for $name', ({ input, expected }) => {
    expect(isTransportMode(input)).toBe(expected);
  });
});
