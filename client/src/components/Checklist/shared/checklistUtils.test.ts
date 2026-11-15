import { describe, expect, it } from 'vitest';

import {
  hasStorageOption,
  nextTempId,
  toggleStorageOption,
} from './checklistUtils';

describe('hasStorageOption', () => {
  it.each([
    {
      value: null,
      option: '託運' as const,
      expected: false,
      description: 'null value',
    },
    {
      value: undefined,
      option: '託運' as const,
      expected: false,
      description: 'undefined value',
    },
    {
      value: '',
      option: '託運' as const,
      expected: false,
      description: 'empty string',
    },
    {
      value: '託運',
      option: '託運' as const,
      expected: true,
      description: 'single matching option',
    },
    {
      value: '隨身',
      option: '託運' as const,
      expected: false,
      description: 'single non-matching option',
    },
    {
      value: '託運,隨身',
      option: '隨身' as const,
      expected: true,
      description: 'comma-separated, matches second entry',
    },
    {
      value: '託運, 隨身',
      option: '隨身' as const,
      expected: true,
      description: 'comma-separated with surrounding whitespace',
    },
  ])(
    'returns $expected for "$value" containing "$option" ($description)',
    ({ value, option, expected }) => {
      expect(hasStorageOption(value, option)).toBe(expected);
    },
  );
});

describe('toggleStorageOption', () => {
  it.each([
    {
      current: null,
      option: '託運' as const,
      expected: '託運',
      description: 'add to null current value',
    },
    {
      current: undefined,
      option: '託運' as const,
      expected: '託運',
      description: 'add to undefined current value',
    },
    {
      current: '',
      option: '託運' as const,
      expected: '託運',
      description: 'add to empty string current value',
    },
    {
      current: '託運',
      option: '隨身' as const,
      expected: '託運,隨身',
      description: 'add a second option',
    },
    {
      current: '託運',
      option: '託運' as const,
      expected: null,
      description: 'removing the last remaining option returns null',
    },
    {
      current: '託運,隨身',
      option: '託運' as const,
      expected: '隨身',
      description: 'remove one of two options',
    },
  ])(
    'returns $expected for toggling "$option" on "$current" ($description)',
    ({ current, option, expected }) => {
      expect(toggleStorageOption(current, option)).toBe(expected);
    },
  );
});

describe('nextTempId', () => {
  it('returns strictly decreasing negative ids on each call', () => {
    const first = nextTempId();
    const second = nextTempId();
    const third = nextTempId();

    expect(first).toBeLessThan(0);
    expect(second).toBe(first - 1);
    expect(third).toBe(second - 1);
  });
});
