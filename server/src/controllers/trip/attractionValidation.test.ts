import { describe, expect, it } from 'vitest';

import {
  findAttractionBodyError,
  INVALID_WEBSITES_ERROR,
  isIntegerAtLeast,
  ORDERED_IDS_NOT_POSITIVE_ERROR,
  ORDERED_IDS_REQUIRED_ERROR,
  resolveOrderedIds,
} from './attractionValidation';

describe('isIntegerAtLeast', () => {
  it.each([
    { value: 0, min: 0, expected: true },
    { value: 5, min: 1, expected: true },
    { value: 0, min: 1, expected: false },
    { value: -1, min: 0, expected: false },
    { value: 1.5, min: 0, expected: false },
    { value: '1', min: 0, expected: false },
    { value: Number.MAX_SAFE_INTEGER + 1, min: 0, expected: false },
    { value: null, min: 0, expected: false },
  ])(
    'returns $expected for $value with min $min',
    ({ value, min, expected }) => {
      expect(isIntegerAtLeast(value, min)).toBe(expected);
    },
  );
});

describe('findAttractionBodyError', () => {
  it.each<{
    name: string;
    body: Record<string, unknown>;
    expected: string | null;
  }>([
    { name: 'an empty body', body: {}, expected: null },
    {
      name: 'fields at their maximum length',
      body: {
        name: 'n'.repeat(255),
        startTime: 't'.repeat(10),
        endTime: 't'.repeat(10),
        referenceWebsites: [{ url: 'u'.repeat(5000), title: 'w'.repeat(255) }],
      },
      expected: null,
    },
    {
      name: 'a 255-emoji name (counted by code point)',
      body: { name: '😀'.repeat(255) },
      expected: null,
    },
    {
      name: 'null referenceWebsites',
      body: { referenceWebsites: null },
      expected: null,
    },
    {
      name: 'a too-long name',
      body: { name: 'n'.repeat(256) },
      expected: 'name must be at most 255 characters',
    },
    {
      name: 'a too-long startTime',
      body: { startTime: '09:00:00:00' },
      expected: 'startTime must be at most 10 characters',
    },
    {
      name: 'a too-long endTime',
      body: { endTime: '10:00:00:00' },
      expected: 'endTime must be at most 10 characters',
    },
    {
      name: 'a too-long website title',
      body: {
        referenceWebsites: [{ url: 'https://a.com', title: 'w'.repeat(256) }],
      },
      expected: 'referenceWebsites[0].title must be at most 255 characters',
    },
    {
      name: 'referenceWebsites as an object',
      body: { referenceWebsites: { url: 'https://a.com', title: 'A' } },
      expected: INVALID_WEBSITES_ERROR,
    },
    {
      name: 'a website without a title',
      body: { referenceWebsites: [{ url: 'https://a.com' }] },
      expected: INVALID_WEBSITES_ERROR,
    },
    {
      name: 'a website with a numeric url',
      body: { referenceWebsites: [{ url: 1, title: 'A' }] },
      expected: INVALID_WEBSITES_ERROR,
    },
    {
      name: 'a website given as a plain string',
      body: { referenceWebsites: ['https://a.com'] },
      expected: INVALID_WEBSITES_ERROR,
    },
  ])('returns $expected for $name', ({ body, expected }) => {
    expect(findAttractionBodyError(body)).toBe(expected);
  });
});

describe('resolveOrderedIds', () => {
  it.each<{ name: string; raw: unknown; expected: unknown }>([
    {
      name: 'an array of positive integers',
      raw: [3, 1, 2],
      expected: { ok: true, orderedIds: [3, 1, 2] },
    },
    {
      name: 'an empty array',
      raw: [],
      expected: { ok: true, orderedIds: [] },
    },
    {
      name: 'undefined',
      raw: undefined,
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'a string',
      raw: '1,2',
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'an array with a zero',
      raw: [0, 1],
      expected: { ok: false, error: ORDERED_IDS_NOT_POSITIVE_ERROR },
    },
    {
      name: 'an array with a fraction',
      raw: [1, 2.5],
      expected: { ok: false, error: ORDERED_IDS_NOT_POSITIVE_ERROR },
    },
    {
      name: 'an array with a numeric string',
      raw: [1, '2'],
      expected: { ok: false, error: ORDERED_IDS_NOT_POSITIVE_ERROR },
    },
  ])('resolves $name', ({ raw, expected }) => {
    expect(resolveOrderedIds(raw)).toEqual(expected);
  });
});
