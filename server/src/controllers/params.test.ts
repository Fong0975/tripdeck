import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { idParam } from './params';

describe('idParam', () => {
  const tests = [
    {
      name: 'converts a numeric string',
      params: { tripId: '42' },
      key: 'tripId',
      expected: 42,
    },
    {
      name: 'reads the named param among several',
      params: { tripId: '1', dayId: '7' },
      key: 'dayId',
      expected: 7,
    },
    {
      name: 'converts the largest safe integer',
      params: { imageId: '9007199254740991' },
      key: 'imageId',
      expected: Number.MAX_SAFE_INTEGER,
    },
  ];

  it.each(tests)('$name', ({ params, key, expected }) => {
    const req = { params } as unknown as Request;

    expect(idParam(req, key)).toBe(expected);
  });
});
