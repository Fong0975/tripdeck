import { describe, expect, it } from 'vitest';

import {
  hasStorageOption,
  nextTempId,
  summarizeSpecLocations,
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
    {
      current: '隨身',
      option: '託運' as const,
      expected: '隨身,託運',
      description: 'add keeps stored order without a label order',
    },
    {
      current: '隨身',
      option: '託運' as const,
      order: ['託運', '隨身'],
      expected: '託運,隨身',
      description: 'add sorts by the label order',
    },
    {
      current: '背包,隨身',
      option: '託運' as const,
      order: ['託運', '隨身'],
      expected: '託運,隨身,背包',
      description: 'names that are no longer labels follow the labels',
    },
    {
      current: '託運,背包',
      option: '背包' as const,
      order: ['託運', '隨身'],
      expected: '託運',
      description: 'removing a deleted label that the value still carries',
    },
    {
      current: '手提',
      option: '手提' as const,
      expected: null,
      description: 'removing a custom name',
    },
  ])(
    'returns $expected for toggling "$option" on "$current" ($description)',
    ({ current, option, expected, order }) => {
      expect(toggleStorageOption(current, option, order)).toBe(expected);
    },
  );
});

describe('summarizeSpecLocations', () => {
  const tests: {
    name: string;
    locations: (string | null)[];
    order?: string[];
    expected: string | null;
  }[] = [
    { name: 'no specs', locations: [], expected: null },
    {
      name: 'specs without any location',
      locations: [null, null],
      expected: null,
    },
    { name: 'an empty location string', locations: [''], expected: null },
    { name: 'a single spec location', locations: ['隨身'], expected: '隨身' },
    {
      name: 'both options on one spec',
      locations: ['託運,隨身'],
      expected: '託運,隨身',
    },
    {
      name: 'different options on different specs, in the order they appear',
      locations: ['隨身', null, '託運'],
      expected: '隨身,託運',
    },
    {
      name: 'different options on different specs, sorted by the label order',
      locations: ['隨身', null, '託運'],
      order: ['託運', '隨身'],
      expected: '託運,隨身',
    },
    {
      name: 'options listed out of order with spaces',
      locations: ['隨身, 託運'],
      order: ['託運', '隨身'],
      expected: '託運,隨身',
    },
    {
      name: 'the same option on several specs, counted once',
      locations: ['隨身', '隨身', '託運,隨身'],
      order: ['託運', '隨身'],
      expected: '託運,隨身',
    },
    {
      name: 'names that are not labels, after the labels',
      locations: ['後背包', '隨身'],
      order: ['託運', '隨身'],
      expected: '隨身,後背包',
    },
    {
      name: 'only names that are not labels',
      locations: ['後背包'],
      expected: '後背包',
    },
  ];

  it.each(tests)(
    'returns the union for $name',
    ({ locations, order, expected }) => {
      const specs = locations.map(storage_location => ({ storage_location }));

      expect(summarizeSpecLocations(specs, order)).toBe(expected);
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
