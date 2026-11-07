import { describe, expect, it } from 'vitest';

import { createMockReqRes } from '../test-utils/httpMocks';

import { defaultJsonBody } from './defaultJsonBody';

describe('defaultJsonBody', () => {
  const cases: { name: string; body: unknown; expected: unknown }[] = [
    {
      name: 'replaces undefined with an empty object',
      body: undefined,
      expected: {},
    },
    { name: 'replaces null with an empty object', body: null, expected: {} },
    {
      name: 'keeps an existing object body',
      body: { name: 'x' },
      expected: { name: 'x' },
    },
    { name: 'keeps an empty object body', body: {}, expected: {} },
    { name: 'keeps an array body', body: [1, 2], expected: [1, 2] },
  ];

  it.each(cases)('$name and calls next once', ({ body, expected }) => {
    const { req, res, next } = createMockReqRes();
    req.body = body;

    defaultJsonBody(req, res, next);

    expect(req.body).toEqual(expected);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
