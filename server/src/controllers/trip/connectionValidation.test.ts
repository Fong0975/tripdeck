import { describe, expect, it } from 'vitest';

import {
  type EndpointIds,
  type EndpointResolution,
  findTooLongConnectionField,
  INVALID_ENDPOINT_IDS_ERROR,
  isMissing,
  resolveEndpoints,
  SAME_ENDPOINT_ERROR,
} from './connectionValidation';

describe('resolveEndpoints', () => {
  const current: EndpointIds = { fromAttractionId: 100, toAttractionId: 101 };

  const tests: {
    name: string;
    rawFrom: unknown;
    rawTo: unknown;
    current?: EndpointIds;
    expected: EndpointResolution;
  }[] = [
    {
      name: 'both ids are numbers',
      rawFrom: 1,
      rawTo: 2,
      expected: {
        ok: true,
        endpoints: { fromAttractionId: 1, toAttractionId: 2 },
      },
    },
    {
      name: 'both ids are digit strings',
      rawFrom: '1',
      rawTo: '2',
      expected: {
        ok: true,
        endpoints: { fromAttractionId: 1, toAttractionId: 2 },
      },
    },
    {
      name: 'fromAttractionId is not a positive integer',
      rawFrom: -1,
      rawTo: 2,
      expected: { ok: false, error: INVALID_ENDPOINT_IDS_ERROR },
    },
    {
      name: 'toAttractionId is a non-numeric string',
      rawFrom: 1,
      rawTo: 'abc',
      expected: { ok: false, error: INVALID_ENDPOINT_IDS_ERROR },
    },
    {
      name: 'an id is missing without current endpoints',
      rawFrom: 1,
      rawTo: undefined,
      expected: { ok: false, error: INVALID_ENDPOINT_IDS_ERROR },
    },
    {
      name: 'both ids are equal',
      rawFrom: 5,
      rawTo: 5,
      expected: { ok: false, error: SAME_ENDPOINT_ERROR },
    },
    {
      name: 'only fromAttractionId is supplied on a partial update',
      rawFrom: 200,
      rawTo: undefined,
      current,
      expected: {
        ok: true,
        endpoints: { fromAttractionId: 200, toAttractionId: 101 },
      },
    },
    {
      name: 'fromAttractionId is null on a partial update',
      rawFrom: null,
      rawTo: 300,
      current,
      expected: {
        ok: true,
        endpoints: { fromAttractionId: 100, toAttractionId: 300 },
      },
    },
    {
      name: 'the supplied id equals the current other endpoint',
      rawFrom: undefined,
      rawTo: 100,
      current,
      expected: { ok: false, error: SAME_ENDPOINT_ERROR },
    },
    {
      name: 'a supplied id is invalid on a partial update',
      rawFrom: 0,
      rawTo: undefined,
      current,
      expected: { ok: false, error: INVALID_ENDPOINT_IDS_ERROR },
    },
  ];

  it.each(tests)(
    'returns the expected result when $name',
    ({ rawFrom, rawTo, current: cur, expected }) => {
      expect(resolveEndpoints(rawFrom, rawTo, cur)).toEqual(expected);
    },
  );
});

describe('findTooLongConnectionField', () => {
  const tests: {
    name: string;
    body: { duration?: unknown };
    expected: string | null;
  }[] = [
    { name: 'duration is omitted', body: {}, expected: null },
    { name: 'duration is null', body: { duration: null }, expected: null },
    {
      name: 'duration is exactly 100 characters',
      body: { duration: 'x'.repeat(100) },
      expected: null,
    },
    {
      name: 'duration is longer than 100 characters',
      body: { duration: 'x'.repeat(101) },
      expected: 'duration must be at most 100 characters',
    },
  ];

  it.each(tests)('returns $expected when $name', ({ body, expected }) => {
    expect(findTooLongConnectionField(body)).toBe(expected);
  });
});

describe('isMissing', () => {
  const tests: { name: string; input: unknown; expected: boolean }[] = [
    { name: 'undefined', input: undefined, expected: true },
    { name: 'null', input: null, expected: true },
    { name: 'zero', input: 0, expected: false },
    { name: 'empty string', input: '', expected: false },
    { name: 'false', input: false, expected: false },
    { name: 'value', input: 'walk', expected: false },
  ];

  it.each(tests)('$name', ({ input, expected }) => {
    expect(isMissing(input)).toBe(expected);
  });
});
