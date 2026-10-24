import { describe, expect, it } from 'vitest';

import { computeGeoKey, isGeoSource } from './geoKey';

describe('computeGeoKey', () => {
  it('returns a 64-character hex digest', () => {
    expect(computeGeoKey('Museum', null)).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    {
      description: 'name casing and surrounding whitespace are ignored',
      a: ['  Museum ', 'https://maps.app.goo.gl/x'],
      b: ['museum', 'https://maps.app.goo.gl/x'],
      same: true,
    },
    {
      description: 'null, undefined and empty links are equivalent',
      a: ['Museum', null],
      b: ['Museum', ''],
      same: true,
    },
    {
      description: 'a different name produces a different key',
      a: ['Museum', null],
      b: ['Park', null],
      same: false,
    },
    {
      description: 'a different link produces a different key',
      a: ['Museum', 'https://maps.app.goo.gl/x'],
      b: ['Museum', 'https://maps.app.goo.gl/y'],
      same: false,
    },
    {
      description: 'name/link boundaries cannot be shifted to collide',
      a: ['ab', 'c'],
      b: ['a', 'bc'],
      same: false,
    },
  ])('$description', ({ a, b, same }) => {
    const keyA = computeGeoKey(a[0] as string, a[1]);
    const keyB = computeGeoKey(b[0] as string, b[1]);

    expect(keyA === keyB).toBe(same);
  });
});

describe('isGeoSource', () => {
  it.each([
    { value: 'url', expected: true },
    { value: 'geocode', expected: true },
    { value: 'not_found', expected: true },
    { value: 'manual', expected: false },
    { value: null, expected: false },
    { value: undefined, expected: false },
    { value: 1, expected: false },
  ])('returns $expected for $value', ({ value, expected }) => {
    expect(isGeoSource(value)).toBe(expected);
  });
});
