import { describe, expect, it } from 'vitest';

import {
  ORDERED_IDS_REQUIRED_ERROR,
  parseMoveBody,
  parseReorderBody,
  TARGET_CATEGORY_REQUIRED_ERROR,
} from './validation';

describe('parseReorderBody', () => {
  it.each([
    {
      name: 'valid ids',
      body: { orderedIds: [3, 1, 2] },
      expected: { ok: true, value: [3, 1, 2] },
    },
    {
      name: 'an empty list',
      body: { orderedIds: [] },
      expected: { ok: true, value: [] },
    },
    {
      name: 'a missing field',
      body: {},
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'a non-array',
      body: { orderedIds: '1,2' },
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'a zero id',
      body: { orderedIds: [0, 1] },
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'a numeric string id',
      body: { orderedIds: ['1'] },
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'a fractional id',
      body: { orderedIds: [1.5] },
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
    {
      name: 'a null body',
      body: null,
      expected: { ok: false, error: ORDERED_IDS_REQUIRED_ERROR },
    },
  ])('handles $name', ({ body, expected }) => {
    expect(parseReorderBody(body)).toEqual(expected);
  });
});

describe('parseMoveBody', () => {
  it.each([
    {
      name: 'a positive integer',
      body: { targetCategoryId: 4 },
      expected: { ok: true, value: 4 },
    },
    {
      name: 'a missing field',
      body: {},
      expected: { ok: false, error: TARGET_CATEGORY_REQUIRED_ERROR },
    },
    {
      name: 'zero',
      body: { targetCategoryId: 0 },
      expected: { ok: false, error: TARGET_CATEGORY_REQUIRED_ERROR },
    },
    {
      name: 'a numeric string',
      body: { targetCategoryId: '4' },
      expected: { ok: false, error: TARGET_CATEGORY_REQUIRED_ERROR },
    },
    {
      name: 'a null body',
      body: null,
      expected: { ok: false, error: TARGET_CATEGORY_REQUIRED_ERROR },
    },
  ])('handles $name', ({ body, expected }) => {
    expect(parseMoveBody(body)).toEqual(expected);
  });
});
