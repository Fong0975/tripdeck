import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { idParam, idParams } from './params';

function makeReq(params: Record<string, string>): Request {
  return { params } as unknown as Request;
}

describe('idParam', () => {
  const tests = [
    {
      name: 'reads a single-digit id',
      params: { catId: '1' },
      key: 'catId',
      expected: 1,
    },
    {
      name: 'reads a multi-digit id',
      params: { itemId: '42' },
      key: 'itemId',
      expected: 42,
    },
  ];

  it.each(tests)('$name', ({ params, key, expected }) => {
    expect(idParam(makeReq(params), key)).toBe(expected);
  });
});

describe('idParams', () => {
  const tests = [
    {
      name: 'reads every requested param',
      params: { tripId: '1', itemId: '2', specId: '3' },
      keys: ['tripId', 'itemId', 'specId'],
      expected: { tripId: 1, itemId: 2, specId: 3 },
    },
    {
      name: 'collapses duplicate names into one key',
      params: { catId: '7' },
      keys: ['catId', 'catId'],
      expected: { catId: 7 },
    },
    {
      name: 'returns an empty map when no names are given',
      params: { catId: '7' },
      keys: [],
      expected: {},
    },
  ];

  it.each(tests)('$name', ({ params, keys, expected }) => {
    expect(idParams(makeReq(params), ...keys)).toEqual(expected);
  });
});
