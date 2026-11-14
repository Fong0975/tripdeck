import { describe, expect, it } from 'vitest';

import {
  INVALID_QUANTITY_ERROR,
  NAME_REQUIRED_ERROR,
  parseItemFields,
  parseSpecFields,
  parseTripItemPatch,
  requireName,
} from './validation';

const LONG_NAME = 'x'.repeat(256);
const NAME_TOO_LONG = 'name must be at most 255 characters';
const STORAGE_TOO_LONG = 'storage_location must be at most 255 characters';

describe('requireName', () => {
  const tests = [
    {
      label: 'a plain name',
      body: { name: 'Passport' },
      expected: { ok: true, value: 'Passport' },
    },
    {
      label: 'a name with surrounding spaces, unmodified',
      body: { name: '  Passport ' },
      expected: { ok: true, value: '  Passport ' },
    },
    {
      label: 'a name of exactly 255 characters',
      body: { name: 'x'.repeat(255) },
      expected: { ok: true, value: 'x'.repeat(255) },
    },
    {
      label: 'a name of 255 emoji (counted by code point)',
      body: { name: '🎒'.repeat(255) },
      expected: { ok: true, value: '🎒'.repeat(255) },
    },
    {
      label: 'a name longer than 255 characters',
      body: { name: LONG_NAME },
      expected: { ok: false, error: NAME_TOO_LONG },
    },
    {
      label: 'a missing name',
      body: {},
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'an empty name',
      body: { name: '' },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a whitespace-only name',
      body: { name: ' \t\n ' },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a non-string name',
      body: { name: 42 },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a null body',
      body: null,
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'an undefined body',
      body: undefined,
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a string body',
      body: 'Passport',
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
  ];

  it.each(tests)('handles $label', ({ body, expected }) => {
    expect(requireName(body)).toStrictEqual(expected);
  });
});

describe('parseItemFields', () => {
  const tests: Array<{ label: string; body: unknown; expected: unknown }> = [
    {
      label: 'keeps the item fields and drops unknown ones',
      body: {
        name: 'Charger',
        quantity: 2,
        notes: 'two',
        storage_location: 'bag',
        extra: true,
      },
      expected: {
        ok: true,
        value: {
          name: 'Charger',
          quantity: 2,
          notes: 'two',
          storage_location: 'bag',
        },
      },
    },
    {
      label: 'keeps omitted optional fields as undefined keys',
      body: { name: 'Charger' },
      expected: {
        ok: true,
        value: {
          name: 'Charger',
          quantity: undefined,
          notes: undefined,
          storage_location: undefined,
        },
      },
    },
    {
      label: 'accepts a null quantity and zero',
      body: { name: 'Charger', quantity: 0, storage_location: null },
      expected: {
        ok: true,
        value: {
          name: 'Charger',
          quantity: 0,
          notes: undefined,
          storage_location: null,
        },
      },
    },
    {
      label: 'rejects an invalid name',
      body: { name: ' ' },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'rejects a too long name',
      body: { name: LONG_NAME },
      expected: { ok: false, error: NAME_TOO_LONG },
    },
    {
      label: 'rejects a negative quantity',
      body: { name: 'Charger', quantity: -1 },
      expected: { ok: false, error: INVALID_QUANTITY_ERROR },
    },
    {
      label: 'rejects a fractional quantity',
      body: { name: 'Charger', quantity: 1.5 },
      expected: { ok: false, error: INVALID_QUANTITY_ERROR },
    },
    {
      label: 'rejects a string quantity',
      body: { name: 'Charger', quantity: '2' },
      expected: { ok: false, error: INVALID_QUANTITY_ERROR },
    },
    {
      label: 'rejects a quantity beyond the INT column range',
      body: { name: 'Charger', quantity: 2_147_483_648 },
      expected: { ok: false, error: INVALID_QUANTITY_ERROR },
    },
    {
      label: 'rejects a too long storage_location',
      body: { name: 'Charger', storage_location: LONG_NAME },
      expected: { ok: false, error: STORAGE_TOO_LONG },
    },
  ];

  it.each(tests)('$label', ({ body, expected }) => {
    expect(parseItemFields(body)).toStrictEqual(expected);
  });
});

describe('parseSpecFields', () => {
  const tests: Array<{ label: string; body: unknown; expected: unknown }> = [
    {
      label: 'keeps storage_location and drops unknown fields',
      body: { name: 'Type-C', storage_location: 'bag', extra: true },
      expected: {
        ok: true,
        value: { name: 'Type-C', storage_location: 'bag' },
      },
    },
    {
      label: 'keeps an omitted storage_location as an undefined key',
      body: { name: 'Type-C' },
      expected: {
        ok: true,
        value: { name: 'Type-C', storage_location: undefined },
      },
    },
    {
      label: 'rejects a missing name',
      body: {},
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'rejects a too long name',
      body: { name: LONG_NAME },
      expected: { ok: false, error: NAME_TOO_LONG },
    },
    {
      label: 'rejects a too long storage_location',
      body: { name: 'Type-C', storage_location: LONG_NAME },
      expected: { ok: false, error: STORAGE_TOO_LONG },
    },
  ];

  it.each(tests)('$label', ({ body, expected }) => {
    expect(parseSpecFields(body)).toStrictEqual(expected);
  });
});

describe('parseTripItemPatch', () => {
  const tests: Array<{ label: string; body: unknown; expected: unknown }> = [
    {
      label: 'returns an empty patch for an empty body',
      body: {},
      expected: { ok: true, value: {} },
    },
    {
      label: 'returns an empty patch for a non-object body',
      body: null,
      expected: { ok: true, value: {} },
    },
    {
      label: 'copies only the present known fields',
      body: { quantity: 3, extra: true },
      expected: { ok: true, value: { quantity: 3 } },
    },
    {
      label: 'keeps explicit nulls so the repository clears them',
      body: { quantity: null, notes: null, storage_location: null },
      expected: {
        ok: true,
        value: { quantity: null, notes: null, storage_location: null },
      },
    },
    {
      label: 'copies every field when all are present',
      body: {
        name: 'Charger',
        quantity: 1,
        notes: 'n',
        storage_location: 'bag',
      },
      expected: {
        ok: true,
        value: {
          name: 'Charger',
          quantity: 1,
          notes: 'n',
          storage_location: 'bag',
        },
      },
    },
    {
      label: 'rejects a blank name when present',
      body: { name: '   ' },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'rejects a null name when present',
      body: { name: null },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'rejects a too long name',
      body: { name: LONG_NAME },
      expected: { ok: false, error: NAME_TOO_LONG },
    },
    {
      label: 'rejects an invalid quantity',
      body: { quantity: 'many' },
      expected: { ok: false, error: INVALID_QUANTITY_ERROR },
    },
    {
      label: 'rejects a too long storage_location',
      body: { storage_location: LONG_NAME },
      expected: { ok: false, error: STORAGE_TOO_LONG },
    },
  ];

  it.each(tests)('$label', ({ body, expected }) => {
    expect(parseTripItemPatch(body)).toStrictEqual(expected);
  });
});
