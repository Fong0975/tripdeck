import {
  checkKey,
  getEffectiveLocations,
  NO_LOCATION,
  parseCheckKey,
} from '@tripdeck/shared';
import { describe, expect, it } from 'vitest';

import { hasStorageOption } from './checklistUtils';

describe('getEffectiveLocations', () => {
  it.each([
    { name: 'null', value: null, expected: [''] },
    { name: 'undefined', value: undefined, expected: [''] },
    { name: 'an empty string', value: '', expected: [''] },
    { name: 'a single option', value: '託運', expected: ['託運'] },
    { name: 'both options', value: '託運,隨身', expected: ['託運', '隨身'] },
    {
      name: 'both options in reverse order',
      value: '隨身,託運',
      expected: ['託運', '隨身'],
    },
    {
      name: 'options with surrounding spaces',
      value: ' 隨身 , 託運 ',
      expected: ['託運', '隨身'],
    },
    { name: 'an unknown value', value: '後背包', expected: [''] },
    {
      name: 'a mix of known and unknown values',
      value: '後背包,隨身',
      expected: ['隨身'],
    },
    { name: 'a duplicated option', value: '託運,託運', expected: ['託運'] },
    { name: 'only separators', value: ',,', expected: [''] },
  ])('returns $expected for $name', ({ value, expected }) => {
    expect(getEffectiveLocations(value)).toEqual(expected);
  });

  it('exposes the empty location as NO_LOCATION', () => {
    expect(NO_LOCATION).toBe('');
  });
});

describe('checkKey', () => {
  it.each([
    { id: 12, location: '託運', expected: '12|託運' },
    { id: 12, location: '隨身', expected: '12|隨身' },
    { id: 12, location: '', expected: '12|' },
  ])(
    'builds "$expected" from $id and "$location"',
    ({ id, location, expected }) => {
      expect(checkKey(id, location)).toBe(expected);
    },
  );
});

describe('parseCheckKey', () => {
  it.each([
    {
      name: 'a key with a location',
      key: '12|託運',
      expected: { id: 12, location: '託運' },
    },
    {
      name: 'a key with the empty location',
      key: '12|',
      expected: { id: 12, location: '' },
    },
    {
      name: 'a legacy id-only key',
      key: '12',
      expected: { id: 12, location: '' },
    },
    {
      name: 'a location containing the separator',
      key: '7|a|b',
      expected: { id: 7, location: 'a|b' },
    },
    { name: 'a non-integer id', key: 'abc|託運', expected: null },
    { name: 'a decimal id', key: '1.5|託運', expected: null },
    { name: 'an empty id', key: '|託運', expected: null },
    { name: 'an empty key', key: '', expected: null },
  ])('parses $name', ({ key, expected }) => {
    expect(parseCheckKey(key)).toEqual(expected);
  });

  it.each([
    { id: 3, location: '託運' },
    { id: 3, location: '' },
  ])('round-trips checkKey($id, "$location")', ({ id, location }) => {
    expect(parseCheckKey(checkKey(id, location))).toEqual({ id, location });
  });
});

describe('hasStorageOption (backed by getEffectiveLocations)', () => {
  it.each([
    { value: null, option: '託運' as const, expected: false },
    { value: '', option: '隨身' as const, expected: false },
    { value: '託運,隨身', option: '隨身' as const, expected: true },
    { value: ' 隨身 ', option: '隨身' as const, expected: true },
    { value: '隨身', option: '託運' as const, expected: false },
    { value: '後背包', option: '託運' as const, expected: false },
  ])(
    'returns $expected for "$value" and $option',
    ({ value, option, expected }) => {
      expect(hasStorageOption(value, option)).toBe(expected);
    },
  );
});
