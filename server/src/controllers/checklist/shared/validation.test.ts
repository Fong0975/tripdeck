import { describe, expect, it } from 'vitest';

import { pickItemFields, pickSpecFields, requireName } from './validation';

describe('requireName', () => {
  const tests = [
    { label: 'a plain name', body: { name: 'Passport' }, expected: 'Passport' },
    {
      label: 'a name with surrounding spaces, unmodified',
      body: { name: '  Passport ' },
      expected: '  Passport ',
    },
    { label: 'a missing name', body: {}, expected: null },
    { label: 'an empty name', body: { name: '' }, expected: null },
    {
      label: 'a whitespace-only name',
      body: { name: ' \t\n ' },
      expected: null,
    },
    { label: 'a non-string name', body: { name: 42 }, expected: null },
    { label: 'a null body', body: null, expected: null },
    { label: 'an undefined body', body: undefined, expected: null },
    { label: 'a string body', body: 'Passport', expected: null },
  ];

  it.each(tests)('returns $expected for $label', ({ body, expected }) => {
    expect(requireName(body)).toBe(expected);
  });
});

describe('pickItemFields', () => {
  const tests = [
    {
      label: 'keeps the item fields and drops unknown ones',
      body: {
        name: 'ignored',
        quantity: 2,
        notes: 'two',
        storage_location: 'bag',
        extra: true,
      },
      expected: {
        name: 'Charger',
        quantity: 2,
        notes: 'two',
        storage_location: 'bag',
      },
    },
    {
      label: 'keeps omitted optional fields as undefined keys',
      body: {},
      expected: {
        name: 'Charger',
        quantity: undefined,
        notes: undefined,
        storage_location: undefined,
      },
    },
  ];

  it.each(tests)('$label', ({ body, expected }) => {
    const fields = pickItemFields(body, 'Charger');

    expect(fields).toStrictEqual(expected);
    expect(Object.keys(fields)).toEqual([
      'name',
      'quantity',
      'notes',
      'storage_location',
    ]);
  });
});

describe('pickSpecFields', () => {
  const tests = [
    {
      label: 'keeps storage_location and drops unknown fields',
      body: { name: 'ignored', storage_location: 'bag', extra: true },
      expected: { name: 'Type-C', storage_location: 'bag' },
    },
    {
      label: 'keeps an omitted storage_location as an undefined key',
      body: {},
      expected: { name: 'Type-C', storage_location: undefined },
    },
  ];

  it.each(tests)('$label', ({ body, expected }) => {
    const fields = pickSpecFields(body, 'Type-C');

    expect(fields).toStrictEqual(expected);
    expect(Object.keys(fields)).toEqual(['name', 'storage_location']);
  });
});
